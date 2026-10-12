'use strict';
/* ====== الإعدادات (المفتاح عام بتصميمه، والحماية من قفل الجداول RLS) ====== */
const SB_URL='https://msjsuhjgdedihzxtbems.supabase.co';
const SB_KEY='sb_publishable_SBktBUVHARZmYUFezgOXWg_FEmmUqOj';
const SKEY='hamad-session-v1';
const CUR='ر.س';

/* ====== أدوات ====== */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseYmd=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parseYmd(s);d.setDate(d.getDate()+n);return ymd(d)};
const weekStart=(d=new Date())=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-x.getDay());return ymd(x)};
const todayS=()=>ymd(new Date());
const monthOf=s=>String(s).slice(0,7);
const addMonths=(m,n)=>{const [y,mo]=m.split('-').map(Number);const d=new Date(y,mo-1+n,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const fmtD=s=>parseYmd(s).toLocaleDateString('ar-u-ca-gregory-nu-latn',{day:'numeric',month:'short'});
const fmtDY=s=>parseYmd(s).toLocaleDateString('ar-u-ca-gregory-nu-latn',{day:'numeric',month:'short',year:'numeric'});
const fmtM=m=>{const [y,mo]=m.split('-').map(Number);return new Date(y,mo-1,1).toLocaleDateString('ar-u-ca-gregory-nu-latn',{month:'long',year:'numeric'})};
const daysBetween=(a,b)=>Math.round((parseYmd(b)-parseYmd(a))/864e5);
const AR_DIG='٠١٢٣٤٥٦٧٨٩',FA_DIG='۰۱۲۳۴۵۶۷۸۹';
const num=v=>{
 if(typeof v==='number') return isFinite(v)?v:null;
 const s=String(v??'').replace(/[٠-٩]/g,d=>AR_DIG.indexOf(d)).replace(/[۰-۹]/g,d=>FA_DIG.indexOf(d)).replace(/[٫]/g,'.').replace(/[٬,\s]/g,'');
 const n=parseFloat(s.replace(/[^\d.\-]/g,''));return isNaN(n)?null:n;
};
const fmt=n=>n==null?'—':Math.round(n).toLocaleString('en-US');
const money=n=>n==null||isNaN(n)?'—':`${Math.round(n).toLocaleString('en-US')} ${CUR}`;
const sum=(a,f)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const pct=(a,b)=>b>0?Math.max(0,Math.min(100,a/b*100)):0;
const pb=(p,color)=>`<div class="pb"><i style="width:${Math.max(0,Math.min(100,p)).toFixed(1)}%${color?`;background:${color}`:''}"></i></div>`;
const hijri=()=>{try{return new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'})}catch(e){return ''}};
let toastT;
function toast(msg,bad){const t=$('toast');t.textContent=msg;t.className='on'+(bad?' bad':'');clearTimeout(toastT);toastT=setTimeout(()=>t.className='',bad?4500:1800)}
const statCard=(lb,v,m,cls,tab)=>`<${tab?'button':'div'} class="stat ${cls||''}" ${tab?`data-go="${tab}"`:''}><span class="lb">${esc(lb)}</span><div class="v num">${v}</div>${m?`<div class="m">${m}</div>`:''}</${tab?'button':'div'}>`;

/* ====== الجلسة ====== */
let S=null,refreshing=null;
function loadSession(){try{S=JSON.parse(localStorage.getItem(SKEY)||'null')}catch(e){S=null}}
function saveSession(){try{localStorage.setItem(SKEY,JSON.stringify(S))}catch(e){}}
function clearSession(){S=null;try{localStorage.removeItem(SKEY)}catch(e){}}
function setSession(j){
 S={access_token:j.access_token,refresh_token:j.refresh_token,
    expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),
    user:{id:j.user.id,email:j.user.email}};
 saveSession();
}
async function login(email,password){
 const r=await fetch(SB_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok){
  const m=(j.error_description||j.msg||j.message||'').toLowerCase();
  throw new Error(m.includes('invalid')?'الإيميل أو كلمة السر غير صحيحة':(j.error_description||j.msg||j.message||'تعذر تسجيل الدخول'));
 }
 setSession(j);
}
function refresh(){
 if(refreshing) return refreshing;
 refreshing=(async()=>{
  if(!S||!S.refresh_token) throw new Error('no-session');
  let r;
  try{r=await fetch(SB_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:S.refresh_token})})}
  catch(e){throw new Error('تعذر الاتصال، تأكد من الإنترنت')}
  const j=await r.json().catch(()=>({}));
  if(!r.ok){clearSession();throw new Error('no-session')}
  setSession(j);
 })().finally(()=>{refreshing=null});
 return refreshing;
}
async function api(path,opt={}){
 if(!S) throw new Error('no-session');
 if(S.expires_at-Math.floor(Date.now()/1000)<60) await refresh();
 const go=()=>fetch(SB_URL+'/rest/v1/'+path,{method:opt.method||'GET',
  headers:Object.assign({apikey:SB_KEY,Authorization:'Bearer '+S.access_token,'Content-Type':'application/json'},opt.prefer?{Prefer:opt.prefer}:{}),
  body:opt.body!==undefined?JSON.stringify(opt.body):undefined});
 let r;
 try{r=await go()}catch(e){throw new Error('تعذر الاتصال، تأكد من الإنترنت')}
 if(r.status===401){await refresh();r=await go()}
 if(!r.ok){
  const t=await r.text();let m=t;
  try{const j=JSON.parse(t);m=j.message||j.hint||t}catch(e){}
  if(/relation .* does not exist|Could not find the table/i.test(m)) m='الجدول غير موجود. شغّل ملف supabase-setup-2 في Supabase أولاً.';
  throw new Error(m||('خطأ '+r.status));
 }
 const txt=await r.text();return txt?JSON.parse(txt):null;
}
async function apiAll(path){
 const out=[];let off=0;
 for(;;){
  const rows=await api(path+(path.includes('?')?'&':'?')+`limit=1000&offset=${off}`)||[];
  out.push(...rows);if(rows.length<1000)break;off+=1000;
 }
 return out;
}
async function guard(fn){
 try{return await fn()}
 catch(e){
  if(e.message==='no-session'){showLogin('انتهت الجلسة، سجّل دخولك من جديد');return}
  toast(e.message||'حدث خطأ',true);
 }
}

