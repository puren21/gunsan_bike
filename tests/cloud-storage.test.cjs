const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../cloud-storage.js'),'utf8');
function harness(loggedIn,conflict=false,expired=false,refreshFailure=false){
 const values=new Map(),calls=[];
 if(loggedIn)values.set('gunsan_bike:cloud-session-v1',JSON.stringify({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_at:expired?1:Date.now()/1000+3600,user:{email:'editor@example.invalid'}}));
 const data={type:'FeatureCollection',features:[]};
 const context={window:{},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},fetch:async(url,options)=>{
  calls.push({url,options});
  if(url.includes('grant_type=password'))return {ok:true,json:async()=>({access_token:'registered-access',refresh_token:'registered-refresh',expires_in:3600,user:{email:'editor@example.invalid'}})};
  if(url.includes('grant_type=refresh_token')&&refreshFailure)throw Error('Network unavailable');
  if(url.includes('grant_type=refresh_token'))return {ok:true,json:async()=>({access_token:'renewed-access',refresh_token:'renewed-refresh',expires_at:Date.now()/1000+3600,user:{email:'editor@example.invalid'}})};
  const write=url.includes('/rpc/');return {ok:!(write&&conflict),status:write&&conflict?400:200,json:async()=>write&&conflict?{message:'다른 컴퓨터에서 먼저 저장했습니다.'}:[{data,revision:write?8:7}]};
 }};vm.runInNewContext(source,context);return {cloud:context.window.GunsanCloud,calls,data,values};
}
test('read loads shared version; save sends expected revision and advances only on success',async()=>{const h=harness(true);await h.cloud.load();await h.cloud.save(h.data);assert.equal(h.cloud.revision,8);const call=h.calls.find(c=>c.url.includes('/rpc/'));assert.equal(JSON.parse(call.options.body).p_revision,7);assert.equal(call.options.headers.Authorization,'Bearer fixture-access');});
test('anonymous viewer cannot send a save request',async()=>{const h=harness(false);await h.cloud.load();await assert.rejects(h.cloud.save(h.data),/로그인/);assert.equal(h.calls.filter(c=>c.url.includes('/rpc/')).length,0);});
test('conflicting save preserves revision and surfaces error',async()=>{const h=harness(true,true);await h.cloud.load();await assert.rejects(h.cloud.save(h.data),/다른 컴퓨터/);assert.equal(h.cloud.revision,7);});
test('failed initial load never permits a blind overwrite',async()=>{const h=harness(true);await assert.rejects(h.cloud.save(h.data),/공용 노선을 확인/);assert.equal(h.calls.length,0);});
test('expired session refreshes before saving',async()=>{const h=harness(true,false,true);await h.cloud.load();await h.cloud.save(h.data);assert.equal(h.calls.find(c=>c.url.includes('/rpc/')).options.headers.Authorization,'Bearer renewed-access');assert.match(h.values.get('gunsan_bike:cloud-session-v1'),/renewed-refresh/);});

test('temporary refresh failure retains login for retry',async()=>{const h=harness(true,false,true,true);await h.cloud.load();await assert.rejects(h.cloud.save(h.data),/로그인 정보는 유지/);assert.equal(h.cloud.loggedIn,true);assert.match(h.values.get('gunsan_bike:cloud-session-v1'),/fixture-refresh/);assert.equal(h.calls.filter(c=>c.url.includes('/rpc/')).length,0);});

test('device registration stores renewable session expiry without password',async()=>{const h=harness(false);await h.cloud.login('editor@example.invalid','fixture-password');const stored=JSON.parse(h.values.get('gunsan_bike:cloud-session-v1'));assert.equal(h.cloud.loggedIn,true);assert.ok(stored.expires_at>Date.now()/1000+3500);assert.equal(JSON.stringify(stored).includes('fixture-password'),false);await h.cloud.load();await h.cloud.save(h.data);assert.equal(h.calls.some(c=>c.url.includes('grant_type=refresh_token')),false);});
