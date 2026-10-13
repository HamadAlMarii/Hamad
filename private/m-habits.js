'use strict';
/* ====================== متتبع العادات (مأخوذ من ملف Complete Productivity Bundle) ====================== */
/* بيانات أكتوبر 2026 من ملف الإكسل: اسم العادة ← أيام الشهر المؤشّرة */
const HB_SEED={month:'2026-10',habits:[
 ['صلاة الفجر',[1,2,3,4,5,6,7,8,9,10,11,12,13]],
 ['صلاة الظهر',[1,2,4,5,6,7,8,9,10,11,12,13]],
 ['صلاة العصر',[1,2,4,5,6,7,8,9,10,11,12,13]],
 ['صلاة المغرب',[1,2,3,4,5,6,7,8,9,10,11,12]],
 ['صلاة العشاء',[2,4,6,7,8,9,10,11,12]],
 ['أذكار الصباح',[2,4,5,6,7,8,11,12,13]],
 ['أذكار المساء',[4,5,6,7,8,9,11,12,13]],
 ['الوتر',[4,9]],
 ['القرآن',[11,12,13]],
 ['القراءة',[7]]
]};
const HB_WEEKS=['الأسبوع ١','الأسبوع ٢','الأسبوع ٣','الأسبوع ٤','الأسبوع ٥'];
const HB_DOW=['ح','ن','ث','ر','خ','ج','س'];
let HB_MONTH=monthOf(todayS());

const daysInMonth=m=>{const [y,mo]=m.split('-').map(Number);return new Date(y,mo,0).getDate()};
const monthDays=m=>Array.from({length:daysInMonth(m)},(_,i)=>`${m}-${pad(i+1)}`);
const sleepLog=()=>KV.sleep||{};
const hbDone=(h,d)=>!!(h.data.days||{})[d];