/* ====== الإعدادات الشخصية (جدول kv) ====== */
let KV={};
async function loadKV(){const rows=await apiAll('kv?select=key,value')||[];KV={};rows.forEach(r=>KV[r.key]=r.value)}
async function saveKV(key,value){
 KV[key]=value;
 await api('kv?on_conflict=user_id,key',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
  body:{user_id:S.user.id,key,value,updated_at:new Date().toISOString()}});
}
const SETTING_DEFAULTS={weekMin:150,booksYear:12,qDaily:5};
const settings=()=>Object.assign({},SETTING_DEFAULTS,KV.settings||{});
const saveSettings=patch=>saveKV('settings',Object.assign({},KV.settings||{},patch));

/* ====== مخزن العناصر العام (جدول items) ====== */
let ITEMS=[];
async function loadItems(){ITEMS=await apiAll('items?select=*&order=created_at.asc')||[]}
const ofKind=k=>ITEMS.filter(i=>i.kind===k);
async function addItem(module,kind,data){
 const [row]=await api('items',{method:'POST',prefer:'return=representation',body:{user_id:S.user.id,module,kind,data}});
 ITEMS.push(row);return row;
}
async function saveItem(it,data){
 const [row]=await api('items?id=eq.'+encodeURIComponent(it.id),{method:'PATCH',prefer:'return=representation',body:{data,updated_at:new Date().toISOString()}});
 Object.assign(it,row);return it;
}
async function removeItem(it){
 await api('items?id=eq.'+encodeURIComponent(it.id),{method:'DELETE'});
 ITEMS=ITEMS.filter(x=>x.id!==it.id);
}

