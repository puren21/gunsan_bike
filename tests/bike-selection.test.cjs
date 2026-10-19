const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function load(name,context){const start=html.indexOf('      function '+name+'(');assert(start>=0);const end=html.indexOf('\n      }',start)+8;vm.runInNewContext(html.slice(start,end)+'\nthis.subject='+name,context);return context.subject;}
function road(color,length,properties={}){return{properties,styleKey:color,statusKey:'NORMAL',_visible:true,length,lines:[{setMap(){},getMap:()=>true}],hitLine:{setMap(){},getMap:()=>true}};}
test('only the selected split line changes color, opacity and stacking; switching restores its sibling',()=>{
 const a=road('#119944',1),b=road('#886622',2),group={layerId:'rural',roads:[a,b]};
 const ctx={groups:new Map([['route',group]]),geometryEditingGroupKey:null,selectedRoadSegmentIndex:0,selectedRoadPopupState:null,changedRoadDatasetVisible:true,hiddenRoadGroups:new Set(),map:{},setSelectedRoadSegment(){},syncRoadDerivedDisplayState(){},getRoadLayerStack:()=>[{width:3,opacity:60}],getRoadVisualLines:r=>r.lines,isRoadStatusHidden:()=>false,setMapOptionsIfChanged:(line,opts)=>Object.assign(line,opts),mapStrokePx:n=>n,getRoadLayerDisplayColor:key=>key,getRoadLayerStrokeStyle:()=> 'solid'};
 const highlight=load('setRoadGroupHighlight',ctx);highlight('route',true);
 assert.equal(a.lines[0].strokeColor,'#E60012');assert.equal(b.lines[0].strokeColor,b.styleKey);assert.equal(b.lines[0].strokeOpacity,.6);assert.equal(b.hitLine.zIndex,60);
 ctx.selectedRoadSegmentIndex=1;highlight('route',true);assert.equal(a.lines[0].strokeColor,a.styleKey);assert.equal(a.lines[0].strokeOpacity,.6);assert.equal(b.lines[0].strokeColor,'#E60012');highlight('route',false);assert.equal(b.lines[0].strokeColor,b.styleKey);
});
test('popup contains only clicked line attributes and geometry length even with the same route name',()=>{
 const a=road('a',1,{number:'공통 노선','구분':'A','도로폭':3,'기점':'A 시작','종점':'A 끝','비고':'A 비고'}),b=road('b',2,{number:'공통 노선','구분':'B','도로폭':9,'기점':'B 시작','종점':'B 끝','비고':'B 비고'});
 const ctx={roadEditSessionGroupKey:null,escapeHTML:String,roadPopupTitleTools:()=>'',row:(k,v,u='')=>`${k}:${v??'-'}${u}|`,bikeCategory:p=>p['구분'],getNumber:p=>p.number,getRoadStatusKey:()=> 'NORMAL',roadGeometryLengthKm:r=>r.length,formatRoadDataLengthKm:String,roadLineEditBlock:()=>'',routeMemoBlock:()=>'',roadPopupActions:()=>''};
 const popup=load('groupPopup',ctx)({key:'route',number:'공통 노선',layerId:'rural',propertiesList:[a.properties,b.properties],roads:[a,b]},b);
 for(const value of ['구분:B','도로폭:9 m','연장:2 km','기점:B 시작','종점:B 끝'])assert(popup.includes(value),value);
 assert(popup.includes('B 비고'));assert(!popup.includes('A 시작'));assert(!popup.includes('총연장'));assert(!popup.includes('선택구간'));
});
test('explicit clicked line wins over nearest-line lookup at shared split endpoints',()=>{
 const a=road('a',1),b=road('b',2),group={key:'route',roads:[a,b]};let selected;
 const ctx={groups:new Map([['route',group]]),findClosestRoadInGroup:()=>a,selectedRoadPopupState:null,setSelectedRoadSegment:(g,r)=>{selected=r;ctx.selectedRoadObject=r},selectRoadGroupHighlight(){},updateSelectedRouteBalloon(){},collapseRoadListForMobileSelection(){},addressInfo:{close(){}},addressMarker:{setMap(){}},closeRoadPopup(){},groupPopup:()=>'',createFixedRoadPopup(){},roadEditSessionGroupKey:'route',bindInlineRoadEditForm(){}};
 load('showInfo',ctx)({},'route',b);assert.equal(selected,b);
});
