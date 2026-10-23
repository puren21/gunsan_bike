const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const G=require('../bike-geometry.js');
const source=fs.readFileSync(path.join(__dirname,'../bike-tools.js'),'utf8');
function load(name,context){const start=source.indexOf('  function '+name+'(');assert(start>=0);const end=source.indexOf('\n  }',start)+4;vm.runInNewContext(source.slice(start,end)+'\nthis.subject='+name,context);return context.subject;}
test('merge tool opens with no selection; confirmation requires two lines',()=>{
 const nodes=new Map(),element=id=>{if(!nodes.has(id))nodes.set(id,{setAttribute(k,v){this[k]=v}});return nodes.get(id)};
 const ctx={ready:true,tableEditing:false,updateTableEditingUI(){},tablePanel:{hidden:true,querySelectorAll:()=>[]},dirty:false,stagedImport:null,capture:[],optionWindows:null,idOf:f=>f.properties.__bike_id,$:element,panel:element('panel'),selected:new Set(),active:()=>null,mode:'merge',activeId:null,busy:false,undoStack:[],redoStack:[],attrDirty:false,dataset:{features:[]},esc:String};
 const update=load('updateUI',ctx);update();assert.equal(element('bikeTool-merge').disabled,false);assert.equal(element('bikeTool-merge')['aria-pressed'],'true');assert.equal(element('bikeMergeFinishBtn').disabled,true);assert.equal(element('bikeToolActions').hidden,false);assert.equal(element('bikeMergeFinishBtn').hidden,false);
 ctx.selected=new Set(['a','b']);update();assert.equal(element('bikeMergeFinishBtn').disabled,false);assert.equal(element('bikeMergeFinishBtn').textContent,'선택한 2개 라인 병합');
 ctx.busy=true;update();assert.equal(element('bikeMergeFinishBtn').disabled,true);assert.equal(element('panel')['aria-busy'],'true');
});
test('map clicks add and remove merge targets without modifier keys',()=>{
 const calls=[],ctx={editing:true,busy:false,mode:'merge',shift:false,selectFeature:(...args)=>calls.push(args)};
 load('dispatchClick',ctx)([126,36],'b',0);assert.deepEqual(calls,[['b',true,0]]);
});
for(const disconnected of [false,true])test('explicit merge preserves first attributes and '+(disconnected?'disconnected parts':'connected geometry'),()=>{
 const feature=(id,coords)=>({type:'Feature',properties:{__bike_id:id,number:id},geometry:{type:'LineString',coordinates:coords}}),a=feature('a',[[126,36],[126.01,36]]),b=feature('b',disconnected?[[127,36],[127.01,36]]:[[126.01,36],[126.02,36]]),before=G.copy([a,b]);let checkpoints=0;
 const ctx={busy:false,selected:new Set(['a','b']),commitAttributes:()=>true,dataset:{features:[a,b]},G,copy:G.copy,idOf:f=>f.properties.__bike_id,checkpoint:()=>checkpoints++,setMode(){},fillRoutes(){},loadAttributes(){},paint(){},msg(){}};
 load('mergeSelected',ctx)();assert.equal(checkpoints,1);assert.equal(ctx.dataset.features.length,1);assert.equal(ctx.dataset.features[0].properties.number,'a');assert.equal(ctx.dataset.features[0].geometry.type,disconnected?'MultiLineString':'LineString');assert.equal(ctx.selected.size,1);assert.deepEqual([a,b],before);
});
