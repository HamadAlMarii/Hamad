'use strict';
/* ====================== لوحة تحكم الموقع العام ====================== */
let SC=null,SREMOTE=null,SDIRTY=false,SSUB='general',SDEV='mobile',SPLANG='ar',SPT=null;
const clone=o=>JSON.parse(JSON.stringify(o));
const getP=(o,p)=>p.split('.').reduce((x,k)=>x==null?x:x[k],o);
function setP(o,p,v){const ks=p.split('.');let x=o;ks.slice(0,-1).forEach(k=>{if(x[k]==null||typeof x[k]!=='object')x[k]={};x=x[k]});x[ks[ks.length-1]]=v}
const SECNAMES={companies:'الشركات (الشريط المتحرك)',work:'ما أعمل عليه',about:'نبذة',contact:'تواصل'};

async function loadSite(){
 try{
  const rows=await api('site_content?id=eq.main&select=value');
  SREMOTE=rows&&rows[0]?rows[0].value:null;
 }catch(e){
  if(e.message==='no-session') throw e;
  SREMOTE=null;
 }
 if(!SDIRTY) SC=clone(hjMerge(SITE_DEFAULT,SREMOTE||{}));
}
registerLoader(loadSite);

/* حقل نصي مرتبط بمسار داخل المحتوى */
const fld=(path,label,o={})=>{
 const v=getP(SC,path)??'';
 const dir=o.ltr?' dir="ltr"':'';
 return `<div class="${o.full?'full':''}"><label>${esc(label)}</label>${o.area
  ?`<textarea data-p="${path}" rows="${o.rows||3}"${dir}>${esc(v)}</textarea>`
  :`<input data-p="${path}" value="${esc(v)}"${dir} autocomplete="off">`}</div>`;
};
const lines=(path,label)=>`<div class="full"><label>${esc(label)}</label><textarea data-lines="${path}" rows="6">${esc((getP(SC,path)||[]).join('\n'))}</textarea></div>`;
const bi=(key,label,o)=>`<div class="two" style="gap:12px">${fld('ar.'+key,label+' (عربي)',o)}${fld('en.'+key,label+' (English)',Object.assign({ltr:true},o))}</div>`;

