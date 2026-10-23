/* Shared route storage. Only authenticated authorized editors can write. */
(()=>{
'use strict';
const URL='https://zdjuksmhtvhetzblczqq.supabase.co', KEY='sb_publishable_Hlk_1ZOd_WF_Ijn6VM258w_3w8HFYN4';

const sessionKey='gunsan_bike:cloud-session-v1';let session=null,revision=0,loaded=false,refreshing=null,loading=null,saving=false,snapshot=null;
const listeners=new Set();
try{session=JSON.parse(localStorage.getItem(sessionKey)||'null');}catch(e){}
function notify(){listeners.forEach(fn=>fn());}
function remember(next){session=next?{...next,expires_at:next.expires_at||Math.floor(Date.now()/1000)+Number(next.expires_in||3600)}:null;next=session;if(next)localStorage.setItem(sessionKey,JSON.stringify(next));else localStorage.removeItem(sessionKey);notify();}
async function request(path,{body,token,method='GET'}={}){
 const headers={apikey:KEY,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(URL+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 let data;try{data=await response.json();}catch(e){data=null;}
 if(!response.ok){const error=new Error(data?.message||data?.msg||data?.error_description||'공용저장소에 연결하지 못했습니다.');error.status=response.status;throw error;}return data;
}
async function token(){
 if(!session)throw Error('공용저장소에 로그인한 뒤 저장하세요. 현재 작업은 이 브라우저에 백업했습니다.');
 if(session.expires_at*1000>Date.now()+60000)return session.access_token;
 if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}}).then(remember).catch(e=>{if(e.status===400||e.status===401){remember(null);throw Error('로그인이 만료되었습니다. 다시 로그인하세요.');}throw Error('로그인 연결을 갱신하지 못했습니다. 잠시 후 저장을 다시 누르세요. 로그인 정보는 유지됩니다.');}).finally(()=>refreshing=null);
 await refreshing;return session.access_token;
}
function normalizeWidths(data){
 if(!data||!Array.isArray(data.features))return data;
 return {...data,features:data.features.map(f=>{const p={...f.properties};p['도로폭원']=p['도로폭원']??p['도로폭']??'';p['보도폭원']=p['보도폭원']??'';p['유효폭원']=p['유효폭원']??'';delete p['도로폭'];delete p['차선'];delete p['차선현황'];return {...f,properties:p};})};
}
// Cache is disposable and schema-scoped; drafts and sessions use separate keys.
const cacheKey='gunsan_bike:dataset-cache-v1';
const clone=data=>JSON.parse(JSON.stringify(data));
const validData=data=>data?.type==='FeatureCollection'&&Array.isArray(data.features);
const validRevision=value=>(typeof value==='number'||(typeof value==='string'&&/^\d+$/.test(value)))&&Number.isSafeInteger(Number(value))&&Number(value)>=0;
function readCache(){try{const c=JSON.parse(localStorage.getItem(cacheKey));return c?.schema===1&&validRevision(c.revision)&&validData(c.data)?c:null;}catch(e){return null;}}
function writeCache(row){try{localStorage.setItem(cacheKey,JSON.stringify({schema:1,revision:Number(row.revision),data:row.data}));}catch(e){/* Quota/private mode must not prevent loading. */}}
async function loadSnapshot(){
 // Always validate the small revision response against the server before using cache.
 const meta=await request('/rest/v1/gunsan_bike_datasets?id=eq.gunsan_bike&select=revision,updated_at');
 if(!meta?.[0]||!validRevision(meta[0].revision))throw Error('공용 노선 버전을 확인하지 못했습니다. 저장을 중지합니다.');
 const cached=readCache();let row;
 if(cached&&Number(cached.revision)===Number(meta[0].revision))row=cached;
 else {
  const rows=await request('/rest/v1/gunsan_bike_datasets?id=eq.gunsan_bike&select=data,revision,updated_at');row=rows?.[0];
  if(!row||!validRevision(row.revision)||!validData(row.data)||Number(row.revision)<Number(meta[0].revision))throw Error('공용 노선 형식 또는 버전이 올바르지 않습니다.');
  // Use the revision accompanying data, never the earlier metadata (race-safe).
  writeCache(row);
 }
 snapshot=normalizeWidths(clone(row.data));revision=Number(row.revision);loaded=true;notify();return clone(snapshot);
}
const cloud=window.GunsanCloud={
 normalizeData:normalizeWidths,
 get revision(){return revision;},get loggedIn(){return !!session;},get email(){return session?.user?.email||'';},
 subscribe(fn){listeners.add(fn);},
 // Initialization is single-flight. Never advance an active editor's baseline by reloading.
 async load(){if(loaded)return clone(snapshot);if(!loading)loading=loadSnapshot().finally(()=>loading=null);return clone(await loading);},
 async save(data){if(!loaded)throw Error('공용 노선을 확인하지 못했습니다. 작업을 내보낸 뒤 새로고침하세요.');
 if(saving)throw Error('저장이 진행 중입니다. 잠시 기다리세요.');
 saving=true;try{const access=await token(),expected=revision;
 const rows=await request('/rest/v1/rpc/save_gunsan_bike',{method:'POST',token:access,body:{p_data:normalizeWidths(data),p_revision:expected}});
 if(!rows?.[0]||!validRevision(rows[0].revision)||Number(rows[0].revision)<=expected)throw Error('공용저장소의 저장 확인을 받지 못했습니다. 작업을 내보낸 뒤 새로고침하세요.');
 revision=Number(rows[0].revision);snapshot=normalizeWidths(clone(data));
 // Read the authoritative server data on the next visit, including server transformations.
 try{localStorage.removeItem(cacheKey);}catch(e){}notify();return rows[0];
 }finally{saving=false;}
 },
 async login(email,password){const next=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});remember(next);},
 async logout(){const current=session;remember(null);if(current)try{await request('/auth/v1/logout',{method:'POST',token:current.access_token});}catch(e){}},
 install(container){
  const section=document.createElement('section');section.className='bike-cloud-settings';
  section.innerHTML='<details class="bike-login-details"><summary>로그인 설정 <span class="bike-login-badge"></span></summary><p class="bike-cloud-status" role="status"></p><form><label>이메일<input name="email" type="email" autocomplete="username" required placeholder="기존 편집 계정 이메일"></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">로그인 · 이 기기 등록</button></form><button type="button" class="bike-cloud-logout">로그아웃 · 등록 해제</button><p>한 번 로그인하면 이 기기에서 인증을 유지합니다. 저장 버튼을 누르면 공용저장소에 반영됩니다.</p></details>';

  const status=section.querySelector('.bike-cloud-status'),form=section.querySelector('form'),logout=section.querySelector('.bike-cloud-logout');
  const update=()=>{section.querySelector('.bike-login-badge').textContent=session?'연결됨':'미연결';status.textContent=(session?'등록된 기기 · '+cloud.email:'보기 가능 · 저장하려면 이 기기 등록')+(loaded?' · 버전 '+revision:'');form.hidden=!!session;logout.hidden=!session;};
  cloud.subscribe(update);update();container.append(section);
  form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='기기 등록 중…';try{await cloud.login(form.elements.email.value.trim(),form.elements.password.value);form.elements.password.value='';section.querySelector('details').open=false;}catch(e){status.textContent='기기 등록 실패: '+e.message;}finally{button.disabled=false;}};
  logout.onclick=()=>cloud.logout();
 }
};
})();
