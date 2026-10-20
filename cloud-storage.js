/* Shared route storage. Only authenticated authorized editors can write. */
(()=>{
'use strict';
const URL='https://zdjuksmhtvhetzblczqq.supabase.co', KEY='sb_publishable_Hlk_1ZOd_WF_Ijn6VM258w_3w8HFYN4';

const sessionKey='gunsan_bike:cloud-session-v1';let session=null,revision=0,loaded=false,refreshing=null;
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
const cloud=window.GunsanCloud={
 get revision(){return revision;},get loggedIn(){return !!session;},get email(){return session?.user?.email||'';},
 subscribe(fn){listeners.add(fn);},
 async load(){const rows=await request('/rest/v1/gunsan_bike_datasets?id=eq.gunsan_bike&select=data,revision,updated_at');const row=rows[0];revision=row?Number(row.revision):0;loaded=true;notify();return row?.data||null;},
 async save(data){if(!loaded)throw Error('공용 노선을 확인하지 못했습니다. 작업을 내보낸 뒤 새로고침하세요.');const access=await token();
 const rows=await request('/rest/v1/rpc/save_gunsan_bike',{method:'POST',token:access,body:{p_data:data,p_revision:revision}});
 if(!rows?.[0])throw Error('공용저장소의 저장 확인을 받지 못했습니다.');revision=Number(rows[0].revision);notify();return rows[0];
 },
 async login(email,password){const next=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});remember(next);},
 async logout(){const current=session;remember(null);if(current)try{await request('/auth/v1/logout',{method:'POST',token:current.access_token});}catch(e){}},
 install(container){
  const section=document.createElement('section');section.className='bike-cloud-settings';
  section.innerHTML='<h3>공용저장소</h3><p class="bike-cloud-status" role="status"></p><details><summary>로그인 및 연결 설정</summary><form><label>이메일<input name="email" type="email" autocomplete="username" required placeholder="기존 편집 계정 이메일"></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">로그인</button></form><button type="button" class="bike-cloud-logout">로그아웃</button></details><p>저장 버튼으로 도형·속성을 공용저장소에 저장합니다. 이 기기의 로그인은 자동으로 유지됩니다. 다른 컴퓨터에서도 최초 한 번만 로그인하면 이후 저장 버튼만 누르면 됩니다.</p>';
  const status=section.querySelector('.bike-cloud-status'),form=section.querySelector('form'),logout=section.querySelector('.bike-cloud-logout');
  const update=()=>{status.textContent=(session?'로그인됨 · '+cloud.email:'보기 가능 · 저장하려면 로그인')+(loaded?' · 버전 '+revision:'');form.hidden=!!session;logout.hidden=!session;};
  cloud.subscribe(update);update();container.append(section);
  form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='로그인 중…';try{await cloud.login(form.elements.email.value.trim(),form.elements.password.value);form.elements.password.value='';section.querySelector('details').open=false;}catch(e){status.textContent='로그인 실패: '+e.message;}finally{button.disabled=false;}};
  logout.onclick=()=>cloud.logout();
 }
};
})();
