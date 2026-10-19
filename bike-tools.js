/* QGIS-style layer edit session. Public data changes only through explicit GitHub publication. */
window.installBikeTools = function(api) {
  'use strict';
  const G=window.BikeGeometry, {map,storage,categories}=api, copy=G.copy;
  const $=id=>document.getElementById(id), esc=api.escape;
  const root=document.createElement('div');root.id='bikeControls';
  root.innerHTML='<button id="bikeLayerBtn" type="button" title="카카오 자전거도로 레이어" aria-label="카카오 자전거도로 레이어" aria-pressed="false">🚲</button>'+ '<button id="bikeEditorBtn" type="button" title="편집 모드 켜기" aria-label="편집 모드 켜기" aria-pressed="false">✎<span>편집</span></button>';
  const toolbar=document.querySelector('.top-toolbar');(toolbar||document.body).append(root);if(toolbar)toolbar.classList.add('has-bike-tools');
  const panel=document.createElement('section');panel.id='bikeEditorPanel';panel.hidden=true;panel.setAttribute('aria-label','자전거도로 편집');
  const toolIcons={
    select:'<path d="m5 3 13 10-7 1-3 7Z" fill="#e8f2ff" stroke="#225a8a"/>',
    draw:'<path d="m3 18 6-9 6 5 6-10" fill="none" stroke="#39763a" stroke-width="2"/><path d="M16 18h6m-3-3v6" stroke="#39763a" stroke-width="2"/><circle cx="3" cy="18" r="2" fill="#ebcc48"/><circle cx="9" cy="9" r="2" fill="#ebcc48"/>',
    vertex:'<path d="m4 17 7-10 9 9" fill="none" stroke="#566f84" stroke-width="2"/><path d="M1 14h6v6H1zm7-10h6v6H8zm9 9h6v6h-6z" fill="#fff5bc" stroke="#95742a"/>',
    split:'<path d="m9 9 12 11M9 15 21 4" stroke="#566f84" stroke-width="2"/><circle cx="6" cy="7" r="4" fill="none" stroke="#566f84" stroke-width="1.7"/><circle cx="6" cy="17" r="4" fill="none" stroke="#566f84" stroke-width="1.7"/>',
    multi:'<path d="M3 4h18v16H3Z" fill="#e8f2ff" stroke="#225a8a" stroke-dasharray="3 2"/><path d="M6 15 10 8l5 8 4-7" fill="none" stroke="#52773c" stroke-width="2"/>',
    merge:'<path d="M3 5h5l5 7h8M3 19h5l5-7" fill="none" stroke="#39763a" stroke-width="2.4"/><path d="m17 8 4 4-4 4" fill="none" stroke="#39763a" stroke-width="2"/>',
    delete:'<path d="M5 6h14M9 3h6M7 6l1 15h8l1-15M10 9v9m4-9v9" fill="none" stroke="#a04b41" stroke-width="1.8"/>',
    undo:'<path d="M9 6 3 11l6 5M4 11h10c7 0 8 8 2 10" fill="none" stroke="#3673aa" stroke-width="2.2"/>',
    redo:'<path d="m15 6 6 5-6 5m5-5H10c-7 0-8 8-2 10" fill="none" stroke="#3673aa" stroke-width="2.2"/>'
  };
  panel.innerHTML='<header><h2>자전거도로 편집</h2><button id="bikeEditorClose" type="button" aria-label="저장하고 편집 종료" title="저장하고 편집 종료">×</button></header>'+ '<div id="bikeSessionState" role="status">편집 모드</div>'+ '<div class="bike-digitizing-tools" role="toolbar" aria-label="라인 편집 도구">'+
    [['select','↖','선택'],['draw','╱＋','그리기'],['vertex','◇','꼭지점'],['split','✂','자르기'],['multi','▱','다중 선택'],['merge','⋈','병합'],['delete','⌫','삭제'],['undo','↶','실행 취소'],['redo','↷','다시 실행']].map(([id,icon,label])=>'<button id="bikeTool-'+id+'" type="button" title="'+label+'" aria-label="'+label+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+toolIcons[id]+'</svg><span>'+label+'</span></button>').join('')+'</div>'+ '<div class="bike-actions"><button id="bikeFinishBtn" type="button" hidden>그리기 완료</button><button id="bikeCancelToolBtn" type="button" hidden>도구 취소</button></div>'+ '<p id="bikeGeometryHelp">지도에서 편집할 라인을 클릭하세요.</p>'+ '<label class="bike-check"><input id="bikeSnapCheck" type="checkbox" checked> 끝점 스냅 (12px)</label>'+ '<p id="bikeSelectionState">선택한 라인 없음</p>'+ '<label>라인 목록<select id="bikeRouteSelect"><option value="">지도에서 라인을 선택하세요</option></select></label>'+ '<form id="bikeRouteForm"><fieldset id="bikeAttributes" disabled><legend>선택한 라인의 속성</legend>'+ '<label>노선명<input id="bikeRouteName" required maxlength="80" placeholder="노선명"></label>'+ '<label>자전거도로 구분<select id="bikeRouteCategory">'+categories.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label>'+ '<div class="bike-two"><label>기점<input id="bikeRouteStart" maxlength="200"></label><label>종점<input id="bikeRouteEnd" maxlength="200"></label></div>'+ '<label>도로폭 (m)<input id="bikeRouteWidth" type="number" min="0" step="0.1"></label>'+ '<label>비고<textarea id="bikeRouteNote" rows="2" maxlength="2000"></textarea></label>'+ '<label id="bikePartLabel" hidden>편집할 부분<select id="bikePartSelect"></select></label></fieldset>'+ '<div class="bike-actions bike-save-actions"><button class="bike-primary" id="bikeSaveBtn" type="submit">저장</button><button id="bikeStopBtn" type="button">저장 후 편집 끄기</button></div></form>'+ '<p id="bikeEditorMessage" role="status" aria-live="polite"></p>'+ '<details><summary>저장 위치 및 사이트 반영</summary><p>저장과 편집 종료 시 도형·속성을 이 브라우저에 함께 저장합니다. 전체 사이트 반영은 아래 GitHub 버튼을 사용하세요.</p>'+ '<div class="bike-actions"><button id="bikeExportBtn" type="button">GeoJSON 다운로드</button><button id="bikeRestoreBtn" type="button">저장본 불러오기</button></div>'+ '<button id="bikeDiscardDraftBtn" type="button">초안 삭제·게시된 노선으로 복원</button>'+ '<label>GitHub 토큰<input id="bikeGithubToken" type="password" autocomplete="off" placeholder="저장소 Contents 쓰기 권한"></label>'+ '<button id="bikePublishBtn" type="button">저장 후 GitHub에 반영</button><p>게시된 전체 노선을 교체합니다. 병합은 첫 선택 라인의 속성을 사용하며 떨어진 구간은 연결선을 만들지 않고 여러 부분으로 유지합니다.</p></details>';
  document.body.append(panel);$('bikeEditorBtn').disabled=true;
  let editing=false,ready=false,busy=false,dirty=false,attrDirty=false,activeId=null,part=0,mode='select';
  let dataset={type:'FeatureCollection',features:[]},serverDataset=null,baseline='',savedDataset=null;
  let selected=new Set(),undoStack=[],redoStack=[],overlays=[],markers=[],capture=[],shift=false,lastSaved='';
  let captureCursor=null, cursorFrame=0;
  const rubberBand=new kakao.maps.Polyline({strokeColor:'#1676D2',strokeWeight:4,strokeOpacity:0.9,strokeStyle:'dash',zIndex:925});
  function updateRubberBand() {
    cursorFrame=0;
    if(!editing||!['draw','split'].includes(mode)||!capture.length||!captureCursor) {rubberBand.setMap(null);return;}
    const tip=mode==='draw'?snap(captureCursor):captureCursor;
    rubberBand.setOptions({strokeColor:mode==='split'?'#D72973':'#1676D2'});
    rubberBand.setPath([point(capture[capture.length-1]),point(tip)]);
    rubberBand.setMap(map);
  }
  function followCursor(event) {
    if(!editing||!['draw','split'].includes(mode))return;
    captureCursor=coord(event.latLng);
    if(!cursorFrame)cursorFrame=requestAnimationFrame(updateRubberBand);
  }
  kakao.maps.event.addListener(map,'mousemove',followCursor);
  kakao.maps.event.addListener(rubberBand,'mousemove',followCursor);
  kakao.maps.event.addListener(rubberBand,'click',event=>{kakao.maps.event.preventMap();dispatchClick(coord(event.latLng));});
  kakao.maps.event.addListener(rubberBand,'rightclick',()=>{kakao.maps.event.preventMap();finishCapture();});
  document.getElementById('map').addEventListener('mouseleave',()=>{captureCursor=null;rubberBand.setMap(null);});
  const msg=(text,error=false)=>{ $('bikeEditorMessage').textContent=text;$('bikeEditorMessage').classList.toggle('error',error); };
  const nameOf=f=>String(f.properties.number||f.properties['자전도로명']||f.properties['자전거도로명']||f.properties.NUM||'');
  const idOf=f=>f.properties.__bike_id;
  const uid=()=> 'bike-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
  const active=()=>dataset.features.find(f=>idOf(f)===activeId);
  const coord=p=>[Number(p.getLng().toFixed(8)),Number(p.getLat().toFixed(8))];
  const point=c=>new kakao.maps.LatLng(c[1],c[0]);
  const project=c=>{const p=map.getProjection().containerPointFromCoords(point(c));return [p.x,p.y];};
  function fingerprint(data) {let hash=2166136261;for(const c of JSON.stringify(data))hash=Math.imul(hash^c.charCodeAt(0),16777619);return(hash>>>0).toString(16);}
  function normalize(data) {
    const result=[],byId=new Map();
    data.features.forEach((raw,i)=>{
      const f=copy(raw);f.properties=f.properties||{};
      const id=f.properties.__bike_id||'bike-source-'+i;f.properties.__bike_id=id;
      if(byId.has(id)) {
        const existing=byId.get(id),parts=G.paths(existing).concat(G.paths(f));
        existing.geometry={type:'MultiLineString',coordinates:parts};
      } else {byId.set(id,f);result.push(f);}
    });
    return{type:'FeatureCollection',features:result};
  }
  function captureState() {return{dataset:copy(dataset),ids:[...selected],activeId,part};}
  function checkpoint() {undoStack.push(captureState());if(undoStack.length>80)undoStack.shift();redoStack=[];}
  function loadState(state) {dataset=state.dataset;selected=new Set(state.ids);activeId=state.activeId;part=state.part;dirty=true;attrDirty=false;setMode('select');fillRoutes();loadAttributes();paint();}
  function formValues() {
    const name=$('bikeRouteName').value.trim();if(!name)throw Error('노선명을 입력하세요.');
    const width=$('bikeRouteWidth').value;if(width!==''&&(!Number.isFinite(Number(width))||Number(width)<0))throw Error('도로폭은 0 이상의 숫자여야 합니다.');
    return{number:name,'자전도로명':name,'구분':$('bikeRouteCategory').value,GUBUN:$('bikeRouteCategory').value,'자전거도로':$('bikeRouteCategory').value,'기점':$('bikeRouteStart').value,'시점':$('bikeRouteStart').value,'종점':$('bikeRouteEnd').value,'도로폭':width,'비고':$('bikeRouteNote').value,'특이사항':$('bikeRouteNote').value};
  }
  function commitAttributes() {
    if(!attrDirty)return true;const f=active();if(!f)return true;
    let values;try{values=formValues();}catch(e){msg(e.message,true);return false;}
    checkpoint();Object.assign(f.properties,values);delete f.properties['개설여부'];attrDirty=false;dirty=true;return true;
  }
  function fillRoutes() {
    const select=$('bikeRouteSelect');select.replaceChildren(new Option('지도에서 라인을 선택하세요',''));
    const counts=new Map();dataset.features.forEach(f=>counts.set(nameOf(f),(counts.get(nameOf(f))||0)+1));
    const indexes=new Map();dataset.features.forEach(f=>{
      const name=nameOf(f),i=(indexes.get(name)||0)+1;indexes.set(name,i);
      select.add(new Option(name+(counts.get(name)>1?' · 라인 '+i:''),idOf(f)));
    });select.value=activeId||'';
  }
  function loadAttributes() {
    const f=active(),p=f?f.properties:{};$('bikeAttributes').disabled=!f;
    $('bikeRouteName').value=f?nameOf(f):'';$('bikeRouteCategory').value=api.normalizeCategory(p['구분']||p.GUBUN||p['자전거도로']);
    $('bikeRouteStart').value=p['기점']||p['시점']||'';$('bikeRouteEnd').value=p['종점']||'';
    $('bikeRouteWidth').value=p['도로폭']||'';$('bikeRouteNote').value=p['비고']||p['특이사항']||'';
    const parts=f?G.paths(f):[];part=Math.max(0,Math.min(part,parts.length-1));
    $('bikePartSelect').replaceChildren(...parts.map((p,i)=>new Option('부분 '+(i+1),String(i))));$('bikePartSelect').value=String(part);$('bikePartLabel').hidden=parts.length<2;
    $('bikeRouteSelect').value=activeId||'';attrDirty=false;updateUI();
  }
  function updateUI() {
    $('bikeSessionState').textContent=busy?'저장 중…':dirty||attrDirty?'편집 중 · 저장하지 않은 변경 있음':lastSaved?'저장됨 · 이 브라우저 ('+lastSaved+')':'편집 중 · 변경 없음';
    $('bikeSelectionState').textContent=selected.size?selected.size+'개 라인 선택'+(active()?' · '+nameOf(active()):''):'선택한 라인 없음';
    for(const tool of ['select','draw','vertex','split','multi'])$('bikeTool-'+tool).setAttribute('aria-pressed',String(mode===tool));
    $('bikeTool-vertex').disabled=!activeId;$('bikeTool-split').disabled=!selected.size;$('bikeTool-merge').disabled=selected.size<2;$('bikeTool-delete').disabled=!selected.size;
    $('bikeTool-undo').disabled=!undoStack.length&&!attrDirty;$('bikeTool-redo').disabled=!redoStack.length;
    for(const id of ['bikeSaveBtn','bikeStopBtn','bikePublishBtn','bikeEditorClose','bikeEditorBtn'])$(id).disabled=busy;
    const text={select:'라인을 클릭해 선택하세요. 마우스 드래그는 지도 화면 이동입니다. Shift+클릭: 추가 선택',multi:'라인을 차례로 클릭해 선택을 추가합니다. 다시 클릭하면 선택 해제됩니다. 드래그는 지도 화면 이동입니다.',draw:'첫 점 클릭 후 마우스를 움직이면 선이 따라옵니다. 클릭: 점 고정 · 우클릭/완료: 라인 생성 · Esc: 취소',vertex:'꼭지점 드래그: 이동 · 선 위 클릭: 점 추가 · 꼭지점 우클릭: 삭제 · 끝점 스냅 지원',split:'선택한 라인을 가로지르는 절단선을 클릭해 그린 뒤 우클릭 또는 자르기 실행을 누르세요.'};
    $('bikeGeometryHelp').textContent=text[mode]||text.select;$('bikeFinishBtn').hidden=!['draw','split'].includes(mode);$('bikeCancelToolBtn').hidden=!['draw','split','vertex'].includes(mode);$('bikeFinishBtn').textContent=mode==='split'?'자르기 실행':'그리기 완료';
  }
  function removeOverlays() {rubberBand.setMap(null);overlays.forEach(s=>s.setMap(null));overlays=[];markers.forEach(m=>m.setMap(null));markers=[];}
  function line(path,options={}) {
    const obj=new kakao.maps.Polyline({map,path:path.map(point),strokeColor:'#E60045',strokeWeight:5,zIndex:900,...options});overlays.push(obj);return obj;
  }
  function paint() {
    removeOverlays();if(!editing)return;
    dataset.features.forEach(f=>{
      const picked=selected.has(idOf(f)),color=picked?'#B63AC2':api.colorForCategory(api.normalizeCategory(f.properties['구분']||f.properties.GUBUN||f.properties['자전거도로']));
      G.paths(f).forEach((path,partIndex)=>{
        if(picked)line(path,{strokeColor:'#FFFFFF',strokeWeight:9,zIndex:902});
        line(path,{strokeColor:color,strokeWeight:picked?5:4,zIndex:picked?903:900});
        const hit=line(path,{strokeColor:'#000000',strokeOpacity:0.01,strokeWeight:14,zIndex:905});
        kakao.maps.event.addListener(hit,'mousemove',followCursor);
        kakao.maps.event.addListener(hit,'click',e=>{kakao.maps.event.preventMap();dispatchClick(coord(e.latLng),idOf(f),partIndex);});
        kakao.maps.event.addListener(hit,'rightclick',()=>{kakao.maps.event.preventMap();finishCapture();});
      });
    });
    if(capture.length)line(capture,{strokeColor:mode==='split'?'#D72973':'#1676D2',strokeWeight:4,strokeStyle:'dash',zIndex:920});
    const f=active();if(mode==='vertex'&&f) {
      (G.paths(f)[part]||[]).forEach((c,i)=>{
        const svg='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="white" stroke="#e55b00" stroke-width="2"/></svg>';
        const image=new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(14,14));
        const marker=new kakao.maps.Marker({map,position:point(c),image,draggable:true,zIndex:950,title:'꼭지점 '+(i+1)+' · 드래그 이동 / 우클릭 삭제'});
        let dragAllowed=false;
        kakao.maps.event.addListener(marker,'dragstart',()=>{dragAllowed=commitAttributes();if(dragAllowed)checkpoint();});
        kakao.maps.event.addListener(marker,'dragend',()=>{
          if(!dragAllowed){paint();return;}
          const path=G.paths(f)[part],next=snap(coord(marker.getPosition()),idOf(f),part,i);
          const proposal=copy(path);proposal[i]=next;
          if(G.valid(proposal)) {path[i]=next;dirty=true;}else {undoStack.pop();msg('길이가 없는 라인으로 바꿀 수 없습니다.',true);}
          paint();updateUI();
        });
        kakao.maps.event.addListener(marker,'rightclick',()=>{
          kakao.maps.event.preventMap();const path=G.paths(f)[part];
          if(path.length<=2) {msg('라인에는 서로 다른 점이 두 개 이상 필요합니다.',true);return;}
          const proposal=copy(path);proposal.splice(i,1);if(!G.valid(proposal)){msg('길이가 없는 라인으로 바꿀 수 없습니다.',true);return;}
          if(!commitAttributes())return;checkpoint();path.splice(i,1);dirty=true;paint();updateUI();
        });markers.push(marker);
      });
    }
    updateUI();updateRubberBand();
  }
  function snap(c,skipId=null,skipPart=-1,skipIndex=-1) {
    if(!$('bikeSnapCheck').checked)return c;const p=project(c);let best=12,result=c;
    dataset.features.forEach(f=>G.paths(f).forEach((path,j)=>[0,path.length-1].forEach(i=>{
      if(idOf(f)===skipId&&j===skipPart&&i===skipIndex)return;
      const q=project(path[i]),d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<best){best=d;result=[...path[i]];}
    })));return result;
  }
  function setMode(next) {mode=next;capture=[];captureCursor=null;map.setCursor(['draw','split','vertex'].includes(mode)?'crosshair':'');updateUI();paint();}
  function selectFeature(id,multi=false,partIndex=0) {
    if(!commitAttributes())return;
    if(multi){if(selected.has(id))selected.delete(id);else selected.add(id);}else selected=new Set([id]);
    activeId=selected.has(id)?id:[...selected][0]||null;part=partIndex;loadAttributes();paint();
  }
  function dispatchClick(c,id=null,partIndex=0) {
    if(!editing||busy)return;
    if(mode==='draw'||mode==='split') {capture.push(mode==='draw'?snap(c):c);captureCursor=c;paint();return;}
    if(mode==='vertex') {
      const f=active();if(!f)return;const path=G.paths(f)[part],near=G.nearest(path,c,project);
      if(!near||near.distance>18){msg('선택한 라인 가까이를 클릭해 꼭지점을 추가하세요.',true);return;}
      if(near.t<0.00001||near.t>0.99999)return;
      if(!commitAttributes())return;checkpoint();path.splice(near.index,0,near.coordinate);dirty=true;paint();return;
    }
    if(!id) {
      let nearest=null;dataset.features.forEach(f=>G.paths(f).forEach((path,j)=>{const n=G.nearest(path,c,project);if(n&&n.distance<=14&&(!nearest||n.distance<nearest.distance))nearest={id:idOf(f),part:j,distance:n.distance};}));
      if(nearest){id=nearest.id;partIndex=nearest.part;}
    }
    if(id)selectFeature(id,mode==='multi'||shift,partIndex);
    else if(mode==='select'&&!shift&&commitAttributes()){selected.clear();activeId=null;loadAttributes();paint();}
  }
  function finishCapture() {
    if(!editing||!['draw','split'].includes(mode))return true;
    if(capture.length<2){msg('서로 다른 점을 두 개 이상 찍으세요. Esc를 누르면 취소됩니다.',true);return false;}
    if(!commitAttributes())return false;
    if(mode==='draw') {
      const path=G.clean(capture);if(!G.valid(path)){msg('길이가 있는 라인을 그리세요.',true);return false;}
      checkpoint();const id=uid(),name='신규 노선 '+(dataset.features.length+1);
      dataset.features.push({type:'Feature',properties:{__bike_id:id,number:name,'자전도로명':name,'구분':categories[0],'자전거도로':categories[0]},geometry:{type:'LineString',coordinates:path}});
      selected=new Set([id]);activeId=id;part=0;dirty=true;setMode('vertex');fillRoutes();loadAttributes();paint();msg('라인을 그렸습니다. 속성을 입력하고 저장하세요.');return true;
    }
    const replacements=[];let cutCount=0;
    for(const f of dataset.features) {
      if(!selected.has(idOf(f))){replacements.push(f);continue;}
      const parts=G.paths(f),pieces=parts.flatMap(path=>G.split(path,capture));
      if(pieces.length===parts.length){replacements.push(f);continue;}
      cutCount++;pieces.forEach((path,i)=>{const p=copy(f.properties);p.__bike_id=i?uid():idOf(f);replacements.push({type:'Feature',properties:p,geometry:{type:'LineString',coordinates:path}});});
    }
    if(!cutCount){msg('선택한 라인을 가로지르지 않았습니다. 절단선을 다시 그리거나 Esc로 취소하세요.',true);return false;}
    checkpoint();const oldIds=new Set(selected);dataset.features=replacements;
    // Keep the original line selected; split pieces retain all original attributes and distinct IDs.
    selected=new Set([...oldIds].filter(id=>dataset.features.some(f=>idOf(f)===id)));activeId=[...selected][0]||null;part=0;dirty=true;setMode('select');fillRoutes();loadAttributes();paint();msg(cutCount+'개 라인을 잘랐습니다. 저장 전까지 실행 취소할 수 있습니다.');return true;
  }
  function mergeSelected() {
    if(selected.size<2||!commitAttributes())return;
    const chosen=[...selected].map(id=>dataset.features.find(f=>idOf(f)===id)).filter(Boolean);
    const parts=G.merge(chosen.flatMap(G.paths));
    if(!parts.every(G.valid)){msg('유효하지 않은 선형은 병합할 수 없습니다.',true);return;}
    checkpoint();const merged={type:'Feature',properties:copy(chosen[0].properties),geometry:parts.length===1?{type:'LineString',coordinates:parts[0]}:{type:'MultiLineString',coordinates:parts}};
    dataset.features=dataset.features.filter(f=>!selected.has(idOf(f))).concat(merged);activeId=idOf(merged);selected=new Set([activeId]);part=0;dirty=true;setMode('select');fillRoutes();loadAttributes();paint();msg('병합했습니다. 첫 선택 라인의 속성을 사용합니다.'+(parts.length>1?' 떨어진 구간은 '+parts.length+'개 부분으로 유지했습니다.':''));
  }
  function deleteSelected() {if(!selected.size||!commitAttributes())return;checkpoint();dataset.features=dataset.features.filter(f=>!selected.has(idOf(f)));selected.clear();activeId=null;dirty=true;setMode('select');fillRoutes();loadAttributes();paint();msg('선택 라인을 삭제했습니다. 실행 취소로 복원할 수 있습니다.');}
  function undo() {if(!commitAttributes()||!undoStack.length)return;redoStack.push(captureState());loadState(undoStack.pop());msg('실행을 취소했습니다.');}
  function redo() {if(attrDirty&&!commitAttributes())return;if(!redoStack.length)return;undoStack.push(captureState());loadState(redoStack.pop());msg('다시 실행했습니다.');}
  function prepareData() {
    const next=copy(dataset);next.features.forEach(f=>{
      if(!G.paths(f).every(G.valid))throw Error('길이가 없거나 올바르지 않은 라인이 있습니다.');
      if(!nameOf(f).trim())throw Error('노선명이 없는 라인이 있습니다.');
      delete f.properties['개설여부'];delete f.properties.Opened;delete f.properties.Opend;
      const km=G.paths(f).reduce((sum,path)=>sum+path.slice(1).reduce((s,p,i)=>s+G.distance(path[i],p),0),0)/1000;
      f.properties['연장']=String(Math.round(km*1000)/1000);
    });return next;
  }
  async function save(stop=false) {
    if(busy||!ready)return false;
    if(['draw','split'].includes(mode)&&capture.length&&!finishCapture())return false;
    if(!commitAttributes())return false;
    busy=true;updateUI();
    try {
      const next=prepareData();
      // Durable write first. A quota failure leaves edit mode and input intact.
      storage.setItem('bike-draft-v3',JSON.stringify({base:baseline,dataset:next,updated:new Date().toISOString()}));
      await api.replace(copy(next));dataset=next;savedDataset=copy(next);dirty=attrDirty=false;undoStack=[];redoStack=[];
      lastSaved=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});fillRoutes();loadAttributes();
      if(stop){editing=false;panel.hidden=true;api.setEditing(false);removeOverlays();map.setCursor('');$('bikeEditorBtn').setAttribute('aria-pressed','false');$('bikeEditorBtn').setAttribute('aria-label','편집 모드 켜기');$('bikeEditorBtn').title='편집 모드 켜기';}
      else {setMode('select');paint();}
      msg('도형과 속성을 함께 저장했습니다. 저장 위치: 이 브라우저.');return true;
    }catch(e){msg('저장하지 못했습니다: '+e.message,true);return false;}
    finally{busy=false;updateUI();}
  }
  function start() {
    if(!ready||busy)return;editing=true;api.stopOtherTools();api.setEditing(true);panel.hidden=false;
    $('bikeEditorBtn').setAttribute('aria-pressed','true');$('bikeEditorBtn').setAttribute('aria-label','저장 후 편집 끄기');$('bikeEditorBtn').title='저장 후 편집 끄기';setMode('select');fillRoutes();loadAttributes();paint();
    if(map.getLevel()>6&&dataset.features.length){
      const bounds=new kakao.maps.LatLngBounds();dataset.features.forEach(f=>G.paths(f).forEach(p=>p.forEach(c=>bounds.extend(point(c)))));
      map.setBounds(bounds,110,panel.getBoundingClientRect().width+35,90,Math.min(300,window.innerWidth*0.24));
    }
    msg('편집할 라인을 지도에서 클릭하세요.');
  }
  window.bikeEditor={get active(){return editing;},start,
    selectFromRoute(name,index=0){if(!editing)start();const candidates=dataset.features.filter(f=>nameOf(f)===name);if(candidates.length)selectFeature(idOf(candidates[Math.min(index,candidates.length-1)]));}
  };
  $('bikeEditorBtn').onclick=()=>editing?save(true):start();$('bikeEditorClose').onclick=()=>save(true);$('bikeStopBtn').onclick=()=>save(true);
  $('bikeRouteForm').onsubmit=e=>{e.preventDefault();save();};$('bikeAttributes').addEventListener('input',()=>{attrDirty=true;updateUI();});
  $('bikeRouteSelect').onchange=e=>{if(e.target.value){selectFeature(e.target.value);const f=active();if(f)api.showRoute(nameOf(f));}};$('bikePartSelect').onchange=e=>{if(commitAttributes()){part=Number(e.target.value);setMode('vertex');}};
  ['select','draw','vertex','split','multi'].forEach(tool=>$('bikeTool-'+tool).onclick=()=>{if(commitAttributes())setMode(tool);});
  $('bikeTool-merge').onclick=mergeSelected;$('bikeTool-delete').onclick=deleteSelected;$('bikeTool-undo').onclick=undo;$('bikeTool-redo').onclick=redo;
  $('bikeFinishBtn').onclick=finishCapture;$('bikeCancelToolBtn').onclick=()=>setMode('select');
  kakao.maps.event.addListener(map,'click',e=>dispatchClick(coord(e.latLng)));
  kakao.maps.event.addListener(map,'rightclick',()=>{if(editing&&['draw','split'].includes(mode))finishCapture();});
  window.addEventListener('keydown',e=>{
    shift=e.shiftKey||e.ctrlKey||e.metaKey;if(!editing||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||busy)return;
    if(e.key==='Escape'){e.preventDefault();setMode('select');}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}
    else if(e.key==='Delete'){e.preventDefault();deleteSelected();}
  });window.addEventListener('keyup',e=>{shift=e.shiftKey||e.ctrlKey||e.metaKey;});window.addEventListener('blur',()=>{shift=false;});
  window.addEventListener('beforeunload',e=>{if(dirty||attrDirty||capture.length){e.preventDefault();e.returnValue='';}});
  $('bikeExportBtn').onclick=()=>{
    if(!commitAttributes())return;try{const data=prepareData(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/geo+json'})),a=document.createElement('a');a.href=url;a.download='gunsan_bike_roads.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){msg(e.message,true);}
  };
  $('bikeRestoreBtn').onclick=async()=>{
    if((dirty||attrDirty)&&!confirm('저장하지 않은 편집을 버리고 마지막 저장본을 불러올까요?'))return;
    dataset=copy(savedDataset);selected.clear();activeId=null;dirty=attrDirty=false;undoStack=[];redoStack=[];setMode('select');fillRoutes();loadAttributes();paint();msg('마지막 저장본을 불러왔습니다.');
  };
  $('bikeDiscardDraftBtn').onclick=async()=>{
    if(!confirm('이 브라우저의 편집본을 삭제하고 게시된 데이터로 복원할까요?'))return;
    try{await api.replace(copy(serverDataset));storage.removeItem('bike-draft-v3');storage.removeItem('bike-draft-v2');dataset=copy(serverDataset);savedDataset=copy(dataset);selected.clear();activeId=null;dirty=attrDirty=false;undoStack=[];redoStack=[];setMode('select');fillRoutes();loadAttributes();msg('게시된 데이터로 복원했습니다.');}catch(e){msg(e.message,true);}
  };
  $('bikePublishBtn').onclick=async()=>{
    const token=$('bikeGithubToken').value.trim()||api.token();if(!token){msg('GitHub 토큰을 입력하세요. 편집 내용은 저장 버튼으로 이 브라우저에 저장할 수 있습니다.',true);return;}
    if(!await save())return;busy=true;updateUI();msg('GitHub에 반영 중입니다…');
    try{await api.publish(copy(dataset),token);serverDataset=copy(dataset);baseline=fingerprint(serverDataset);storage.removeItem('bike-draft-v3');storage.removeItem('bike-draft-v2');$('bikeGithubToken').value='';msg('GitHub에 반영했습니다. Pages 배포 후 다른 기기에도 표시됩니다.');}catch(e){msg('사이트 반영 실패: '+e.message+' 브라우저 저장본은 유지됩니다.',true);}finally{busy=false;updateUI();}
  };
  let layerEnabled=false;
  function syncOverlay(){map.removeOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE);map.removeOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE_HYBRID);if(layerEnabled)map.addOverlayMapTypeId(map.getMapTypeId()===kakao.maps.MapTypeId.ROADMAP?kakao.maps.MapTypeId.BICYCLE:kakao.maps.MapTypeId.BICYCLE_HYBRID);}
  $('bikeLayerBtn').onclick=()=>{layerEnabled=!layerEnabled;$('bikeLayerBtn').setAttribute('aria-pressed',String(layerEnabled));syncOverlay();};kakao.maps.event.addListener(map,'maptypeid_changed',()=>{syncOverlay();if(editing)paint();});
  api.ready.then(async()=>{
    const raw=api.read(),oldFingerprint=fingerprint(raw);serverDataset=normalize(raw);baseline=fingerprint(serverDataset);dataset=copy(serverDataset);let olderDraft=null;
    const text=storage.getItem('bike-draft-v3')||storage.getItem('bike-draft-v2');
    if(text){const draft=JSON.parse(text);if(draft.base===baseline||draft.base===oldFingerprint){dataset=normalize(draft.dataset);await api.replace(copy(dataset));}else {olderDraft=normalize(draft.dataset);msg('게시 데이터가 변경되어 이전 편집본을 자동 복원하지 않았습니다. 저장본 불러오기로 복원할 수 있습니다.',true);}}
    savedDataset=olderDraft||copy(dataset);ready=true;fillRoutes();updateUI();
  }).catch(e=>{msg('편집 데이터를 준비하지 못했습니다: '+e.message,true);console.error(e);});
};