function renderHabits(el){
 const habits=ofKind('habit'),td=todayS(),m=HB_MONTH,days=monthDays(m);
 const past=days.filter(d=>d<=td),nPast=past.length;
 const done=sum(habits,h=>past.filter(d=>hbDone(h,d)).length),poss=habits.length*nPast;
 const todayDone=habits.filter(h=>hbDone(h,td)).length;
 const perHabit=habits.map(h=>({h,c:days.filter(d=>hbDone(h,d)).length})).sort((a,b)=>b.c-a.c);
 const weeks=HB_WEEKS.map((lb,w)=>{
  const wd=days.slice(w*7,w*7+7);if(!wd.length) return null;
  const c=sum(habits,h=>wd.filter(d=>hbDone(h,d)).length),t=habits.length*wd.length;
  return {lb,wd,c,t};
 }).filter(Boolean);
 const sl=sleepLog(),sDays=days.filter(d=>sl[d]),avgH=sDays.length?sum(sDays,d=>sl[d].h)/sDays.length:null;
 const qDays=sDays.filter(d=>sl[d].q),avgQ=qDays.length?sum(qDays,d=>sl[d].q)/qDays.length:null;
 const imported=(KV.imports||{}).bundle2026_10;
 const isCur=m===monthOf(td);

 const head1=weeks.map(w=>`<th colspan="${w.wd.length}" class="hbw">${w.lb}</th>`).join('');
 const head2=days.map(d=>`<th class="hbd${d===td?' now':''}"><span>${HB_DOW[parseYmd(d).getDay()]}</span>${+d.slice(8)}</th>`).join('');
 const rows=habits.map(h=>{
  const c=days.filter(d=>hbDone(h,d)).length;
  return `<tr><th class="hbn"><button class="lnk" data-act="edit:${h.id}">${esc(h.data.name)}</button></th>${days.map(d=>`<td class="hbc"><button class="hb${d>td?' fut':''}" data-act="t:${h.id}:${d}" aria-pressed="${hbDone(h,d)}" aria-label="${esc(h.data.name)} ${fmtD(d)}" ${d>td?'disabled':''}></button></td>`).join('')}<td class="hbt num">${c}<small>/${days.length}</small></td></tr>`;
 }).join('');
 const dayPct=days.map(d=>{
  const p=habits.length&&d<=td?pct(habits.filter(h=>hbDone(h,d)).length,habits.length):0;
  return `<td class="hbc"><div class="hbbar" title="${Math.round(p)}%"><i style="height:${p.toFixed(0)}%"></i></div></td>`;
 }).join('');

 el.innerHTML=`
  <div class="panel"><div class="ph">
   <div style="display:flex;gap:8px;align-items:center">
    ${ab('m:-1','‹')}<h2 style="margin:0;min-width:130px;text-align:center">${esc(fmtM(m))}</h2>${ab('m:1','›')}
    ${isCur?'':ab('m:0','الشهر الحالي')}
   </div>
   <div style="display:flex;gap:8px;flex-wrap:wrap">${imported?'':ab('import','استيراد أكتوبر من ملف الإكسل')}${ab('add','+ عادة','gold')}</div>
  </div></div>
  <div class="stats">
   ${statCard('المنجز هذا الشهر',`${fmt(done)} <small>من ${fmt(poss)}</small>`,pb(pct(done,poss),'var(--ok)'),pct(done,poss)>=70?'ok':'info')}
   ${statCard('نسبة الالتزام',`${Math.round(pct(done,poss))}%`,`<span>متبقي ${fmt(Math.max(0,poss-done))}</span>`,'gold')}
   ${statCard('اليوم',`${fmt(todayDone)} <small>من ${fmt(habits.length)}</small>`,isCur?'':'<span>عرض شهر آخر</span>',todayDone===habits.length&&habits.length?'ok':'warn')}
   ${statCard('النوم',avgH==null?'—':`${avgH.toFixed(1)} <small>ساعة</small>`,avgQ==null?'<span>سجّل نومك بالأسفل</span>':`<span>الجودة ${avgQ.toFixed(1)} من 5</span>`,'info')}
  </div>
  <div class="panel"><h2>العادات اليومية</h2><p class="hint">اضغط المربع لتأشير اليوم، واضغط اسم العادة لتعديلها.</p>
   ${habits.length?`<div class="tw hbgrid"><table><thead><tr><th class="hbn" rowspan="2">العادة</th>${head1}<th class="hbt" rowspan="2">المجموع</th></tr><tr>${head2}</tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><th class="hbn">التقدم اليومي</th>${dayPct}<td></td></tr></tfoot></table></div>`
   :emptyBox('لا توجد عادات بعد. استورد بيانات ملف الإكسل أو أضف عادة.')}
  </div>
  <div class="two">
   <div class="panel"><h2>التقدم الأسبوعي</h2>${weeks.map(w=>`<div class="brow"><span>${w.lb}</span><div>${pb(pct(w.c,w.t),pct(w.c,w.t)>=70?'var(--ok)':'')}</div><span class="num" style="font-size:13px;color:var(--mute)">${Math.round(pct(w.c,w.t))}%</span></div>`).join('')}</div>
   <div class="panel"><h2>أكثر العادات التزاماً</h2>${perHabit.length?perHabit.map(x=>`<div class="brow"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.h.data.name)}</span><div>${pb(pct(x.c,nPast||1))}</div><span class="num" style="font-size:13px;color:var(--mute)">${x.c}/${nPast}</span></div>`).join(''):emptyBox('لا توجد بيانات.')}</div>
  </div>
  <div class="panel"><div class="ph"><div><h2>النوم</h2><p class="hint" style="margin:0">ساعات النوم وتقييم الجودة من 1 إلى 5.</p></div>${ab('sleep:'+(isCur?td:days[0]),'+ تسجيل نوم','gold')}</div>
   <div class="tw hbgrid"><table><thead><tr><th class="hbn">اليوم</th>${head2}</tr></thead><tbody>
    <tr><th class="hbn">الساعات</th>${days.map(d=>`<td class="hbc"><button class="hbs" data-act="sleep:${d}" ${d>td?'disabled':''}>${sl[d]&&sl[d].h!=null?sl[d].h:''}</button></td>`).join('')}</tr>
    <tr><th class="hbn">الجودة</th>${days.map(d=>`<td class="hbc"><button class="hbs" data-act="sleep:${d}" ${d>td?'disabled':''}>${sl[d]&&sl[d].q?sl[d].q:''}</button></td>`).join('')}</tr>
   </tbody></table></div></div>`;

 el.onclick=async e=>{
  const a=actOf(e);if(!a)return;
  const [act,id,d]=a.split(':');
  if(act==='m'){HB_MONTH=+id?addMonths(HB_MONTH,+id):monthOf(todayS());renderHabits(el);return}
  await guard(async()=>{
   const ex=id?ITEMS.find(i=>i.id===id):null;
   if(act==='t'){
    const days=Object.assign({},ex.data.days||{});
    if(days[d]) delete days[d]; else days[d]=1;
    await saveItem(ex,Object.assign({},ex.data,{days}));
   }
   if(act==='add'||act==='edit'){
    const r=await openForm({title:ex?'تعديل عادة':'عادة جديدة',values:ex?ex.data:{},del:!!ex,fields:[{k:'name',l:'اسم العادة',req:1,full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveOrAdd(ex,'activity','habit',Object.assign({days:{}},ex?ex.data:{},r));
   }
   if(act==='sleep'){
    const cur=sleepLog()[id]||{};
    const r=await openForm({title:'تسجيل النوم',values:{date:id,h:cur.h,q:cur.q},fields:[
     {k:'date',l:'التاريخ',t:'date',req:1,full:1},{k:'h',l:'ساعات النوم',t:'number',ph:'7.5'},{k:'q',l:'الجودة',t:'select',o:[['','—'],['1','1 سيئ'],['2','2'],['3','3 متوسط'],['4','4'],['5','5 ممتاز']]}]});
    if(!r)return;
    const log=Object.assign({},sleepLog());
    if(r.h==null&&!r.q) delete log[r.date]; else log[r.date]={h:r.h,q:r.q?+r.q:null};
    await saveKV('sleep',log);
   }
   if(act==='import'){
    if(!confirm('استيراد عادات أكتوبر 2026 من ملف الإكسل؟ العادات الموجودة بنفس الاسم تُدمج أيامها.'))return;
    const norm=s=>String(s).replace(/[أإآ]/g,'ا').trim();
    for(const [name,ds] of HB_SEED.habits){
     const h=ofKind('habit').find(x=>norm(x.data.name)===norm(name)),days=Object.assign({},h?h.data.days:{});
     ds.forEach(n=>days[`${HB_SEED.month}-${pad(n)}`]=1);
     await saveOrAdd(h,'activity','habit',Object.assign({},h?h.data:{name},{days}));
    }
    await saveKV('imports',Object.assign({},KV.imports||{},{bundle2026_10:new Date().toISOString()}));
    HB_MONTH=HB_SEED.month;toast('تم استيراد العادات');
   }
   renderHabits(el);
  });
 };
}
registerTab({id:'habits',order:6.5,title:'العادات',render:renderHabits});
