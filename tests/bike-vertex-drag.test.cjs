const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const G=require('../bike-geometry.js');
const source=fs.readFileSync(path.join(__dirname,'../bike-tools.js'),'utf8');
test('native marker movement updates snap preview using frames without a drag event',()=>{
 const f={properties:{__bike_id:'a'},geometry:{type:'LineString',coordinates:[[126,36],[126.01,36]]}},frames=new Map(),made=[],preview={setPath(p){this.path=p},setMap(m){this.map=m}};let frameId=0;
 class Marker{constructor(options){this.position=options.position;this.events={};made.push(this)}getPosition(){return this.position}setPosition(p){this.position=p}}
 const ctx={G,copy:G.copy,editing:true,dataset:{features:[f]},selected:new Set(['a']),idOf:f=>f.properties.__bike_id,active:()=>f,part:0,mode:'vertex',capture:[],line:()=>({events:{}}),followCursor(){},dispatchClick(){},finishCapture(){},removeOverlays(){},point:p=>p,coord:p=>p,markers:[],map:{},updateUI(){},updateRubberBand(){},commitAttributes:()=>true,checkpoint(){},vertexDragFrame:0,vertexDragMarker:null,vertexPreview:preview,snap:c=>c[0]>126.015?[126.02,36]:c,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id),snapIndicator:{setMap(){}},paint(){},msg(){},kakao:{maps:{Marker,MarkerImage:class{},Size:class{},event:{addListener:(obj,type,fn)=>obj.events[type]=fn}}}};
 const start=source.indexOf('  function paint()'),end=source.indexOf('\n  }',start)+4;vm.runInNewContext(source.slice(start,end)+'\npaint();',ctx);
 const marker=made[1];assert(!marker.events.drag);marker.events.dragstart();assert.equal(frames.size,1);
 marker.position=[126.01995,36.00003];const [id,tick]=frames.entries().next().value;frames.delete(id);tick();assert.deepEqual(preview.path[1],[126.02,36]);assert.equal(preview.map,ctx.map);assert.deepEqual(marker.position,[126.01995,36.00003]);
 marker.events.dragend();assert.deepEqual(f.geometry.coordinates[1],[126.02,36]);assert.equal(frames.size,0);assert.equal(ctx.vertexDragMarker,null);
});
