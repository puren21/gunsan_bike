/* 군산시 자전거도로: 카카오 오버레이와 신규/기존 노선 편집 */
window.installBikeTools = function (api) {
  'use strict';
  const {map, storage, categories} = api;
  const esc = api.escape;
  const root = document.createElement('div');
  root.id = 'bikeControls';
  root.innerHTML = '<button id="bikeLayerBtn" type="button" aria-label="카카오 자전거도로 레이어" aria-pressed="false" title="카카오 자전거도로 레이어">🚲</button>' +
    '<button id="bikeEditorBtn" type="button" aria-label="신규 노선 입력 및 편집" aria-expanded="false">＋<span>노선 입력·편집</span></button>';
  document.body.append(root);
  const panel = document.createElement('section');
  panel.id = 'bikeEditorPanel'; panel.hidden = true;
  panel.setAttribute('aria-label', '노선 입력 및 편집');
  panel.innerHTML = '<header><h2>노선 입력·편집</h2><button type="button" id="bikeEditorClose" aria-label="노선 편집 닫기">×</button></header>' +
    '<label>작업할 노선<select id="bikeRouteSelect"><option value="">＋ 신규 노선</option></select></label>' +
    '<form id="bikeRouteForm"><label>노선명<input id="bikeRouteName" required maxlength="80" autocomplete="off" placeholder="예: 비응항로2R"></label>' +
    '<label>자전거도로 구분<select id="bikeRouteCategory">' + categories.map(x => '<option>' + esc(x) + '</option>').join('') + '</select></label>' +
    '<div class="bike-two"><label>기점<input id="bikeRouteStart" maxlength="200"></label><label>종점<input id="bikeRouteEnd" maxlength="200"></label></div>' +
    '<label>도로폭 (m)<input id="bikeRouteWidth" type="number" min="0" step="0.1"></label>' +
    '<label>비고<textarea id="bikeRouteNote" rows="2" maxlength="2000"></textarea></label>' +
    '<fieldset><legend>노선 선형</legend><label id="bikePartLabel" hidden>편집할 구간<select id="bikePartSelect"></select></label>' +
    '<div class="bike-actions"><button id="bikeDrawBtn" type="button">지도에서 그리기</button><button id="bikeVertexBtn" type="button">꼭지점 편집</button><button id="bikeDrawFinish" type="button" hidden>그리기 완료</button></div>' +
    '<div class="bike-actions"><button id="bikeUndoBtn" type="button">마지막 점 취소</button><button id="bikeClearBtn" type="button">선형 다시 그리기</button></div>' +
    '<p id="bikeGeometryHelp">지도에서 점을 두 개 이상 찍어 새 노선을 그리세요.</p></fieldset>' +
    '<button class="bike-primary" id="bikeSaveBtn" type="submit">초안 저장</button></form>' +
    '<p id="bikeEditorMessage" role="status" aria-live="polite"></p>' +
    '<details><summary>저장 및 사이트 반영</summary><p>초안은 이 브라우저에 저장됩니다. 다른 기기에도 보이게 하려면 GitHub에 반영하세요.</p>' +
    '<div class="bike-actions"><button id="bikeExportBtn" type="button">GeoJSON 다운로드</button><button id="bikeRestoreBtn" type="button">저장 초안 불러오기</button></div>' +
    '<button id="bikeDiscardDraftBtn" type="button">초안 삭제·게시된 노선으로 복원</button><label>GitHub 토큰<input id="bikeGithubToken" type="password" autocomplete="off" placeholder="저장소 Contents 쓰기 권한"></label>' +
    '<button id="bikePublishBtn" type="button">GitHub에 반영</button><p>현재 저장된 전체 노선을 roads.geojson에 반영합니다. 입력 중인 노선은 먼저 초안 저장하세요.</p></details>';
  document.body.append(panel);
  const $ = id => document.getElementById(id);
  const msg = (text, error = false) => { $('bikeEditorMessage').textContent = text; $('bikeEditorMessage').classList.toggle('error', error); };
  let layerEnabled = false;
  function syncOverlay() {
    map.removeOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE);
    map.removeOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE_HYBRID);
    if (layerEnabled) map.addOverlayMapTypeId(map.getMapTypeId() === kakao.maps.MapTypeId.ROADMAP ? kakao.maps.MapTypeId.BICYCLE : kakao.maps.MapTypeId.BICYCLE_HYBRID);
  }
  $('bikeLayerBtn').onclick = () => {
    layerEnabled = !layerEnabled;
    $('bikeLayerBtn').setAttribute('aria-pressed', String(layerEnabled));
    syncOverlay();
  };
  kakao.maps.event.addListener(map, 'maptypeid_changed', syncOverlay);
  const toolbar = document.querySelector('.top-toolbar');
  if (toolbar) {toolbar.append(root);toolbar.classList.add('has-bike-tools');}
  let dataReady = false, selected = '', features = [], paths = [], part = 0;
  let dirty = false, geometryDirty = false, drawing = false, vertices = false, markers = [];
  let baseline = '', restoring = false, serverDataset = null;
  const preview = new kakao.maps.Polyline({strokeColor:'#E60045', strokeWeight:5, strokeOpacity:0.95, zIndex:1000});
  const point = c => new kakao.maps.LatLng(c[1], c[0]);
  const coord = p => [Number(p.getLng().toFixed(8)), Number(p.getLat().toFixed(8))];
  const nameOf = f => String(f.properties.number || f.properties['자전도로명'] || f.properties['자전거도로명'] || f.properties.NUM || '');
  function fingerprint(data) { let h = 2166136261; for (const ch of JSON.stringify(data)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0).toString(16); }
  function names() { return [...new Set(api.read().features.map(nameOf))]; }
  function fillRoutes(value = selected) {
    const select = $('bikeRouteSelect'); select.replaceChildren(new Option('＋ 신규 노선', ''));
    names().sort((a,b) => a.localeCompare(b,'ko')).forEach(name => select.add(new Option(name,name)));
    select.value = value;
  }
  function hideMarkers() { markers.forEach(m => m.setMap(null)); markers = []; }
  function stopDrawing() { drawing = false; vertices = false; map.setCursor(''); $('bikeDrawFinish').hidden = true; hideMarkers(); }
  function paint() {
    hideMarkers();
    const path = paths[part] || [];
    preview.setPath(path.map(point)); preview.setMap(path.length ? map : null);
    if (vertices) path.forEach((c,i) => {
      const marker = new kakao.maps.Marker({position:point(c), map, draggable:true, zIndex:1100, title:'꼭지점 ' + (i+1) + ' (우클릭: 삭제)'});
      kakao.maps.event.addListener(marker,'dragend', () => { path[i] = coord(marker.getPosition()); dirty = geometryDirty = true; paint(); });
      kakao.maps.event.addListener(marker,'rightclick', () => {
        if(path.length <= 2) {msg('노선은 점이 두 개 이상 필요합니다.',true);return;}
        path.splice(i,1); dirty = geometryDirty = true; paint();
      });
      markers.push(marker);
    });
    $('bikeGeometryHelp').textContent = drawing ? '지도 클릭: 점 추가 · 완료 버튼: 그리기 종료 · 마지막 점 취소로 되돌리기' :
      vertices ? '꼭지점을 끌어 이동하거나 우클릭해 삭제하세요. 지도 클릭으로 가장 가까운 선분에 점을 추가합니다.' :
      paths.length ? (part+1) + '번 구간 · ' + path.length + '개 점. 속성만 저장하면 모든 구간 선형을 유지합니다.' : '지도에서 점을 두 개 이상 찍어 새 노선을 그리세요.';
  }
  function loadRoute(name) {
    stopDrawing(); selected = name; part = 0;
    features = api.read().features.filter(f => nameOf(f) === name);
    paths = features.flatMap(f => f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates]).map(p => p.map(c => [...c]));
    const props = features[0] ? features[0].properties : {};
    $('bikeRouteName').value = name;
    $('bikeRouteCategory').value = api.normalizeCategory(props['구분'] || props.GUBUN || props['자전거도로']);
    if (!name) $('bikeRouteCategory').value = categories[0];
    $('bikeRouteStart').value = props['기점'] || props['시점'] || '';
    $('bikeRouteEnd').value = props['종점'] || '';
    $('bikeRouteWidth').value = props['도로폭'] || '';
    $('bikeRouteNote').value = props['비고'] || props['특이사항'] || '';
    $('bikePartSelect').replaceChildren(...paths.map((p,i) => new Option('구간 ' + (i+1),String(i))));
    $('bikePartLabel').hidden = paths.length < 2;
    dirty = geometryDirty = false;
    if (name) api.showRoute(name);
    paint();
  }
  function mayDiscard() { return !dirty || confirm('저장하지 않은 입력을 버리고 이동할까요?'); }
  $('bikeRouteSelect').onchange = e => {
    if (!mayDiscard()) {e.target.value = selected;return;}
    loadRoute(e.target.value); msg('');
  };
  $('bikePartSelect').onchange = e => {stopDrawing();part = Number(e.target.value);paint();};
  $('bikeRouteForm').addEventListener('input', () => {dirty = true;});
  $('bikeDrawBtn').onclick = () => {
    api.stopOtherTools();
    if (!paths.length) {paths = [[]];part=0;}
    if (paths[part].length && !confirm('선택한 구간을 새로 그릴까요? 기존 선형은 초안 저장 전까지 유지됩니다.')) return;
    paths[part] = []; drawing = true; vertices = false; dirty = geometryDirty = true;
    $('bikeDrawFinish').hidden = false; map.setCursor('crosshair');paint();
  };
  $('bikeVertexBtn').onclick = () => {
    if (!paths.length || paths[part].length < 2) {msg('먼저 선형을 그리거나 기존 노선을 선택하세요.',true);return;}
    api.stopOtherTools(); drawing=false;vertices=!vertices; $('bikeDrawFinish').hidden=true; map.setCursor(vertices ? 'crosshair' : '');paint();
  };
  $('bikeDrawFinish').onclick = () => {stopDrawing();paint();};
  $('bikeUndoBtn').onclick = () => {if (paths[part] && paths[part].length) {paths[part].pop();dirty=geometryDirty=true;paint();}};
  $('bikeClearBtn').onclick = () => $('bikeDrawBtn').click();
  kakao.maps.event.addListener(map,'click', event => {
    if (!drawing && !vertices) return;
    const path = paths[part]; const c = coord(event.latLng);
    if (drawing) path.push(c);
    else {
      // Insert into the nearest segment, preserving the order of the polyline.
      let best=Infinity, insert=1;
      for(let i=1;i<path.length;i++) {
        const a=path[i-1], b=path[i], scale=Math.cos(c[1]*Math.PI/180), dx=(b[0]-a[0])*scale, dy=b[1]-a[1];
        const t=Math.max(0,Math.min(1,(((c[0]-a[0])*scale)*dx+(c[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
        const d=((c[0]-a[0])*scale-t*dx)**2+(c[1]-a[1]-t*dy)**2;
        if(d<best) {best=d;insert=i;}
      }
      path.splice(insert,0,c);
    }
    dirty=geometryDirty=true;paint();
  });
  function snapshot() {
    const dataset = api.read();
    storage.setItem('bike-draft-v2', JSON.stringify({base:baseline, dataset, updated:new Date().toISOString()}));
    return dataset;
  }
  $('bikeRouteForm').onsubmit = async event => {
    event.preventDefault(); if (!dataReady) return;
    const name = $('bikeRouteName').value.trim();
    if (!name) {msg('노선명을 입력하세요.',true);return;}
    const dataset = api.read();
    if (name !== selected && dataset.features.some(f => nameOf(f) === name)) {msg('같은 노선명이 있습니다. 다른 이름을 입력하세요.',true);return;}
    if (!paths.length || paths.some(p => p.length < 2 || !p.some(c => c[0] !== p[0][0] || c[1] !== p[0][1]))) {msg('각 구간에 서로 다른 점이 두 개 이상 필요합니다.',true);return;}
    const category = $('bikeRouteCategory').value;
    const updates = {number:name,'자전도로명':name,'구분':category,GUBUN:category,'자전거도로':category,
      '기점':$('bikeRouteStart').value,'시점':$('bikeRouteStart').value,'종점':$('bikeRouteEnd').value,
      '도로폭':$('bikeRouteWidth').value,'비고':$('bikeRouteNote').value,'특이사항':$('bikeRouteNote').value};
    const replaced = paths.map((path,i) => {
      const props = Object.assign({},features[i] ? features[i].properties : {},updates);
      delete props['개설여부'];delete props.Opened;delete props.Opend;
      return {type:'Feature',properties:props,geometry:{type:'LineString',coordinates:path}};
    });
    const next={type:'FeatureCollection',features:dataset.features.filter(f => !selected || nameOf(f)!==selected).concat(replaced)};
    const save = $('bikeSaveBtn');save.disabled=true;
    try {
      // Persist first: if browser storage is unavailable, do not silently lose changes.
      storage.setItem('bike-draft-v2',JSON.stringify({base:baseline,dataset:next,updated:new Date().toISOString()}));
      stopDrawing(); await api.replace(next); snapshot(); fillRoutes(name);loadRoute(name);
      msg('초안을 저장했습니다. 사이트 전체에 적용하려면 아래에서 GitHub에 반영하세요.');
    } catch(error) {msg('저장 실패: '+error.message,true);}
    finally {save.disabled=false;}
  };
  async function restoreDraft() {
    const saved=JSON.parse(storage.getItem('bike-draft-v2') || 'null');
    if (!saved) {msg('저장된 초안이 없습니다.');return;}
    if(saved.base!==baseline && !confirm('사이트의 노선이 초안 작성 이후 변경됐습니다. 저장된 초안으로 이 브라우저 화면을 바꿀까요?')) return;
    if (!mayDiscard()) return;
    restoring=true;
    try {await api.replace(saved.dataset);fillRoutes('');loadRoute('');msg('저장된 초안을 불러왔습니다.');}
    catch(e) {msg('초안 불러오기 실패: '+e.message,true);}
    finally {restoring=false;}
  }
  $('bikeRestoreBtn').onclick=restoreDraft;
  $('bikeDiscardDraftBtn').onclick=async () => {
    if(!confirm('이 브라우저의 초안과 입력 중인 내용을 삭제하고 게시된 노선으로 복원할까요?')) return;
    try {
      stopDrawing();dirty=false;restoring=true;
      storage.removeItem('bike-draft-v2');
      await api.replace(JSON.parse(JSON.stringify(serverDataset)));
      fillRoutes('');loadRoute('');msg('게시된 노선으로 복원했습니다.');
    } catch(e) {msg(e.message,true);} finally {restoring=false;}
  };
  $('bikeExportBtn').onclick=() => {
    const blob=new Blob([JSON.stringify(api.read(),null,2)],{type:'application/geo+json'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='gunsan_bike_roads.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('bikePublishBtn').onclick=async () => {
    if(dirty) {msg('입력 중인 내용을 먼저 초안 저장하세요.',true);return;}
    const token=$('bikeGithubToken').value.trim() || api.token();
    if(!token) {msg('GitHub 토큰을 입력하거나 도로목록의 GitHub 저장 설정에서 연결하세요.',true);return;}
    const button=$('bikePublishBtn');button.disabled=true;msg('GitHub에 반영 중입니다…');
    try {await api.publish(api.read(),token);serverDataset=JSON.parse(JSON.stringify(api.read()));baseline=fingerprint(serverDataset);storage.removeItem('bike-draft-v2');$('bikeGithubToken').value='';msg('GitHub에 반영했습니다. Pages 배포 후 다른 기기에서도 표시됩니다.');}
    catch(e) {msg('GitHub 반영 실패: '+e.message,true);}
    finally {button.disabled=false;}
  };
  $('bikeEditorBtn').onclick=() => {
    if (!dataReady) {msg('도로 데이터를 불러오는 중입니다.');return;}
    panel.hidden=!panel.hidden; $('bikeEditorBtn').setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden) {api.stopOtherTools();fillRoutes();if(!dirty)loadRoute(selected);}
    else {stopDrawing();preview.setMap(null);}
  };
  $('bikeEditorClose').onclick=() => {panel.hidden=true;stopDrawing();preview.setMap(null);$('bikeEditorBtn').setAttribute('aria-expanded','false');};
  window.addEventListener('beforeunload',event => {if(dirty) {event.preventDefault();event.returnValue='';}});
  window.addEventListener('bike-dataset-changed',() => {if(dataReady&&!restoring) {try {snapshot();fillRoutes();}catch(e){msg('초안 저장 실패: '+e.message,true);}}});
  api.ready.then(async () => {
    dataReady=true;serverDataset=JSON.parse(JSON.stringify(api.read()));baseline=fingerprint(serverDataset);fillRoutes();
    const saved=JSON.parse(storage.getItem('bike-draft-v2') || 'null');
    if(saved && saved.base===baseline) await restoreDraft();
    else if(saved) msg('이전 초안이 있습니다. 저장 및 사이트 반영에서 불러올 수 있습니다.');
  }).catch(error=>msg('도로를 불러오지 못했습니다: '+error.message,true));
};
