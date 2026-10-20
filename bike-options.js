/* Collapsible help shared by editor menus. */
window.addBikeMenuHelp=function(panel,nodes){
 const header=panel.querySelector('header'),button=document.createElement('button'),box=document.createElement('div');
 button.type='button';button.className='bike-help-toggle';button.textContent='?';button.title='도움말';button.setAttribute('aria-label','도움말');button.setAttribute('aria-expanded','false');
 box.id=panel.id+'-help';box.className='bike-menu-help';box.hidden=true;button.setAttribute('aria-controls',box.id);nodes.forEach(node=>box.append(node));
 header.insertBefore(button,header.querySelector('button'));header.after(box);
 button.onclick=()=>{box.hidden=!box.hidden;button.setAttribute('aria-expanded',String(!box.hidden));};
 return box;
};
/* Independent, pinnable option windows for digitizing tools. */
window.installBikeOptionWindows=function(api){
 const names={connect:'라인 연결'},windows=new Map();let help={};
 function persist(tool,el){api.storage.setItem('bike-option-state-'+tool,JSON.stringify({pinned:el.dataset.pinned==='true',open:!el.hidden}));}
 for(const [index,[tool,title]] of Object.entries(names).entries()){
  const el=document.createElement('section');el.className='bike-tool-options';el.id='bikeOptions-'+tool;el.hidden=true;el.dataset.geometryKey='bike-option-geometry-'+tool;el.dataset.pinned='false';el.setAttribute('aria-label',title+' 옵션');
  el.style.left=(290+index*14)+'px';el.style.top=(110+index*24)+'px';
  el.innerHTML='<header><h2>'+title+' 옵션</h2><button type="button" data-pin aria-pressed="false" title="위치 고정">고정</button><button type="button" data-off>끄기 ×</button></header><div class="bike-options-scroll"><p data-state></p><p data-help></p><div data-parts></div><div data-selection></div><div class="bike-options-actions"><button type="button" data-activate>이 도구 활성화</button><button type="button" data-execute></button></div></div>';
  let saved=null;try{saved=JSON.parse(api.storage.getItem('bike-option-state-'+tool)||'null');}catch(e){}
  if(saved?.pinned){el.dataset.pinned='true';el.querySelector('[data-pin]').setAttribute('aria-pressed','true');el.hidden=!saved.open;}
  window.addBikeMenuHelp(el,[el.querySelector('[data-state]'),el.querySelector('[data-help]')]);
  document.body.append(el);windows.set(tool,el);api.movable(el,el.querySelector('header'),el.dataset.geometryKey);api.resize(el);
  el.addEventListener('pointerdown',()=>api.focus(el));
  el.querySelector('[data-pin]').onclick=()=>{const pinned=el.dataset.pinned!=='true';el.dataset.pinned=String(pinned);el.querySelector('[data-pin]').setAttribute('aria-pressed',String(pinned));persist(tool,el);};
  el.querySelector('[data-off]').onclick=()=>{if(api.state().mode===tool)api.deactivate();el.hidden=true;persist(tool,el);};
  el.querySelector('[data-activate]').onclick=()=>api.activate(tool);
  el.querySelector('[data-execute]').onclick=()=>{if(api.state().mode!==tool)return;if(tool==='draw'||tool==='split')api.finish();else if(tool==='merge')api.merge();else if(tool==='connect')api.connect();};
  el.querySelector('[data-selection]').onclick=e=>{const button=e.target.closest('[data-remove]');if(button)api.removeSelection(button.dataset.remove);};
 }
 function sync(text){if(text)help=text;const state=api.state();for(const [tool,el] of windows){
  const active=state.editing&&state.mode===tool;el.classList.toggle('is-running',active);
  el.querySelector('[data-state]').textContent=(active?'実行中':'대기 중 · 다른 도구로 전환해도 이 창은 유지됩니다.').replace('実行中','실행 중');el.querySelector('[data-help]').textContent=help[tool]||'';
  const activate=el.querySelector('[data-activate]');activate.hidden=active;activate.disabled=!state.ready||state.busy||(tool==='vertex'&&!state.hasActive)||(tool==='split'&&!state.count);
  const execute=el.querySelector('[data-execute]');execute.hidden=!['draw','split','merge','connect'].includes(tool);execute.textContent=tool==='draw'?'그리기 완료':tool==='split'?'자르기 실행':state.count+'개 라인 '+(tool==='connect'?'연결 실행':'병합 실행');execute.disabled=!active||state.busy||(['merge','connect'].includes(tool)?state.count<2:state.captureCount<2);
  const list=el.querySelector('[data-selection]');list.hidden=!['merge','connect','multi'].includes(tool);list.replaceChildren();if(!list.hidden){const count=document.createElement('p');count.textContent=state.count+'개 라인 선택';list.append(count);for(const item of state.lines){const b=document.createElement('button');b.type='button';b.dataset.remove=item.id;b.textContent=item.name+' ×';list.append(b);}}
 }}
 return {open(tool){const el=windows.get(tool);if(!el)return;el.hidden=false;api.focus(el);persist(tool,el);sync();},sync,get:tool=>windows.get(tool)};
};
