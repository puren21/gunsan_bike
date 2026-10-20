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
  panel.innerHTML='<header><h2>자전거도로 편집</h2><button id="bikeEditorClose" type="button" aria-label="저장하고 편집 종료" title="저장하고 편집 종료">×</button></header>'+ '<div class="bike-digitizing-tools" role="toolbar" aria-label="라인 편집 도구">'+
    [['select','↖','선택'],['draw','╱＋','그리기'],['vertex','◇','꼭지점'],['split','✂','자르기'],['multi','▱','다중 선택'],['merge','⋈','병합'],['delete','⌫','삭제'],['undo','↶','실행 취소'],['redo','↷','다시 실행']].map(([id,icon,label])=>'<button id="bikeTool-'+id+'" type="button" title="'+label+'" aria-label="'+label+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+toolIcons[id]+'</svg><span>'+label+'</span></button>').join('')+'</div>'+ '<div class="bike-actions" id="bikeToolActions" hidden><button id="bikeFinishBtn" type="button" hidden>그리기 완료</button><button id="bikeMergeFinishBtn" type="button" hidden>선택한 라인 병합</button><button id="bikeCancelToolBtn" type="button" hidden>도구 취소</button></div>'+ '<p id="bikeGeometryHelp" hidden></p><div id="bikeMergeSelection" hidden aria-label="병합할 라인"></div>'+ ''+ '<p id="bikeSelectionState">선택한 라인 없음</p>'+ '<form id="bikeRouteForm"><label>노선명<input id="bikeRouteName" required disabled maxlength="80" placeholder="노선명"></label>'+ '<fieldset id="bikeAttributes" disabled><legend>선택한 라인의 속성</legend>'+ '<label>자전거도로 구분<select id="bikeRouteCategory">'+categories.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label>'+ '<div class="bike-two"><label>기점<input id="bikeRouteStart" maxlength="200"></label><label>종점<input id="bikeRouteEnd" maxlength="200"></label></div>'+ '<label>도로폭 (m)<input id="bikeRouteWidth" type="number" min="0" step="0.1"></label>'+ '<label>비고<textarea id="bikeRouteNote" rows="2" maxlength="2000"></textarea></label>'+ '<label id="bikePartLabel" hidden>편집할 부분<select id="bikePartSelect"></select></label></fieldset>'+ '<div class="bike-actions bike-save-actions"><button class="bike-primary" id="bikeSaveBtn" type="submit">저장</button><button id="bikeStopBtn" type="button">저장 후 편집 끄기</button></div></form>'+ '<p id="bikeEditorMessage" role="status" aria-live="polite"></p>'+ '<section class="bike-file-menu" aria-label="파일 불러오기 및 내보내기"><h3>파일</h3><div class="bike-actions"><label class="bike-file-pick">불러오기<input id="bikePanelImport" type="file" accept=".geojson,.json,application/geo+json,application/json"></label><button id="bikeExportBtn" type="button">내보내기</button></div><p id="bikePanelImportStatus">GeoJSON 파일 선택 후 위의 저장을 누르면 현재 노선을 교체합니다.</p></section>';
  document.body.append(panel);$('bikeEditorBtn').disabled=true;
  const categorySelect=$('bikeRouteCategory');categorySelect.parentElement.hidden=true;
  const categoryChoices=document.createElement('div');categoryChoices.className='bike-category-choices';categoryChoices.setAttribute('role','radiogroup');categoryChoices.setAttribute('aria-label','자전거도로 구분');
  categoryChoices.innerHTML=categories.map((name,i)=>'<label><input type="radio" name="bikeCategoryChoice" value="'+esc(name)+'"><span class="bike-choice-mark" aria-hidden="true"></span><span>'+esc(name)+'</span></label>').join('');
  $('bikeAttributes').insertBefore(categoryChoices,categorySelect.parentElement);
  categoryChoices.addEventListener('change',e=>{categorySelect.value=e.target.value;attrDirty=true;updateUI();});
  let stagedImport=null;
  $('bikePanelImport').onchange=async function(){
    stagedImport=null;
    try { const file=this.files[0];if(!file)return;stagedImport=validateImport(JSON.parse(await file.text()));$('bikePanelImportStatus').textContent=file.name+' · '+stagedImport.features.length+'개 구간 · 저장 대기'; }
    catch(e){$('bikePanelImportStatus').textContent='불러오기 실패: '+e.message;this.value='';}
  };

  const dock=document.createElement('section');dock.id='bikeEditDock';dock.setAttribute('aria-label','이동 가능한 편집 도구');
  dock.innerHTML='<span class="bike-drag-handle" title="드래그하여 편집 도구 이동" aria-label="편집 도구 이동">⠿</span>';
  dock.append(panel.querySelector('.bike-digitizing-tools'));
  const editButton=$('bikeEditorBtn');editButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#8b6c27" stroke-width="1.8"><path d="m4 16 11-11 4 4-11 11-5 1Z"/><path d="m12 8 4 4M4 16l4 4"/></svg>';
  dock.querySelector('.bike-digitizing-tools').prepend(editButton);
  const listButton=document.createElement('button');listButton.id='bikeTableBtn';listButton.type='button';listButton.disabled=true;listButton.title='속성테이블 · 목록';listButton.setAttribute('aria-label','속성테이블 · 목록');listButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#526f84" stroke-width="1.5"><path d="M3 4h18v16H3zM3 9h18M3 14h18M9 4v16"/></svg>';
  const snapButton=document.createElement('button');snapButton.id='bikeSnapCheck';snapButton.type='button';snapButton.setAttribute('aria-label','스냅 켜기·끄기');snapButton.title='스냅 · 끝점·꼭지점·선분 (20px)';
  snapButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#8e4b51" stroke-width="2"><path d="M4 4v9a8 8 0 0 0 16 0V4h-5v9a3 3 0 0 1-6 0V4Z"/><path d="M4 8h5m6 0h5"/></svg>';
  dock.querySelector('.bike-digitizing-tools').append(snapButton,listButton);document.body.append(dock);
  const tablePanel=document.createElement('section');tablePanel.id='bikeTablePanel';tablePanel.hidden=true;tablePanel.setAttribute('aria-label','자전거도로 속성테이블');
  tablePanel.innerHTML='<header><h2>자전거도로 속성테이블</h2><button type="button" id="bikeTableClose" aria-label="속성테이블 닫기">×</button></header><div class="bike-table-actions"><input id="bikeTableSearch" placeholder="노선·속성 검색" aria-label="노선·속성 검색"><span id="bikeTableCount"></span><div class="bike-table-buttons"><button id="bikeTableDelete" type="button" disabled>선택 행 삭제</button><button id="bikeTableSave" type="button">저장</button><button id="bikeTableCancel" type="button" title="마지막 저장 이후의 미저장 변경 취소">취소</button></div></div><p>행 클릭: 선택 · Shift+클릭: 추가 선택 · 삭제·수정은 저장을 눌러 반영합니다. 취소는 마지막 저장 이후의 변경을 되돌립니다.</p><p id="bikeTableMessage" role="status"></p><div class="bike-table-scroll"><table><thead></thead><tbody></tbody></table></div>';
  document.body.append(tablePanel);
  const columns=[['노선명','number'],['구분','자전거도로'],['기점','기점'],['종점','종점'],['도로폭 (m)','도로폭'],['연장 (km)','연장'],['비고','비고']];
  function cellValue(f,key){const p=f.properties;return key==='number'?nameOf(f):key==='자전거도로'?api.normalizeCategory(p['구분']||p.GUBUN||p[key]):key==='기점'?(p['기점']||p['시점']||''):p[key]??'';}
  function tableColumns(){const known=new Set(['number','자전도로명','자전거도로명','NUM','구분','GUBUN','자전거도로','기점','시점','종점','도로폭','연장','비고','특이사항']);return columns.concat([...new Set(dataset.features.flatMap(f=>Object.keys(f.properties)))].filter(k=>!known.has(k)&&!k.startsWith('__')).map(k=>[k,k]));}
  function renderTable(){
    if(tablePanel.hidden)return;
    const cols=tableColumns(),query=$('bikeTableSearch').value.toLowerCase();
    tablePanel.querySelector('thead').innerHTML='<tr><th>#</th>'+cols.map(([label])=>'<th>'+esc(label)+'</th>').join('')+'</tr>';
    const rows=dataset.features.filter(f=>!query||cols.some(([,k])=>String(cellValue(f,k)).toLowerCase().includes(query)));
    tablePanel.querySelector('tbody').innerHTML=rows.map(f=>'<tr data-id="'+esc(idOf(f))+'" aria-selected="'+selected.has(idOf(f))+'"><td>'+ (dataset.features.indexOf(f)+1)+'</td>'+cols.map(([,key])=>'<td>'+(key==='자전거도로'?'<select data-key="'+key+'" aria-label="도로 구분">'+categories.map(c=>'<option'+(cellValue(f,key)===c?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select>':'<input data-key="'+esc(key)+'" aria-label="'+esc(key)+'" value="'+esc(String(cellValue(f,key)))+'"'+(key==='연장'?' readonly':'')+'>')+'</td>').join('')+'</tr>').join('');
    $('bikeTableCount').textContent=rows.length+' / '+dataset.features.length+'개 · 선택 '+selected.size+'개';
  }
  listButton.onclick=()=>{if(!ready)return;if(!commitAttributes())return;tablePanel.hidden=!tablePanel.hidden;listButton.setAttribute('aria-pressed',String(!tablePanel.hidden));renderTable();};
  $('bikeTableClose').onclick=()=>{tablePanel.hidden=true;listButton.setAttribute('aria-pressed','false');};
  $('bikeTableSearch').oninput=renderTable;
  $('bikeTableDelete').onclick=()=>{deleteSelected();renderTable();};
  $('bikeTableSave').onclick=()=>save();
  $('bikeTableCancel').onclick=()=>{
    if(busy||!savedDataset)return;
    dataset=copy(savedDataset);selected.clear();activeId=null;part=0;stagedImport=null;capture=[];attrDirty=dirty=false;undoStack=[];redoStack=[];
    $('bikePanelImport').value='';$('bikePanelImportStatus').textContent='GeoJSON 파일 선택 후 위의 저장을 누르면 현재 노선을 교체합니다.';
    setMode('select');fillRoutes();loadAttributes();paint();msg('미저장 변경을 취소하고 마지막 저장 상태로 되돌렸습니다.');
  };
  tablePanel.querySelector('tbody').addEventListener('click',e=>{const row=e.target.closest('tr[data-id]');if(!row)return;if(!editing)start();selectFeature(row.dataset.id,e.shiftKey||e.ctrlKey||e.metaKey);const f=active();if(f)api.showRoute(nameOf(f),copy(f));});
  tablePanel.querySelector('tbody').addEventListener('change',e=>{
    const row=e.target.closest('tr[data-id]'),key=e.target.dataset.key;if(!row||!key||key==='연장')return;
    const f=dataset.features.find(f=>idOf(f)===row.dataset.id);if(!f)return;
    const value=e.target.value;if(key==='number'&&!value.trim()){msg('노선명을 입력하세요.',true);renderTable();return;}
    if(key==='도로폭'&&value!==''&&(!Number.isFinite(Number(value))||Number(value)<0)){msg('도로폭은 0 이상의 숫자여야 합니다.',true);renderTable();return;}
    checkpoint();f.properties[key]=value;
    const aliases={number:['자전도로명'],자전거도로:['구분','GUBUN'],기점:['시점'],비고:['특이사항']};(aliases[key]||[]).forEach(k=>f.properties[k]=value);
    dirty=true;attrDirty=false;loadAttributes();paint();renderTable();msg('속성을 수정했습니다. 저장을 눌러 보관하세요.');
  });
  function movable(element,handle,key){
    const saved=(()=>{try{return JSON.parse(storage.getItem(key)||'null');}catch(e){return null;}})();
    if(saved){element.style.left=Math.max(0,Math.min(saved.left,innerWidth-100))+'px';element.style.top=Math.max(0,Math.min(saved.top,innerHeight-60))+'px';element.style.right='auto';element.style.bottom='auto';if(saved.width&&element!==dock)element.style.width=Math.min(saved.width,innerWidth-16)+'px';if(saved.height)element.style.height=Math.min(saved.height,innerHeight-16)+'px';if(element!==dock)element.style.maxHeight=Math.max(190,innerHeight-parseFloat(element.style.top)-8)+'px';}
    const persist=()=>{const r=element.getBoundingClientRect();if(r.width&&r.height)storage.setItem(key,JSON.stringify({left:r.left,top:r.top,width:r.width,height:element===dock?undefined:r.height}));};
    handle.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,select'))return;e.preventDefault();const r=element.getBoundingClientRect(),x=e.clientX,y=e.clientY;handle.setPointerCapture(e.pointerId);handle.style.touchAction='none';
      const move=v=>{element.style.left=Math.max(0,Math.min(innerWidth-80,r.left+v.clientX-x))+'px';element.style.top=Math.max(0,Math.min(innerHeight-45,r.top+v.clientY-y))+'px';element.style.right='auto';element.style.bottom='auto';if(element!==dock)element.style.maxHeight=Math.max(190,innerHeight-parseFloat(element.style.top)-8)+'px';};
      const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);persist();};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
    });
    if(element!==dock)new ResizeObserver(()=>{if(!element.hidden&&element.style.left)persist();}).observe(element);
  }
  function placeDock(){if(storage.getItem('bike-ui-dock-v2'))return;const r=$('normalBtn').getBoundingClientRect(),width=dock.getBoundingClientRect().width;const fits=r.left-width-10>=280;dock.style.left=(fits?r.left-width-10:Math.min(280,Math.max(8,innerWidth-width-8)))+'px';dock.style.top=(fits?r.top:r.bottom+10)+'px';}
  movable(dock,dock.querySelector('.bike-drag-handle'),'bike-ui-dock-v2');movable(panel,panel.querySelector('header'),'bike-ui-panel');movable(tablePanel,tablePanel.querySelector('header'),'bike-ui-table');
  const panelScroll=document.createElement('div');panelScroll.className='bike-editor-scroll';[...panel.children].filter(child=>child.tagName!=='HEADER').forEach(child=>panelScroll.append(child));panel.append(panelScroll);
  requestAnimationFrame(placeDock);window.addEventListener('resize',placeDock);
  function edgeResize(element){
    if(element.querySelector(':scope > .bike-resize-edge'))return;element.dataset.bikeEdgeResize='1';element.classList.add('bike-edge-resizable');if(getComputedStyle(element).position==='static')element.style.position='relative';
    for(const direction of ['n','e','s','w','ne','se','sw','nw']){
      const handle=document.createElement('div');handle.className='bike-resize-edge bike-resize-'+direction;handle.title='드래그하여 크기 조절';handle.setAttribute('aria-label',direction+' 가장자리 크기 조절');element.append(handle);
      handle.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=element.getBoundingClientRect(),x=e.clientX,y=e.clientY,ratio=r.width/(element.offsetWidth||r.width),minW=element===dock?120:element.id==='mapTools'?80:260,minH=element===dock||element.classList.contains('top-toolbar')||element.id==='mapTools'?42:180;
        handle.setPointerCapture(e.pointerId);
        const move=v=>{const dx=v.clientX-x,dy=v.clientY-y;let left=r.left,top=r.top,width=r.width,height=r.height;
          if(direction.includes('e'))width=Math.max(minW,Math.min(innerWidth-r.left-4,r.width+dx));
          if(direction.includes('s'))height=Math.max(minH,Math.min(innerHeight-r.top-4,r.height+dy));
          if(direction.includes('w')){left=Math.max(0,Math.min(r.right-minW,r.left+dx));width=r.right-left;}
          if(direction.includes('n')){top=Math.max(0,Math.min(r.bottom-minH,r.top+dy));height=r.bottom-top;}
          element.style.setProperty('position','fixed','important');element.style.setProperty('left',left/ratio+'px','important');element.style.setProperty('top',top/ratio+'px','important');element.style.setProperty('right','auto','important');element.style.setProperty('bottom','auto','important');
          element.style.setProperty('width',width/ratio+'px','important');element.style.setProperty('height',height/ratio+'px','important');element.style.setProperty('max-height',(innerHeight-top-4)/ratio+'px','important');element.style.setProperty('max-width',(innerWidth-left-4)/ratio+'px','important');
        };
        const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);const r=element.getBoundingClientRect();const key=element===dock?'bike-ui-dock-v2':element===panel?'bike-ui-panel':element===tablePanel?'bike-ui-table':null;if(key)storage.setItem(key,JSON.stringify({left:r.left,top:r.top,width:r.width,height:r.height}));};
        handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
      });
    }
  }
  function installResizeEdges(){document.querySelectorAll('#bikeEditorPanel,#bikeTablePanel,#bikeEditDock,.top-toolbar,#mapTools,#listPanel,#layerPanel,#stylePanel,#roadLayerUnifiedPanel,.road-popup').forEach(edgeResize);}
  installResizeEdges();new MutationObserver(installResizeEdges).observe(document.body,{childList:true,subtree:true});


  let editing=false,ready=false,busy=false,dirty=false,attrDirty=false,activeId=null,part=0,mode='select';
  let dataset={type:'FeatureCollection',features:[]},serverDataset=null,baseline='',savedDataset=null;
  let selected=new Set(),undoStack=[],redoStack=[],overlays=[],markers=[],capture=[],shift=false,lastSaved='';
  let captureCursor=null, cursorFrame=0, vertexDragFrame=0, vertexDragMarker=null;
  const rubberBand=new kakao.maps.Polyline({strokeColor:'#1676D2',strokeWeight:4,strokeOpacity:0.9,strokeStyle:'dash',zIndex:925});
  const vertexPreview=new kakao.maps.Polyline({strokeColor:'#07834C',strokeWeight:5,strokeOpacity:0.95,strokeStyle:'dash',zIndex:970});
  function updateRubberBand() {
    cursorFrame=0;
    if(!editing||!['draw','split'].includes(mode)||!captureCursor) {rubberBand.setMap(null);return;}
    // Preview snapping before the very first click as well as later vertices.
    const tip=snap(captureCursor);
    if(!capture.length){rubberBand.setMap(null);return;}
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
  document.getElementById('map').addEventListener('mouseleave',()=>{captureCursor=null;rubberBand.setMap(null);snapIndicator.setMap(null);});
  const msg=(text,error=false)=>{ $('bikeTableMessage').textContent=text;$('bikeTableMessage').classList.toggle('error',error);$('bikeEditorMessage').textContent=text;$('bikeEditorMessage').classList.toggle('error',error); };
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
  function fillRoutes() { renderTable(); }
  function loadAttributes() {
    const f=active(),p=f?f.properties:{};$('bikeAttributes').disabled=!f;$('bikeRouteName').disabled=!f;
    $('bikeRouteName').value=f?nameOf(f):'';$('bikeRouteCategory').value=api.normalizeCategory(p['구분']||p.GUBUN||p['자전거도로']);
    categoryChoices.querySelectorAll('input').forEach(input=>input.checked=input.value===$('bikeRouteCategory').value);
    $('bikeRouteStart').value=p['기점']||p['시점']||'';$('bikeRouteEnd').value=p['종점']||'';
    $('bikeRouteWidth').value=p['도로폭']||'';$('bikeRouteNote').value=p['비고']||p['특이사항']||'';
    const parts=f?G.paths(f):[];part=Math.max(0,Math.min(part,parts.length-1));
    $('bikePartSelect').replaceChildren(...parts.map((p,i)=>new Option('부분 '+(i+1),String(i))));$('bikePartSelect').value=String(part);$('bikePartLabel').hidden=parts.length<2;
    attrDirty=false;updateUI();
  }
  function updateUI() {
    $('bikeTableBtn').disabled=!ready||busy;
    $('bikeTableDelete').disabled=busy||!selected.size;$('bikeTableSave').disabled=busy||!ready;$('bikeTableCancel').disabled=busy||(!dirty&&!attrDirty&&!stagedImport&&!capture.length);
    tablePanel.querySelectorAll('tr[data-id]').forEach(row=>row.setAttribute('aria-selected',String(selected.has(row.dataset.id))));
    if(!tablePanel.hidden)$('bikeTableCount').textContent=tablePanel.querySelectorAll('tbody tr').length+' / '+dataset.features.length+'개 · 선택 '+selected.size+'개';
    $('bikeSelectionState').textContent=selected.size?selected.size+'개 라인 선택'+(active()?' · '+nameOf(active()):''):'선택한 라인 없음';
    for(const tool of ['select','draw','vertex','split','multi','merge'])$('bikeTool-'+tool).setAttribute('aria-pressed',String(mode===tool));
    $('bikeTool-vertex').disabled=!activeId;$('bikeTool-split').disabled=!selected.size;$('bikeTool-merge').disabled=busy;$('bikeTool-delete').disabled=!selected.size;
    $('bikeTool-undo').disabled=!undoStack.length&&!attrDirty;$('bikeTool-redo').disabled=!redoStack.length;
    for(const id of ['bikeSaveBtn','bikeStopBtn','bikeEditorClose','bikeEditorBtn'])$(id).disabled=busy;
    panel.setAttribute('aria-busy',String(busy));
    const text={merge:'지도에서 합칠 라인을 차례로 클릭하세요. 다시 클릭하면 선택이 해제됩니다. 2개 이상 선택한 뒤 파란 병합 버튼을 누르세요. 속성은 처음 선택한 라인을 사용합니다.',select:'라인을 클릭해 선택하세요. 마우스 드래그는 지도 화면 이동입니다. Shift+클릭: 추가 선택',multi:'라인을 차례로 클릭해 선택을 추가합니다. 다시 클릭하면 선택 해제됩니다. 드래그는 지도 화면 이동입니다.',draw:'시작점부터 모든 입력점이 기존 라인의 끝점·꼭지점·선분에 스냅됩니다 (20px). 초록 표식: 연결 위치 · 클릭: 점 고정 · 우클릭/완료: 라인 생성 · Esc: 취소',vertex:'꼭지점을 끌어 기존 라인 가까이 옮기세요. 초록 표식과 연결 안내가 보이면 놓으세요. 점선은 이동 후 라인 모양입니다. 선 위 클릭: 점 추가 · 꼭지점 우클릭: 삭제',split:'선택한 라인을 가로지르는 절단선을 클릭해 그린 뒤 우클릭 또는 자르기 실행을 누르세요.'};
    $('bikeGeometryHelp').hidden=mode==='select';$('bikeGeometryHelp').textContent=mode==='select'?'':text[mode]||'';$('bikeToolActions').hidden=!['draw','split','vertex','merge'].includes(mode);$('bikeFinishBtn').hidden=!['draw','split'].includes(mode);$('bikeCancelToolBtn').hidden=!['draw','split','vertex','merge'].includes(mode);$('bikeFinishBtn').textContent=mode==='split'?'자르기 실행':'그리기 완료';
    $('bikeMergeFinishBtn').hidden=mode!=='merge';$('bikeMergeFinishBtn').disabled=busy||selected.size<2;$('bikeMergeFinishBtn').textContent='선택한 '+selected.size+'개 라인 병합';
    const list=$('bikeMergeSelection');list.hidden=mode!=='merge';
    list.innerHTML=mode==='merge'?[...selected].map(id=>{const f=dataset.features.find(f=>idOf(f)===id);return f?'<button type="button" data-remove-line="'+esc(id)+'">'+esc(nameOf(f))+' · 라인 '+(dataset.features.indexOf(f)+1)+' ×</button>':'';}).join(''):'';
  }
  function removeOverlays() {cancelAnimationFrame(vertexDragFrame);vertexDragFrame=0;vertexDragMarker=null;rubberBand.setMap(null);vertexPreview.setMap(null);overlays.forEach(s=>s.setMap(null));overlays=[];markers.forEach(m=>m.setMap(null));markers=[];}
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
        function previewDrag() {
          if(vertexDragMarker!==marker||!dragAllowed)return;
          const next=snap(coord(marker.getPosition()),idOf(f),part,i),preview=copy(G.paths(f)[part]);preview[i]=next;
          // Kakao Marker emits dragstart/dragend, but no continuous drag event.
          // Read its native position every frame without moving the handle away from the pointer.
          vertexPreview.setPath(preview.map(point));vertexPreview.setMap(map);
          vertexDragFrame=requestAnimationFrame(previewDrag);
        }
        kakao.maps.event.addListener(marker,'dragstart',()=>{
          dragAllowed=commitAttributes();if(!dragAllowed)return;
          checkpoint();cancelAnimationFrame(vertexDragFrame);vertexDragMarker=marker;previewDrag();
        });
        kakao.maps.event.addListener(marker,'dragend',()=>{
          cancelAnimationFrame(vertexDragFrame);vertexDragFrame=0;vertexDragMarker=null;
          if(!dragAllowed){paint();return;}
          const path=G.paths(f)[part],next=snap(coord(marker.getPosition()),idOf(f),part,i);
          const proposal=copy(path);proposal[i]=next;
          if(G.valid(proposal)) {path[i]=next;marker.setPosition(point(next));dirty=true;}else {undoStack.pop();msg('길이가 없는 라인으로 바꿀 수 없습니다.',true);}
          snapIndicator.setMap(null);paint();updateUI();
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
  const snapElement=document.createElement('div');snapElement.className='bike-snap-target';snapElement.innerHTML='<span></span>';
  const snapLabel=snapElement.querySelector('span');
  const snapIndicator=new kakao.maps.CustomOverlay({content:snapElement,xAnchor:0.5,yAnchor:0.5,zIndex:1200});
  function snap(c,skipId=null,skipPart=-1,skipIndex=-1) {
    if(!$('bikeSnapCheck').checked){snapIndicator.setMap(null);return c;}
    const entries=dataset.features.flatMap(f=>G.paths(f).map((path,part)=>({id:idOf(f),part,path})));
    const result=G.snapToPaths(entries,c,project,20,{id:skipId,part:skipPart,index:skipIndex});
    if(result){snapLabel.textContent=(result.kind==='segment'?'선 위에 연결 · ':'끝점·꼭지점에 연결 · ')+(mode==='vertex'?'놓으세요':'클릭하세요');snapIndicator.setPosition(point(result.coordinate));snapIndicator.setMap(map);return result.coordinate;}
    snapIndicator.setMap(null);return c;
  }
  $('bikeSnapCheck').checked=storage.getItem('bike-snap-enabled')!=='false';
  function updateSnapButton(){snapButton.setAttribute('aria-pressed',String(snapButton.checked));snapButton.title='스냅 '+(snapButton.checked?'켜짐':'꺼짐')+' · 끝점·꼭지점·선분 (20px)';}
  updateSnapButton();
  $('bikeSnapCheck').onclick=()=>{
    snapButton.checked=!snapButton.checked;updateSnapButton();
    storage.setItem('bike-snap-enabled',String($('bikeSnapCheck').checked));
    snapIndicator.setMap(null);updateRubberBand();
  };
  function setMode(next) {
    mode=next;capture=[];captureCursor=null;snapIndicator.setMap(null);map.setCursor(mode==='merge'?'pointer':['draw','split','vertex'].includes(mode)?'crosshair':'');updateUI();paint();}
  function selectFeature(id,multi=false,partIndex=0) {
    if(!commitAttributes())return;
    if(multi){if(selected.has(id))selected.delete(id);else selected.add(id);}else selected=new Set([id]);
    activeId=selected.has(id)?id:[...selected][0]||null;part=partIndex;loadAttributes();paint();
  }
  function dispatchClick(c,id=null,partIndex=0) {
    if(!editing||busy)return;
    if(mode==='draw'||mode==='split') {capture.push(snap(c));captureCursor=c;paint();return;}
    if(mode==='vertex') {
      const f=active();if(!f)return;const path=G.paths(f)[part],near=G.nearest(path,snap(c,idOf(f),part),project);
      if(!near||near.distance>18){msg('선택한 라인 가까이를 클릭해 꼭지점을 추가하세요.',true);return;}
      if(near.t<0.00001||near.t>0.99999)return;
      if(!commitAttributes())return;checkpoint();path.splice(near.index,0,near.coordinate);dirty=true;paint();return;
    }
    if(!id) {
      let nearest=null;dataset.features.forEach(f=>G.paths(f).forEach((path,j)=>{const n=G.nearest(path,c,project);if(n&&n.distance<=14&&(!nearest||n.distance<nearest.distance))nearest={id:idOf(f),part:j,distance:n.distance};}));
      if(nearest){id=nearest.id;partIndex=nearest.part;}
    }
    if(id)selectFeature(id,mode==='multi'||mode==='merge'||shift,partIndex);
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
    if(busy||selected.size<2||!commitAttributes())return;
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
    if(stagedImport){const pending=stagedImport;stagedImport=null;const ok=await importData(pending);if(ok){$('bikePanelImport').value='';$('bikePanelImportStatus').textContent=pending.features.length+'개 구간 저장 완료 · 공용저장소와 현재 지도에 표시했습니다.';api.showAllRoutes();}else stagedImport=pending;return ok;}
    if(['draw','split'].includes(mode)&&capture.length&&!finishCapture())return false;
    if(!commitAttributes())return false;
    busy=true;updateUI();
    try {
      const next=prepareData();
      // Durable write first. A quota failure leaves edit mode and input intact.
      storage.setItem('bike-draft-v3',JSON.stringify({base:baseline,dataset:next,updated:new Date().toISOString()}));
      await window.GunsanCloud.save(copy(next));
      serverDataset=copy(next);baseline=fingerprint(serverDataset);storage.removeItem('bike-draft-v3');storage.removeItem('bike-draft-v2');
      await api.replace(copy(next));dataset=next;savedDataset=copy(next);dirty=attrDirty=false;undoStack=[];redoStack=[];
      lastSaved=new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});fillRoutes();loadAttributes();
      if(stop){editing=false;snapIndicator.setMap(null);panel.hidden=true;api.setEditing(false);removeOverlays();map.setCursor('');$('bikeEditorBtn').setAttribute('aria-pressed','false');$('bikeEditorBtn').setAttribute('aria-label','편집 모드 켜기');$('bikeEditorBtn').title='편집 모드 켜기';}
      else {setMode('select');paint();}
      msg('도형과 속성을 공용저장소에 저장했습니다. 다른 컴퓨터에서 새로고침하면 같은 노선이 표시됩니다.');return true;
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
    msg('편집할 라인을 지도에서 클릭하세요. 저장을 누르면 공용저장소에 반영됩니다. 편집 전 도로목록의 공용저장소에 로그인하세요.');
  }
  function validateImport(raw) {
    if(!raw||raw.type!=='FeatureCollection'||!Array.isArray(raw.features)||!raw.features.length)throw Error('노선이 포함된 GeoJSON FeatureCollection 파일을 선택하세요.');
    const data=copy(raw);
    data.features.forEach((f,i)=>{
      if(!f.geometry||!['LineString','MultiLineString'].includes(f.geometry.type))throw Error((i+1)+'번째 구간이 선형 자료가 아닙니다.');
      const paths=G.paths(f);
      if(!paths.length||!paths.every(path=>G.valid(path)&&path.every(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90)))throw Error((i+1)+'번째 구간의 좌표가 올바르지 않습니다. QGIS에서 EPSG:4326 경위도 GeoJSON으로 내보내세요.');
      f.properties=f.properties||{};
      if(!nameOf(f).trim())f.properties.number='노선명 미입력 '+String(i+1).padStart(4,'0');
      if(!f.properties.__bike_id)f.properties.__bike_id=uid();
    });return normalize(data);
  }
  async function importData(raw) {
    if(!ready||busy)throw Error('지도가 준비된 뒤 다시 시도하세요.');
    const next=validateImport(raw),previous=captureState(),wasEditing=editing;
    dataset=next;selected.clear();activeId=null;part=0;attrDirty=false;dirty=true;capture=[];captureCursor=null;setMode('select');
    if(await save(wasEditing)){fillRoutes();return true;}
    dataset=previous.dataset;selected=new Set(previous.ids);activeId=previous.activeId;part=previous.part;fillRoutes();loadAttributes();paint();return false;
  }
  window.bikeEditor={get active(){return editing;},start,validateImport,importData,publishData,
    exportData(){if(!ready){msg('지도가 준비된 뒤 다시 시도하세요.',true);return;}$('bikeExportBtn').click();},
    selectFromId(id){if(!editing)start();if(dataset.features.some(f=>idOf(f)===id))selectFeature(id);},
    selectFromRoute(name,index=0){if(!editing)start();const candidates=dataset.features.filter(f=>nameOf(f)===name);if(candidates.length)selectFeature(idOf(candidates[Math.min(index,candidates.length-1)]));}
  };
  $('bikeEditorBtn').onclick=()=>editing?save(true):start();$('bikeEditorClose').onclick=()=>save(true);$('bikeStopBtn').onclick=()=>save(true);
  $('bikeRouteForm').onsubmit=e=>{e.preventDefault();save();};[$('bikeRouteName'),$('bikeAttributes')].forEach(input=>input.addEventListener('input',()=>{attrDirty=true;updateUI();}));
  $('bikePartSelect').onchange=e=>{if(commitAttributes()){part=Number(e.target.value);setMode('vertex');}};
  ['select','draw','vertex','split','multi'].forEach(tool=>$('bikeTool-'+tool).onclick=()=>{if(!editing)start();if(commitAttributes())setMode(tool);});
  $('bikeTool-merge').title='라인 병합: 누른 뒤 합칠 라인을 선택';
  $('bikeTool-merge').onclick=()=>{if(!editing)start();if(!busy&&commitAttributes()){setMode('merge');msg('합칠 라인을 지도에서 클릭하고 병합 실행 버튼을 누르세요.');}};
  $('bikeMergeFinishBtn').onclick=mergeSelected;
  $('bikeMergeSelection').onclick=e=>{const button=e.target.closest('button[data-remove-line]');if(button)selectFeature(button.dataset.removeLine,true);};$('bikeTool-delete').onclick=deleteSelected;$('bikeTool-undo').onclick=undo;$('bikeTool-redo').onclick=redo;
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
  async function publishData() {
    const token=api.token();if(!token)throw Error('GitHub 저장 설정에서 먼저 인증정보를 저장하세요.');
    if(!await save())throw Error('브라우저 저장에 실패했습니다.');busy=true;updateUI();
    try{await api.publish(copy(dataset),token);serverDataset=copy(dataset);baseline=fingerprint(serverDataset);storage.removeItem('bike-draft-v3');storage.removeItem('bike-draft-v2');msg('GitHub에 반영했습니다. 배포 후 다른 기기에도 표시됩니다.');}
    finally{busy=false;updateUI();}
  }
  let layerEnabled=false;
  function syncOverlay(){map.removeOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE);map.removeOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE_HYBRID);if(layerEnabled)map.addOverlayMapTypeId(map.getMapTypeId()===kakao.maps.MapTypeId.ROADMAP?kakao.maps.MapTypeId.BICYCLE:kakao.maps.MapTypeId.BICYCLE_HYBRID);}
  $('bikeLayerBtn').onclick=()=>{layerEnabled=!layerEnabled;$('bikeLayerBtn').setAttribute('aria-pressed',String(layerEnabled));syncOverlay();};kakao.maps.event.addListener(map,'maptypeid_changed',()=>{syncOverlay();if(editing)paint();});
  api.ready.then(async()=>{
    let shared=null;try{shared=await window.GunsanCloud.load();}catch(e){msg('공용저장소 연결 실패: '+e.message+' 게시된 기본 노선을 표시합니다.',true);}
    if(shared)await api.replace(copy(shared));
    const raw=shared||api.read(),oldFingerprint=fingerprint(raw);serverDataset=normalize(raw);baseline=fingerprint(serverDataset);dataset=copy(serverDataset);let olderDraft=null;
    const text=storage.getItem('bike-draft-v3')||storage.getItem('bike-draft-v2');
    if(text){const draft=JSON.parse(text);if(draft.base===baseline||draft.base===oldFingerprint){dataset=normalize(draft.dataset);await api.replace(copy(dataset));}else {olderDraft=normalize(draft.dataset);msg('게시 데이터가 변경되어 이전 편집본을 자동 복원하지 않았습니다. 이전 브라우저 편집본 내보내기로 백업할 수 있습니다.',true);}}
    if(olderDraft){const backup=document.createElement('button');backup.type='button';backup.textContent='이전 브라우저 편집본 내보내기';backup.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(olderDraft,null,2)],{type:'application/geo+json'})),a=document.createElement('a');a.href=url;a.download='gunsan_previous_browser_draft.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};panel.querySelector('.bike-file-menu').append(backup);}
    savedDataset=copy(dataset);ready=true;fillRoutes();updateUI();
  }).catch(e=>{msg('편집 데이터를 준비하지 못했습니다: '+e.message,true);console.error(e);});
};