const SUBS=[['general','عام'],['companies','الشركات'],['work','ما أعمل عليه'],['about','نبذة'],['contact','تواصل'],['layout','الأقسام'],['theme','المظهر']];
function editorHTML(){
 const sub=SSUB;
 if(sub==='general') return `<div class="panel"><h2>الواجهة الرئيسية</h2><p class="hint">الاسم والمسمى والسطر الافتتاحي.</p>
  ${bi('name','الاسم')}${bi('name2','الاسم الثانوي تحت الاسم')}${bi('mono','الشعار المختصر (أعلى الصفحة)')}${bi('role','المسمى الوظيفي')}${bi('focus','عبارة «أعمل على»')}${bi('lead','السطر الافتتاحي',{area:1,rows:3})}
  <div class="two" style="gap:12px">${lines('words.ar','الكلمات المتبدلة (عربي)، كل كلمة في سطر')}${lines('words.en','الكلمات المتبدلة (English)، كل كلمة في سطر')}</div></div>
  <div class="panel"><h2>محركات البحث والتذييل</h2>${bi('title','عنوان الصفحة في المتصفح')}${bi('desc','وصف الموقع في نتائج البحث',{area:1,rows:3})}${bi('foot','نص التذييل')}</div>`;
 if(sub==='companies') return `<div class="panel"><h2>شركات عملت معها</h2><p class="hint">تظهر في الشريط المتحرك بنفس الترتيب. اكتب كل اسم في سطر.</p>
  ${bi('h_co','عنوان القسم')}${lines('companies','أسماء الشركات')}</div>`;
 if(sub==='work') return `<div class="panel"><div class="ph"><div><h2>ما أعمل عليه</h2><p class="hint" style="margin:0">كل بطاقة بالعربي والإنجليزي.</p></div><button class="btn sm gold" data-sa="capAdd">+ بطاقة</button></div>
  ${bi('h_work','عنوان القسم')}
  ${(SC.ar.caps||[]).map((c,i)=>`<div class="capcard"><div class="ph" style="margin-bottom:8px"><b>${i+1}</b><div class="acts"><button data-sa="capUp:${i}">▲</button><button data-sa="capDn:${i}">▼</button><button data-sa="capDel:${i}">حذف</button></div></div>
   <div class="irow"><div><label>العنوان (عربي)</label><input data-cap="ar:${i}:t" value="${esc(c.t)}"></div><div><label>Title (English)</label><input dir="ltr" data-cap="en:${i}:t" value="${esc((SC.en.caps[i]||{}).t||'')}"></div></div>
   <div class="irow"><div><label>الوصف (عربي)</label><textarea data-cap="ar:${i}:d" rows="2">${esc(c.d)}</textarea></div><div><label>Description (English)</label><textarea dir="ltr" data-cap="en:${i}:d" rows="2">${esc((SC.en.caps[i]||{}).d||'')}</textarea></div></div></div>`).join('')}</div>`;
 if(sub==='about') return `<div class="panel"><h2>نبذة</h2>${bi('h_about','عنوان القسم')}${bi('about','النص',{area:1,rows:6})}</div>`;
 if(sub==='contact') return `<div class="panel"><h2>تواصل</h2>${bi('h_contact','عنوان القسم')}${bi('contact_p','الجملة التعريفية')}</div>
  <div class="panel"><div class="ph"><div><h2>الروابط</h2><p class="hint" style="margin:0">أزرار كبيرة تظهر في قسم التواصل. يقبل http و https و mailto و tel.</p></div><button class="btn sm gold" data-sa="linkAdd">+ رابط</button></div>
   ${(SC.links||[]).map((k,i)=>`<div class="capcard"><div class="irow"><div><label>النص على الزر</label><input data-link="${i}:label" value="${esc(k.label)}"></div><div><label>الرابط</label><input dir="ltr" data-link="${i}:url" value="${esc(k.url)}" placeholder="https://"></div><div><button class="btn danger sm" data-sa="linkDel:${i}">حذف</button></div></div></div>`).join('')||'<div class="empty">لا توجد روابط.</div>'}</div>`;
 if(sub==='layout') return `<div class="panel"><h2>ترتيب الأقسام وإظهارها</h2><p class="hint">الواجهة الرئيسية دائماً في الأعلى. رتّب الباقي وأخفِ ما لا تريد عرضه.</p>
  ${(SC.order||[]).map((k,i)=>`<div class="ordrow"><span class="tt">${esc(SECNAMES[k]||k)}</span>
   <label class="lbl2"><input type="checkbox" data-hide="${k}" ${SC.hidden&&SC.hidden[k]?'':'checked'}> ظاهر</label>
   <div class="acts"><button data-sa="secUp:${i}">▲</button><button data-sa="secDn:${i}">▼</button></div></div>`).join('')}</div>`;
 if(sub==='theme') return `<div class="panel"><h2>الألوان</h2><p class="hint">الافتراضي مستوحى من درجات الأزرق في هوية بنك الجزيرة.</p>
  <div class="grid4">${[['bg','الخلفية'],['ink','لون النص'],['sky','الأزرق الفاتح (التمييز والروابط)'],['blue','الأزرق الأساسي (الخطوط والتوهج)']].map(([k,l])=>`<div><label>${l}</label><input type="color" data-p="theme.${k}" value="${esc(SC.theme[k])}"></div>`).join('')}</div>
  <div style="margin-top:14px"><button class="btn sm" data-sa="themeReset">استعادة ألوان الأزرق الافتراضية</button></div></div>`;
 return '';
}
function renderSiteEditor(){
 const e=$('sedit');if(!e)return;
 e.innerHTML=`<div class="chips">${SUBS.map(([k,l])=>`<button class="chip" data-ss="${k}" aria-pressed="${SSUB===k}">${l}</button>`).join('')}</div>${editorHTML()}`;
}
function updateSaveBar(){
 const d=$('sdirty');if(!d)return;
 d.textContent=SDIRTY?'تغييرات غير منشورة':'كل شيء منشور';d.className=SDIRTY?'dirty':'hint';
 const b=$('ssave');if(b)b.disabled=!SDIRTY;
 window.onbeforeunload=SDIRTY?(ev=>{ev.preventDefault();ev.returnValue=''}):null;
}
function sendPreview(){
 const f=$('sframe');if(!f||!f.contentWindow)return;
 try{
  f.contentWindow.postMessage({type:'hj-preview',content:SC},location.origin);
  f.contentWindow.postMessage({type:'hj-lang',lang:SPLANG},location.origin);
 }catch(e){}
}
function schedulePreview(){clearTimeout(SPT);SPT=setTimeout(sendPreview,180)}
function changed(){SDIRTY=true;updateSaveBar();schedulePreview()}
function fitPreview(){
 const fr=$('pframe'),f=$('sframe');if(!fr||!f)return;
 const cw=fr.clientWidth||400;
 if(SDEV==='desktop'){
  const sc=cw/1280;f.style.width='1280px';f.style.height='820px';f.style.transform=`scale(${sc})`;f.style.transformOrigin='top right';f.style.margin='0';fr.style.height=(820*sc)+'px';
 }else{
  const w=Math.min(390,cw),sc=1;f.style.width=w+'px';f.style.height='760px';f.style.transform='none';f.style.margin='0 auto';fr.style.height='760px';
 }
}
async function saveSite(){
 await guard(async()=>{
  await api('site_content?on_conflict=id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
   body:{id:'main',user_id:S.user.id,value:SC,updated_at:new Date().toISOString()}});
  SREMOTE=clone(SC);SDIRTY=false;updateSaveBar();toast('تم النشر. الموقع العام يتحدث خلال ثوانٍ');
 });
}
function renderSite(el){
 if(!SC) SC=clone(SITE_DEFAULT);
 el.innerHTML=`
  <div class="savebar"><button class="btn gold" id="ssave">حفظ ونشر</button><button class="btn" id="srevert">تراجع عن التغييرات</button><button class="btn" id="sreset">استعادة الافتراضي</button><button class="btn" id="sexport">تصدير نسخة</button>
   <a class="btn" href="../" target="_blank" rel="noopener">فتح الموقع</a><span id="sdirty" class="hint" style="margin:0"></span></div>
  <div class="sitewrap">
   <div id="sedit"></div>
   <div class="prev"><div class="prevbar"><b style="flex:1">معاينة حية</b>
     <button class="chip" data-sd="mobile" aria-pressed="${SDEV==='mobile'}">جوال</button><button class="chip" data-sd="desktop" aria-pressed="${SDEV==='desktop'}">كمبيوتر</button>
     <button class="chip" data-sl="ar" aria-pressed="${SPLANG==='ar'}">عربي</button><button class="chip" data-sl="en" aria-pressed="${SPLANG==='en'}">EN</button></div>
    <div class="pframe" id="pframe"><iframe id="sframe" src="../?preview=1" title="معاينة الموقع"></iframe></div></div>
  </div>`;
 renderSiteEditor();updateSaveBar();fitPreview();
 const f=$('sframe');
 f.addEventListener('load',()=>{fitPreview();setTimeout(sendPreview,120)});
 if(!window._hjMsg){
  window._hjMsg=true;
  addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&e.data.type==='hj-ready')sendPreview()});
  addEventListener('resize',()=>{if(CURTAB==='site')fitPreview()});
 }
 el.oninput=e=>{
  const t=e.target;
  if(t.dataset.p){setP(SC,t.dataset.p,t.value);changed()}
  else if(t.dataset.lines){setP(SC,t.dataset.lines,t.value.split('\n').map(x=>x.trim()).filter(Boolean));changed()}
  else if(t.dataset.cap){const [l,i,k]=t.dataset.cap.split(':');SC[l].caps[+i][k]=t.value;changed()}
  else if(t.dataset.link){const [i,k]=t.dataset.link.split(':');SC.links[+i][k]=t.value;changed()}
 };
 el.onchange=e=>{
  const t=e.target;
  if(t.dataset.hide){SC.hidden=SC.hidden||{};if(t.checked)delete SC.hidden[t.dataset.hide];else SC.hidden[t.dataset.hide]=true;changed()}
 };
 el.onclick=async e=>{
  const b=e.target;
  const ss=b.closest('[data-ss]');if(ss){SSUB=ss.dataset.ss;renderSiteEditor();return}
  const sd=b.closest('[data-sd]');if(sd){SDEV=sd.dataset.sd;document.querySelectorAll('[data-sd]').forEach(x=>x.setAttribute('aria-pressed',x===sd));fitPreview();return}
  const sl=b.closest('[data-sl]');if(sl){SPLANG=sl.dataset.sl;document.querySelectorAll('[data-sl]').forEach(x=>x.setAttribute('aria-pressed',x===sl));sendPreview();return}
  const sa=b.closest('[data-sa]');
  if(sa){
   const [act,i0]=sa.dataset.sa.split(':'),i=+i0;
   const capsBoth=fn=>{fn(SC.ar.caps);fn(SC.en.caps)};
   if(act==='capAdd') capsBoth(c=>c.push({t:'',d:''}));
   if(act==='capDel'&&confirm('حذف هذه البطاقة؟')) capsBoth(c=>c.splice(i,1));
   if(act==='capUp'&&i>0) capsBoth(c=>{[c[i-1],c[i]]=[c[i],c[i-1]]});
   if(act==='capDn') capsBoth(c=>{if(i<c.length-1)[c[i+1],c[i]]=[c[i],c[i+1]]});
   if(act==='linkAdd') SC.links.push({label:'رابط جديد',url:'https://'});
   if(act==='linkDel') SC.links.splice(i,1);
   if(act==='secUp'&&i>0) [SC.order[i-1],SC.order[i]]=[SC.order[i],SC.order[i-1]];
   if(act==='secDn'&&i<SC.order.length-1) [SC.order[i+1],SC.order[i]]=[SC.order[i],SC.order[i+1]];
   if(act==='themeReset') SC.theme=clone(SITE_DEFAULT.theme);
   changed();renderSiteEditor();return;
  }
  if(b.id==='ssave') await saveSite();
  if(b.id==='srevert'){SC=clone(hjMerge(SITE_DEFAULT,SREMOTE||{}));SDIRTY=false;renderSiteEditor();updateSaveBar();sendPreview();toast('تم التراجع')}
  if(b.id==='sreset'&&confirm('استعادة المحتوى الافتراضي؟ لن يُنشر إلا بعد الضغط على حفظ ونشر.')){SC=clone(SITE_DEFAULT);changed();renderSiteEditor()}
  if(b.id==='sexport'){
   const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(SC,null,1)],{type:'application/json'}));
   a.download='site-content-'+todayS()+'.json';document.body.appendChild(a);a.click();a.remove();
  }
 };
}
registerTab({id:'site',order:9,title:'موقعي',render:renderSite});