/* ====== نافذة النماذج ====== */
function openForm({title,fields,values={},ok='حفظ',del=false}){
 return new Promise(resolve=>{
  const d=document.createElement('dialog');
  const body=fields.map(f=>{
   const v=values[f.k]??f.d??'';const id='f_'+f.k;let inp;
   if(f.t==='select') inp=`<select id="${id}" name="${f.k}">${f.o.map(([val,l])=>`<option value="${esc(val)}" ${String(v)===String(val)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
   else if(f.t==='textarea') inp=`<textarea id="${id}" name="${f.k}" rows="${f.rows||3}" placeholder="${esc(f.ph||'')}">${esc(v)}</textarea>`;
   else if(f.t==='check') inp=`<label class="chk2"><input type="checkbox" id="${id}" name="${f.k}" ${v?'checked':''}> ${esc(f.l)}</label>`;
   else if(f.t==='number') inp=`<input id="${id}" name="${f.k}" type="text" inputmode="decimal" value="${esc(v)}" placeholder="${esc(f.ph||'')}" ${f.req?'required':''} autocomplete="off">`;
   else inp=`<input id="${id}" name="${f.k}" type="${f.t||'text'}" value="${esc(v)}" placeholder="${esc(f.ph||'')}" ${f.req?'required':''} ${f.max?`max="${f.max}"`:''} autocomplete="off">`;
   return `<div class="fld ${f.full?'full':''}">${f.t==='check'?'':`<label for="${id}">${esc(f.l)}</label>`}${inp}</div>`;
  }).join('');
  d.innerHTML=`<form method="dialog" class="dlg"><div class="dlgh"><b>${esc(title)}</b><button type="button" class="x" data-cancel aria-label="إغلاق">×</button></div><div class="dlgb">${body}</div><div class="dlgf"><button class="btn gold" type="submit">${esc(ok)}</button>${del?'<button class="btn danger" type="button" data-del>حذف</button>':''}<button class="btn" type="button" data-cancel>إلغاء</button></div></form>`;
  document.body.appendChild(d);
  let done=false;
  const finish=r=>{if(done)return;done=true;try{d.close()}catch(e){}d.remove();resolve(r)};
  d.addEventListener('close',()=>finish(null));
  d.addEventListener('cancel',()=>finish(null));
  d.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',()=>finish(null)));
  const delb=d.querySelector('[data-del]');
  if(delb) delb.addEventListener('click',()=>{if(confirm('تأكيد الحذف؟'))finish({__del:true})});
  d.querySelector('form').addEventListener('submit',e=>{
   e.preventDefault();
   const out={};
   for(const f of fields){
    const el=d.querySelector('[name="'+f.k+'"]');
    if(f.t==='check') out[f.k]=el.checked;
    else if(f.t==='number'){
     const n=num(el.value);
     if(f.req&&n==null){toast('أدخل رقماً صحيحاً في: '+f.l,true);el.focus();return}
     out[f.k]=n;
    }else out[f.k]=el.value.trim();
   }
   finish(out);
  });
  d.showModal();
  const first=d.querySelector('input:not([type=checkbox]),textarea,select');if(first)first.focus();
 });
}

/* ====== التبويبات ====== */
const TABS=[],LOADERS=[loadKV,loadItems];
function registerTab(t){TABS.push(t);TABS.sort((a,b)=>a.order-b.order)}
function registerLoader(f){LOADERS.push(f)}
let CURTAB='home';
function buildTabs(){
 $('tabs').innerHTML=TABS.map(t=>`<button class="tab" role="tab" data-t="${t.id}" aria-selected="${t.id===CURTAB}">${esc(t.title)}</button>`).join('');
 $('main').innerHTML=TABS.map(t=>`<section id="tab-${t.id}" ${t.id===CURTAB?'':'hidden'}></section>`).join('');
}
function showTab(id){
 if(!TABS.find(t=>t.id===id)) id='home';
 CURTAB=id;
 document.querySelectorAll('#tabs .tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===id));
 TABS.forEach(t=>{$('tab-'+t.id).hidden=t.id!==id});
 const t=TABS.find(x=>x.id===id);
 try{t.render($('tab-'+id))}catch(e){console.error(e);$('tab-'+id).innerHTML=`<div class="empty">تعذر عرض هذا القسم: ${esc(e.message)}</div>`}
 try{localStorage.setItem('hamad-tab',id)}catch(e){}
 window.scrollTo({top:0});
}
const rerender=()=>{
 const el=$('tab-'+CURTAB),t=TABS.find(x=>x.id===CURTAB);
 if(el&&t){const y=scrollY;t.render(el);window.scrollTo(0,y)}
};
document.addEventListener('click',e=>{
 const t=e.target.closest('#tabs .tab');if(t){showTab(t.dataset.t);return}
 const g=e.target.closest('[data-go]');if(g)showTab(g.dataset.go);
});

/* ====== الشاشات ====== */
function showLogin(msg){
 $('app').hidden=true;$('login').hidden=false;
 $('loginErr').textContent=msg||'';$('pw').value='';
 setTimeout(()=>$($('em').value?'pw':'em').focus(),50);
}
async function showApp(){
 $('login').hidden=true;$('app').hidden=false;
 $('who').textContent=S.user.email;$('hijri').textContent=hijri();
 let last='home';try{last=localStorage.getItem('hamad-tab')||'home'}catch(e){}
 CURTAB=last;buildTabs();
 $('main').insertAdjacentHTML('afterbegin','<div class="empty" id="loading">جاري تحميل بياناتك...</div>');
 const failures=[];let lost=false;
 await Promise.all(LOADERS.map(f=>Promise.resolve().then(f).catch(e=>{if(e.message==='no-session')lost=true;else failures.push(e)})));
 if(lost){showLogin('انتهت الجلسة، سجّل دخولك من جديد');return}
 const ld=$('loading');if(ld)ld.remove();
 if(failures.length) toast(failures[0].message,true);
 showTab(CURTAB);
}
async function backup(){
 await guard(async()=>{
  toast('جاري تجهيز النسخة...');
  const [tasks,kv,items,site]=await Promise.all([apiAll('tasks?select=*'),apiAll('kv?select=*'),apiAll('items?select=*'),apiAll('site_content?select=*').catch(()=>[])]);
  const blob=new Blob([JSON.stringify({exported:new Date().toISOString(),tasks,kv,items,site_content:site},null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hamad-backup-'+todayS()+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast('تم تنزيل النسخة الاحتياطية');
 });
}
function boot(){
 $('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const b=$('loginBtn');b.disabled=true;b.textContent='جاري الدخول...';$('loginErr').textContent='';
  try{await login($('em').value.trim(),$('pw').value);await showApp()}
  catch(err){$('loginErr').textContent=err.message}
  finally{b.disabled=false;b.textContent='دخول'}
 });
 $('logout').addEventListener('click',async()=>{
  try{if(S) await fetch(SB_URL+'/auth/v1/logout',{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+S.access_token}})}catch(e){}
  clearSession();ITEMS=[];KV={};showLogin('');
 });
 $('backup').addEventListener('click',backup);
 loadSession();
 if(!S){showLogin('');return}
 showApp();
}
