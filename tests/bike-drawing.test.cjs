const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const G=require('../bike-geometry.js');
const source=fs.readFileSync(path.join(__dirname,'../bike-tools.js'),'utf8');
function load(name,context){const start=source.indexOf('  function '+name+'(');assert(start>=0);const end=source.indexOf('\n  }',start)+4;vm.runInNewContext(source.slice(start,end)+'\nthis.subject='+name,context);return context.subject;}
test('snap preview is visible before the first drawing click without a rubber band',()=>{
 const result=[126.5,35.9],ctx={cursorFrame:1,editing:true,mode:'draw',capture:[],captureCursor:[126.50001,35.9],rubberBand:{setMap(value){assert.equal(value,null)}},snap:c=>{assert.equal(c,ctx.captureCursor);ctx.preview=result;return result}};
 load('updateRubberBand',ctx)();assert.equal(ctx.preview,result);assert.equal(ctx.cursorFrame,0);
});
test('every drawing click snaps: first endpoint, interior segment and final endpoint',()=>{
 const original=[[126.5,35.9],[126.51,35.9]],entries=[{id:'existing',part:0,path:original}],ctx={editing:true,busy:false,mode:'draw',capture:[],captureCursor:null,paint(){},snap:c=>G.snapToPaths(entries,c,p=>p.map(x=>x*100000),12)?.coordinate||c};
 const click=load('dispatchClick',ctx);click([126.50004,35.90003]);click([126.505,35.90003]);click([126.50996,35.90003]);
 assert.deepEqual(ctx.capture,[original[0],[126.505,35.9],original[1]]);
 assert.deepEqual(original,[[126.5,35.9],[126.51,35.9]]);
});
for(const mode of ['draw','vertex'])for(const enabled of [false,true])test(mode+' preserves the user snap preference: '+enabled,()=>{
 const checkbox={checked:enabled},stored=new Map(),ctx={mode:'select',capture:[],captureCursor:null,$:()=>checkbox,storage:{setItem:(k,v)=>stored.set(k,v)},snapIndicator:{setMap(){}},map:{setCursor(){}},updateUI(){},paint(){}};
 load('setMode',ctx)(mode);assert.equal(checkbox.checked,enabled);assert.equal(stored.size,0);
});
