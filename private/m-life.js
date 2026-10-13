'use strict';
/* مساعدات مشتركة */
const li=(t,s,a)=>`<div class="li"><div><div class="tt">${t}</div>${s?`<div class="ss">${s}</div>`:''}</div><div class="aa">${a||''}</div></div>`;
const ab=(act,label,cls)=>`<button class="btn sm ${cls||''}" data-act="${act}">${label}</button>`;
const actOf=e=>{const b=e.target.closest('[data-act]');return b?b.dataset.act:null};
const emptyBox=t=>`<div class="empty">${t}</div>`;
async function saveOrAdd(existing,module,kind,data){
 return existing?saveItem(existing,data):addItem(module,kind,data);
}

/* ====================== العائلة ====================== */
const RELS=['أب','أم','زوجة','ابن','ابنة','أخ','أخت','جد','جدة','عم/عمة','خال/خالة','قريب','صديق العائلة'];
function nextOccur(dateS,yearly){
 const td=todayS();
 if(!yearly) return dateS>=td?dateS:null;
 const d=parseYmd(dateS),y=new Date().getFullYear();
 let c=new Date(y,d.getMonth(),d.getDate());if(ymd(c)<td)c=new Date(y+1,d.getMonth(),d.getDate());
 return ymd(c);
}
function ageOf(b){
 const d=parseYmd(b),n=new Date();let a=n.getFullYear()-d.getFullYear();
 if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;
 return a;
}
const inDays=d=>{const n=daysBetween(todayS(),d);return n===0?'اليوم':n===1?'غداً':`بعد ${n} يوم`};
function familyUpcoming(limitDays){
 const out=[];
 ofKind('member').forEach(m=>{
  if(!m.data.birthday) return;
  const w=nextOccur(m.data.birthday,true);
  out.push({when:w,label:`عيد ميلاد ${m.data.name}`,sub:`يكمل ${ageOf(m.data.birthday)+1} سنة`,type:'birthday'});
 });
 ofKind('fevent').forEach(ev=>{
  const w=nextOccur(ev.data.date,!!ev.data.yearly);if(!w)return;
  out.push({when:w,label:ev.data.title,sub:[ev.data.person,ev.data.yearly?'سنوي':''].filter(Boolean).join(' · '),type:'event'});
 });
 return out.filter(x=>daysBetween(todayS(),x.when)<=limitDays).sort((a,b)=>a.when<b.when?-1:1);
}
function renderFamily(el){
 const members=ofKind('member'),events=ofKind('fevent');
 const up=familyUpcoming(60);
 const ftasks=TASKS.filter(t=>t.company==='family'&&t.status!=='done').sort(sortTasks);
 const evSorted=events.slice().sort((a,b)=>a.data.date<b.data.date?-1:1);
 el.innerHTML=`
  <div class="stats">
   ${statCard('أفراد العائلة',fmt(members.length),'','gold')}
   ${statCard('أقرب مناسبة',up.length?esc(up[0].label):'—',up.length?`<span>${inDays(up[0].when)}</span>`:'','info')}
   ${statCard('مهام العائلة المفتوحة',fmt(ftasks.length),'', ftasks.length?'warn':'ok')}
  </div>
  <div class="panel"><h2>قريباً</h2><p class="hint">أعياد الميلاد والمناسبات خلال 60 يوماً.</p>
   ${up.length?up.slice(0,10).map(x=>li(esc(x.label),esc(x.sub)+(x.sub?' · ':'')+fmtD(x.when),`<span class="tag ${daysBetween(todayS(),x.when)<=7?'warn':''}">${inDays(x.when)}</span>`)).join(''):emptyBox('ما فيه شي قريب.')}</div>
  <div class="panel"><div class="ph"><div><h2>مهام العائلة</h2><p class="hint" style="margin:0">مهام تخص البيت والعائلة. تظهر كذلك في تبويب المهام.</p></div></div>
   <form id="ftForm" class="irow" style="margin-bottom:12px"><div class="full"><input id="ftTitle" placeholder="مهمة جديدة للعائلة" maxlength="300" autocomplete="off"></div><div><input id="ftDue" type="date"></div><div><button class="btn gold" style="width:100%;padding:10px" type="submit">إضافة</button></div></form>
   <ul class="tasks">${ftasks.length?ftasks.map(taskRow).join(''):'<li class="empty">لا توجد مهام مفتوحة.</li>'}</ul></div>
  <div class="panel"><div class="ph"><h2>المناسبات والمواعيد</h2>${ab('addEvent','+ مناسبة','gold')}</div>
   ${evSorted.length?evSorted.map(ev=>{const w=nextOccur(ev.data.date,!!ev.data.yearly);
    return li(esc(ev.data.title),`${fmtDY(ev.data.date)}${ev.data.person?' · '+esc(ev.data.person):''}${ev.data.yearly?' · سنوي':''}`,
     `${w?`<span class="tag ${daysBetween(todayS(),w)<=7?'warn':''}">${inDays(w)}</span>`:'<span class="tag">مضت</span>'}${ab('editEvent:'+ev.id,'تعديل')}`)}).join(''):emptyBox('أضف مواعيدك: زيارة طبيب، اجتماع مدرسة، سفر، ذكرى سنوية...')}</div>
  <div class="panel"><div class="ph"><h2>أفراد العائلة</h2>${ab('addMember','+ فرد','gold')}</div>
   ${members.length?members.map(m=>{const n=m.data.birthday?nextOccur(m.data.birthday,true):null;
    return li(esc(m.data.name),[m.data.relation,m.data.birthday?`${ageOf(m.data.birthday)} سنة`:'',m.data.notes].filter(Boolean).map(esc).join(' · '),
     `${n?`<span class="tag ${daysBetween(todayS(),n)<=30?'gold':''}">ميلاده ${inDays(n)}</span>`:''}${ab('editMember:'+m.id,'تعديل')}`)}).join(''):emptyBox('أضف أفراد عائلتك لتتابع أعياد ميلادهم وملاحظاتهم.')}</div>`;
 el.onsubmit=async e=>{
  if(e.target.id!=='ftForm')return;e.preventDefault();
  const title=$('ftTitle').value.trim();if(!title){$('ftTitle').focus();return}
  await guard(async()=>{await addTask({title:title.slice(0,300),company:'family',priority:'normal',due:$('ftDue').value||null});renderFamily(el);toast('انضافت المهمة')});
 };
 el.onclick=async e=>{
  if(await taskAction(e,()=>renderFamily(el))) return;
  const a=actOf(e);if(!a)return;
  const [act,id]=a.split(':');
  await guard(async()=>{
   if(act==='addMember'||act==='editMember'){
    const ex=id?ITEMS.find(i=>i.id===id):null;
    const r=await openForm({title:ex?'تعديل فرد':'فرد جديد',values:ex?ex.data:{},del:!!ex,fields:[
     {k:'name',l:'الاسم',req:1},{k:'relation',l:'الصلة',t:'select',o:RELS.map(x=>[x,x])},
     {k:'birthday',l:'تاريخ الميلاد',t:'date'},{k:'notes',l:'ملاحظات',t:'textarea',full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveOrAdd(ex,'family','member',r);
    renderFamily(el);
   }
   if(act==='addEvent'||act==='editEvent'){
    const ex=id?ITEMS.find(i=>i.id===id):null;
    const r=await openForm({title:ex?'تعديل مناسبة':'مناسبة جديدة',values:ex?ex.data:{date:todayS()},del:!!ex,fields:[
     {k:'title',l:'العنوان',req:1,full:1},{k:'date',l:'التاريخ',t:'date',req:1},{k:'person',l:'تخص من؟'},
     {k:'yearly',l:'تتكرر كل سنة',t:'check'},{k:'notes',l:'ملاحظات',t:'textarea',full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveOrAdd(ex,'family','fevent',r);
    renderFamily(el);
   }
  });
 };
}
registerTab({id:'family',order:4,title:'العائلة',render:renderFamily});

/* ====================== المالية ====================== */
const EXPC=['سكن','طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','عائلة','ادخار واستثمار','صدقة','أخرى'];
const INCC=['راتب','دخل إضافي','أرباح','دخل آخر'];
let FM=monthOf(todayS()),FT='all';
const catsFor=t=>t==='in'?INCC:EXPC;
function monthTxns(m){return ofKind('txn').filter(i=>monthOf(i.data.date||'')===m)}
function billDue(b,m){const [y,mo]=m.split('-').map(Number),dim=new Date(y,mo,0).getDate();return `${m}-${pad(Math.min(Math.max(1,b.data.day||1),dim))}`}
async function markBill(b,m){
 const paid=Object.assign({},b.data.paid||{});
 if(paid[m]){
  const tx=ITEMS.find(i=>i.id===paid[m]);if(tx) await removeItem(tx);
  delete paid[m];
 }else{
  const tx=await addItem('finance','txn',{type:'out',amount:b.data.amount,category:b.data.category||'فواتير',date:todayS(),note:'فاتورة: '+b.data.name,billId:b.id,month:m});
  paid[m]=tx.id;
 }
 await saveItem(b,Object.assign({},b.data,{paid}));
}
function renderFinance(el){
 const tx=monthTxns(FM),income=sum(tx.filter(x=>x.data.type==='in'),x=>x.data.amount),spent=sum(tx.filter(x=>x.data.type==='out'),x=>x.data.amount);
 const net=income-spent,rate=income>0?net/income*100:null;
 const byCat={};tx.filter(x=>x.data.type==='out').forEach(x=>{byCat[x.data.category]=(byCat[x.data.category]||0)+(+x.data.amount||0)});
 const budgets=ofKind('budget'),bmap={};budgets.forEach(b=>bmap[b.data.cat]=b);
 const catRows=[...new Set([...Object.keys(byCat),...budgets.map(b=>b.data.cat)])].sort((a,b)=>(byCat[b]||0)-(byCat[a]||0));
 const maxC=Math.max(1,...catRows.map(c=>Math.max(byCat[c]||0,bmap[c]?bmap[c].data.limit:0)));
 const bills=ofKind('bill').filter(b=>b.data.active!==false).sort((a,b)=>(a.data.day||0)-(b.data.day||0));
 const debts=ofKind('debt');
 const list=tx.filter(x=>FT==='all'||x.data.type===FT).sort((a,b)=>a.data.date<b.data.date?1:-1);
 el.innerHTML=`
  <div class="sec-note">بياناتك تُحفظ في حساب Supabase الخاص بك ومحمية بقفل الجداول، لكنها ليست مشفّرة من طرفك. لا تدخل أرقام حسابات أو آيبان أو بطاقات أو كلمات سر.</div>
  <div class="ph" style="justify-content:flex-start"><button class="btn sm" data-act="pm">◀</button><b>${esc(fmtM(FM))}</b><button class="btn sm" data-act="nm">▶</button></div>
  <div class="stats">
   ${statCard('الدخل',money(income),'','ok')}
   ${statCard('المصروفات',money(spent),'', 'warn')}
   ${statCard('الصافي',money(net),'',net>=0?'ok':'bad')}
   ${statCard('نسبة الادخار',rate==null?'—':Math.round(rate)+'%','',rate==null?'':(rate>=20?'ok':rate>=0?'warn':'bad'))}
  </div>
  <form class="panel" id="txForm"><h2>تسجيل حركة</h2><div class="irow" style="margin-top:10px">
   <div><label>النوع</label><select id="tt"><option value="out">مصروف</option><option value="in">دخل</option></select></div>
   <div><label>المبلغ (${CUR})</label><input id="ta" inputmode="decimal" placeholder="0" autocomplete="off"></div>
   <div><label>التصنيف</label><select id="tc">${EXPC.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
   <div><label>التاريخ</label><input id="td" type="date" value="${FM===monthOf(todayS())?todayS():FM+'-01'}"></div>
   <div class="full"><label>ملاحظة</label><input id="tn" placeholder="اختياري" maxlength="120" autocomplete="off"></div>
   <div><button class="btn gold" style="width:100%;padding:10px" type="submit">إضافة</button></div></div></form>
  <div class="two">
   <div class="panel"><div class="ph"><h2>المصروفات والميزانية</h2>${ab('addBudget','+ ميزانية')}</div>
    ${catRows.length?catRows.map(c=>{const sp=byCat[c]||0,b=bmap[c],lim=b?b.data.limit:0,over=lim>0&&sp>lim;
     return `<div class="brow"><span>${esc(c)}</span><div>${pb(pct(sp,lim||maxC),over?'var(--bad)':(lim&&sp>lim*.8?'var(--warn)':''))}</div><span class="num" style="font-size:13px;color:${over?'var(--bad)':'var(--mute)'}">${fmt(sp)}${lim?` من ${fmt(lim)}`:''}${b?` <button class="btn sm" data-act="editBudget:${b.id}" style="padding:0 6px">✎</button>`:''}</span></div>`}).join(''):emptyBox('حدد ميزانية لكل تصنيف لتتابع إنفاقك.')}</div>
   <div class="panel"><div class="ph"><h2>الفواتير الشهرية</h2>${ab('addBill','+ فاتورة')}</div>
    ${bills.length?bills.map(b=>{const due=billDue(b,FM),paid=!!(b.data.paid||{})[FM],late=!paid&&due<todayS();
     return li(esc(b.data.name),`${money(b.data.amount)} · يوم ${b.data.day}`,`<span class="tag ${paid?'ok':late?'bad':''}">${paid?'مدفوعة':late?'متأخرة':fmtD(due)}</span>${ab('bill:'+b.id,paid?'إلغاء':'تم الدفع')}${ab('editBill:'+b.id,'✎')}`)}).join(''):emptyBox('أضف فواتيرك المتكررة: كهرباء، جوال، إيجار...')}</div>
  </div>
  <div class="panel"><div class="ph"><h2>الديون والأقساط</h2>${ab('addDebt','+ دين')}</div>
   ${debts.length?debts.map(d=>{const paid=(d.data.total||0)-(d.data.remaining||0);
    return `<div class="li"><div><div class="tt">${esc(d.data.name)}</div><div class="ss">متبقي ${money(d.data.remaining)} من ${money(d.data.total)}${d.data.monthly?` · قسط ${money(d.data.monthly)}`:''}</div><div style="margin-top:6px">${pb(pct(paid,d.data.total),'var(--ok)')}</div></div><div class="aa">${ab('pay:'+d.id,'تسجيل دفعة','gold')}${ab('editDebt:'+d.id,'✎')}</div></div>`}).join(''):emptyBox('لا توجد ديون مسجلة.')}</div>
  <div class="panel"><div class="ph"><h2>حركات الشهر</h2><div class="chips" style="margin:0">${[['all','الكل'],['out','مصروفات'],['in','دخل']].map(([k,l])=>`<button class="chip" data-act="ft:${k}" aria-pressed="${FT===k}">${l}</button>`).join('')}</div></div>
   ${list.length?list.map(x=>li(`${esc(x.data.category)}${x.data.note?` <span style="color:var(--mute);font-weight:400">· ${esc(x.data.note)}</span>`:''}`,fmtD(x.data.date),
     `<b class="amt" style="color:${x.data.type==='in'?'var(--ok)':'var(--ink)'}">${x.data.type==='in'?'+':'−'}${fmt(x.data.amount)}</b>${ab('editTx:'+x.id,'✎')}`)).join(''):emptyBox('لا توجد حركات في هذا الشهر.')}</div>`;
 const typeSel=$('tt'),catSel=$('tc');
 typeSel.onchange=()=>{catSel.innerHTML=catsFor(typeSel.value).map(c=>`<option>${esc(c)}</option>`).join('')};
 el.onsubmit=async e=>{
  if(e.target.id!=='txForm')return;e.preventDefault();
  const amount=num($('ta').value);if(amount==null||amount<=0){toast('أدخل مبلغاً صحيحاً',true);$('ta').focus();return}
  await guard(async()=>{
   const date=$('td').value||todayS();
   await addItem('finance','txn',{type:$('tt').value,amount,category:$('tc').value,date,note:$('tn').value.trim()});
   if(monthOf(date)!==FM) FM=monthOf(date);
   renderFinance(el);toast('انحفظت الحركة');
  });
 };
 el.onclick=async e=>{
  const a=actOf(e);if(!a)return;
  const [act,id]=a.split(':');
  if(act==='pm'){FM=addMonths(FM,-1);return renderFinance(el)}
  if(act==='nm'){FM=addMonths(FM,1);return renderFinance(el)}
  if(act==='ft'){FT=id;return renderFinance(el)}
  await guard(async()=>{
   const ex=id?ITEMS.find(i=>i.id===id):null;
   if(act==='editTx'){
    const r=await openForm({title:'تعديل حركة',values:ex.data,del:true,fields:[
     {k:'type',l:'النوع',t:'select',o:[['out','مصروف'],['in','دخل']]},{k:'amount',l:'المبلغ',t:'number',req:1},
     {k:'category',l:'التصنيف',t:'select',o:[...EXPC,...INCC].map(c=>[c,c])},{k:'date',l:'التاريخ',t:'date',req:1},{k:'note',l:'ملاحظة',full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveItem(ex,Object.assign({},ex.data,r));
   }
   if(act==='addBudget'||act==='editBudget'){
    const r=await openForm({title:'ميزانية شهرية',values:ex?ex.data:{},del:!!ex,fields:[
     {k:'cat',l:'التصنيف',t:'select',o:EXPC.map(c=>[c,c])},{k:'limit',l:`الحد الشهري (${CUR})`,t:'number',req:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex);
    else{const cur=ex||budgets.find(b=>b.data.cat===r.cat);await saveOrAdd(cur,'finance','budget',r)}
   }
   if(act==='addBill'||act==='editBill'){
    const r=await openForm({title:ex?'تعديل فاتورة':'فاتورة شهرية',values:ex?ex.data:{day:1,active:true,category:'فواتير'},del:!!ex,fields:[
     {k:'name',l:'الاسم',req:1},{k:'amount',l:`المبلغ (${CUR})`,t:'number',req:1},
     {k:'day',l:'يوم الاستحقاق (1-31)',t:'number',req:1},{k:'category',l:'التصنيف',t:'select',o:EXPC.map(c=>[c,c])},
     {k:'active',l:'فعّالة',t:'check'}]});
    if(!r)return;
    r.day=Math.min(31,Math.max(1,Math.round(r.day)));
    if(r.__del) await removeItem(ex); else await saveOrAdd(ex,'finance','bill',Object.assign({},ex?ex.data:{},r));
   }
   if(act==='bill') await markBill(ex,FM);
   if(act==='addDebt'||act==='editDebt'){
    const r=await openForm({title:ex?'تعديل دين':'دين جديد',values:ex?ex.data:{},del:!!ex,fields:[
     {k:'name',l:'الاسم',req:1,full:1},{k:'total',l:'المبلغ الكلي',t:'number',req:1},{k:'remaining',l:'المتبقي',t:'number',req:1},
     {k:'monthly',l:'القسط الشهري',t:'number'},{k:'day',l:'يوم القسط',t:'number'},{k:'notes',l:'ملاحظات',t:'textarea',full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveOrAdd(ex,'finance','debt',r);
   }
   if(act==='pay'){
    const r=await openForm({title:'تسجيل دفعة: '+ex.data.name,values:{amount:ex.data.monthly||'',asTx:true},fields:[
     {k:'amount',l:`المبلغ (${CUR})`,t:'number',req:1},{k:'asTx',l:'سجّلها كمصروف هذا الشهر',t:'check',full:1}]});
    if(!r)return;
    await saveItem(ex,Object.assign({},ex.data,{remaining:Math.max(0,(ex.data.remaining||0)-r.amount)}));
    if(r.asTx) await addItem('finance','txn',{type:'out',amount:r.amount,category:'فواتير',date:todayS(),note:'دفعة: '+ex.data.name});
   }
   renderFinance(el);
  });
 };
}
registerTab({id:'finance',order:5,title:'المالية',render:renderFinance});

/* ====================== الأهداف والاستثمارات ====================== */
const GCATS=['مالي','صحي','مهني','تعلّم','عائلي','ديني','شخصي'];
const ITYPES=['أسهم','صناديق استثمار','عقار','ذهب ومعادن','عملات رقمية','مشروع أو شراكة','ادخار أو وديعة','أخرى'];
let GSUB='goals';
function goalInfo(g){
 const t=g.data.target||0,c=g.data.current||0,done=t>0&&c>=t;
 let sub=[];
 if(g.data.deadline&&!done){
  const dl=daysBetween(todayS(),g.data.deadline);
  sub.push(dl>=0?`باقي ${dl} يوم`:`تأخر ${-dl} يوم`);
  if(dl>0){const months=Math.max(1,dl/30);sub.push(`المطلوب شهرياً ${fmt((t-c)/months)} ${g.data.unit||''}`)}
 }
 return {t,c,done,sub};
}
function renderGoals(el){
 const goals=ofKind('goal').slice().sort((a,b)=>{
  const ia=goalInfo(a),ib=goalInfo(b);if(ia.done!==ib.done)return ia.done?1:-1;
  return (a.data.deadline||'9999')<(b.data.deadline||'9999')?-1:1;
 });
 const inv=ofKind('invest'),invested=sum(inv,i=>i.data.invested),value=sum(inv,i=>i.data.value??i.data.invested),pl=value-invested;
 const byType={};inv.forEach(i=>{byType[i.data.type]=(byType[i.data.type]||0)+(+(i.data.value??i.data.invested)||0)});
 const types=Object.keys(byType).sort((a,b)=>byType[b]-byType[a]),maxT=Math.max(1,...Object.values(byType));
 const act=goals.filter(g=>!goalInfo(g).done),dn=goals.length-act.length;
 el.innerHTML=`
  <div class="chips"><button class="chip" data-act="sub:goals" aria-pressed="${GSUB==='goals'}">الأهداف</button><button class="chip" data-act="sub:invest" aria-pressed="${GSUB==='invest'}">الاستثمارات</button></div>
  ${GSUB==='goals'?`
   <div class="stats">${statCard('أهداف جارية',fmt(act.length),'','info')}${statCard('أهداف محققة',fmt(dn),'','ok')}
    ${statCard('متوسط التقدم',act.length?Math.round(sum(act,g=>pct(g.data.current||0,g.data.target||0))/act.length)+'%':'—','','gold')}</div>
   <div class="panel"><div class="ph"><h2>أهدافي</h2>${ab('addGoal','+ هدف','gold')}</div>
    ${goals.length?goals.map(g=>{const f=goalInfo(g),p=pct(f.c,f.t);
     return `<div class="li"><div><div class="tt">${esc(g.data.title)} <span class="tag">${esc(g.data.cat||'')}</span>${f.done?' <span class="tag ok">تحقق</span>':''}</div>
      <div class="ss num">${fmt(f.c)} من ${fmt(f.t)} ${esc(g.data.unit||'')} · ${Math.round(p)}%${f.sub.length?' · '+esc(f.sub.join(' · ')):''}</div><div style="margin-top:6px">${pb(p,f.done?'var(--ok)':'')}</div></div>
      <div class="aa">${ab('upd:'+g.id,'تحديث التقدم','gold')}${ab('editGoal:'+g.id,'✎')}</div></div>`}).join(''):emptyBox('أضف أول هدف: ادخار مبلغ، قراءة كتب، خسارة وزن، حفظ جزء...')}</div>`
  :`
   <div class="sec-note">سجل استثماراتك للمتابعة فقط. لا تدخل أرقام حسابات أو بيانات دخول لمنصات التداول.</div>
   <div class="stats">${statCard('إجمالي المستثمر',money(invested),'','gold')}${statCard('القيمة الحالية',money(value),'','info')}
    ${statCard('الربح/الخسارة',money(pl),invested>0?`<span class="${pl>=0?'up':'dn'}">${pl>=0?'▲':'▼'} ${Math.abs(pl/invested*100).toFixed(1)}%</span>`:'',pl>=0?'ok':'bad')}</div>
   <div class="two">
    <div class="panel"><h2>توزيع المحفظة</h2>${types.length?types.map(t=>`<div class="brow"><span>${esc(t)}</span><div>${pb(pct(byType[t],maxT))}</div><span class="num" style="font-size:13px;color:var(--mute)">${value>0?Math.round(byType[t]/value*100):0}%</span></div>`).join(''):emptyBox('لا توجد استثمارات.')}</div>
    <div class="panel"><div class="ph"><h2>الاستثمارات</h2>${ab('addInv','+ استثمار','gold')}</div>
     ${inv.length?inv.map(i=>{const v=i.data.value??i.data.invested,p=v-(i.data.invested||0);
      return li(`${esc(i.data.name)} <span class="tag">${esc(i.data.type||'')}</span>`,`${money(i.data.invested)} ← ${money(v)}`,
       `<span class="tag amt ${p>=0?'ok':'bad'}">${p>=0?'+':'−'}${fmt(Math.abs(p))}</span>${ab('val:'+i.id,'تحديث القيمة','gold')}${ab('editInv:'+i.id,'✎')}`)}).join(''):emptyBox('أضف استثماراتك لتتابع قيمتها.')}</div>
   </div>`}`;
 el.onclick=async e=>{
  const a=actOf(e);if(!a)return;
  const [act,id]=a.split(':');
  if(act==='sub'){GSUB=id;return renderGoals(el)}
  await guard(async()=>{
   const ex=id?ITEMS.find(i=>i.id===id):null;
   if(act==='addGoal'||act==='editGoal'){
    const r=await openForm({title:ex?'تعديل هدف':'هدف جديد',values:ex?ex.data:{unit:CUR,cat:'مالي',current:0},del:!!ex,fields:[
     {k:'title',l:'الهدف',req:1,full:1},{k:'cat',l:'التصنيف',t:'select',o:GCATS.map(c=>[c,c])},{k:'unit',l:'الوحدة (ريال، كتاب، كجم...)'},
     {k:'target',l:'القيمة المستهدفة',t:'number',req:1},{k:'current',l:'التقدم الحالي',t:'number'},
     {k:'deadline',l:'الموعد النهائي',t:'date'},{k:'notes',l:'ملاحظات',t:'textarea',full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveOrAdd(ex,'goals','goal',Object.assign({},r,{current:r.current||0}));
   }
   if(act==='upd'){
    const r=await openForm({title:'تحديث: '+ex.data.title,values:{current:ex.data.current||0},fields:[{k:'current',l:`التقدم الحالي (${ex.data.unit||''})`,t:'number',req:1,full:1}]});
    if(!r)return;await saveItem(ex,Object.assign({},ex.data,{current:r.current}));
    if(r.current>=ex.data.target) toast('ما شاء الله، تحقق الهدف');
   }
   if(act==='addInv'||act==='editInv'){
    const r=await openForm({title:ex?'تعديل استثمار':'استثمار جديد',values:ex?ex.data:{type:ITYPES[0],date:todayS()},del:!!ex,fields:[
     {k:'name',l:'الاسم',req:1,full:1},{k:'type',l:'النوع',t:'select',o:ITYPES.map(c=>[c,c])},{k:'date',l:'تاريخ الدخول',t:'date'},
     {k:'invested',l:`المبلغ المستثمر (${CUR})`,t:'number',req:1},{k:'value',l:`القيمة الحالية (${CUR})`,t:'number'},{k:'notes',l:'ملاحظات',t:'textarea',full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex);
    else{
     const hist=(ex&&ex.data.history)||[];
     if(r.value!=null&&(!ex||ex.data.value!==r.value)) hist.push({d:todayS(),v:r.value});
     await saveOrAdd(ex,'goals','invest',Object.assign({},r,{history:hist}));
    }
   }
   if(act==='val'){
    const r=await openForm({title:'تحديث قيمة: '+ex.data.name,values:{value:ex.data.value??ex.data.invested},fields:[{k:'value',l:`القيمة الحالية (${CUR})`,t:'number',req:1,full:1}]});
    if(!r)return;
    const hist=(ex.data.history||[]).concat([{d:todayS(),v:r.value}]);
    await saveItem(ex,Object.assign({},ex.data,{value:r.value,history:hist}));
   }
   renderGoals(el);
  });
 };
}
registerTab({id:'goals',order:6,title:'الأهداف والاستثمارات',render:renderGoals});

/* ====================== النشاط والعادات ====================== */
const ATYPES=['مشي','جري','نادي وأثقال','سباحة','دراجة','كرة','رياضة أخرى'];
const acts=()=>ofKind('act');
function actStreak(){
 const days=new Set(acts().map(a=>a.data.date));
 let d=days.has(todayS())?todayS():addDays(todayS(),-1),n=0;
 while(days.has(d)){n++;d=addDays(d,-1)}return n;
}
function weekMinutes(ws){const we=addDays(ws,6);return sum(acts().filter(a=>a.data.date>=ws&&a.data.date<=we),a=>a.data.minutes)}
function renderActivity(el){
 const st=settings(),ws=weekStart(),wm=weekMinutes(ws),all=acts();
 const wsess=all.filter(a=>a.data.date>=ws&&a.data.date<=addDays(ws,6)).length;
 const last30=all.filter(a=>a.data.date>=addDays(todayS(),-29));
 const byType={};last30.forEach(a=>{byType[a.data.type]=(byType[a.data.type]||0)+(+a.data.minutes||0)});
 const types=Object.keys(byType).sort((a,b)=>byType[b]-byType[a]),maxT=Math.max(1,...Object.values(byType));
 const weeks=[];for(let i=7;i>=0;i--)weeks.push(addDays(ws,-7*i));
 const wvals=weeks.map(weekMinutes),maxW=Math.max(st.weekMin,...wvals,1);
 const habits=ofKind('habit');
 const recent=all.slice().sort((a,b)=>a.data.date<b.data.date?1:-1).slice(0,12);
 el.innerHTML=`
  <div class="stats">
   ${statCard('دقائق هذا الأسبوع',`${fmt(wm)} <small>من ${fmt(st.weekMin)}</small>`,pb(pct(wm,st.weekMin),wm>=st.weekMin?'var(--ok)':''),wm>=st.weekMin?'ok':'info')}
   ${statCard('أيام متتالية',fmt(actStreak()),'<span>أيام فيها نشاط</span>','gold')}
   ${statCard('جلسات الأسبوع',fmt(wsess),'','info')}
   ${statCard('آخر 30 يوماً',`${fmt(sum(last30,a=>a.data.minutes))} <small>دقيقة</small>`,'','')}
  </div>
  <form class="panel" id="acForm"><div class="ph"><h2>تسجيل نشاط</h2>${ab('target','الهدف الأسبوعي: '+st.weekMin+' دقيقة')}</div><div class="irow">
   <div><label>النوع</label><select id="at">${ATYPES.map(t=>`<option>${esc(t)}</option>`).join('')}</select></div>
   <div><label>المدة (دقيقة)</label><input id="am" inputmode="numeric" placeholder="30" autocomplete="off"></div>
   <div><label>المسافة (كم) اختياري</label><input id="ak" inputmode="decimal" placeholder="" autocomplete="off"></div>
   <div><label>التاريخ</label><input id="ad" type="date" value="${todayS()}"></div>
   <div><button class="btn gold" style="width:100%;padding:10px" type="submit">إضافة</button></div></div></form>
  <div class="two">
   <div class="panel"><h2>آخر 8 أسابيع (دقائق)</h2>${weeks.map((w,i)=>`<div class="brow"><span>${fmtD(w)}</span><div>${pb(pct(wvals[i],maxW),wvals[i]>=st.weekMin?'var(--ok)':'')}</div><span class="num" style="font-size:13px;color:var(--mute)">${fmt(wvals[i])}</span></div>`).join('')}</div>
   <div class="panel"><h2>أنواع النشاط (30 يوماً)</h2>${types.length?types.map(t=>`<div class="brow"><span>${esc(t)}</span><div>${pb(pct(byType[t],maxT))}</div><span class="num" style="font-size:13px;color:var(--mute)">${fmt(byType[t])}</span></div>`).join(''):emptyBox('سجل أول نشاط.')}</div>
  </div>
  <div class="panel"><div class="ph"><div><h2>العادات اليومية</h2><p class="hint" style="margin:0">${habits.length} عادات، ${habits.filter(h=>(h.data.days||{})[todayS()]).length} منها اليوم.</p></div><button class="btn sm gold" data-go="habits">افتح متتبع العادات</button></div></div>
  <div class="panel"><h2>آخر الجلسات</h2>${recent.length?recent.map(a=>li(`${esc(a.data.type)} · ${fmt(a.data.minutes)} دقيقة${a.data.km?` · ${a.data.km} كم`:''}`,fmtDY(a.data.date),ab('editAct:'+a.id,'✎'))).join(''):emptyBox('لا توجد جلسات بعد.')}</div>`;
 el.onsubmit=async e=>{
  if(e.target.id!=='acForm')return;e.preventDefault();
  const m=num($('am').value);if(m==null||m<=0){toast('أدخل مدة صحيحة بالدقائق',true);$('am').focus();return}
  await guard(async()=>{await addItem('activity','act',{type:$('at').value,minutes:m,km:num($('ak').value),date:$('ad').value||todayS()});renderActivity(el);toast('انحفظ النشاط')});
 };
 el.onclick=async e=>{
  const a=actOf(e);if(!a)return;
  const parts=a.split(':'),act=parts[0],id=parts[1];
  await guard(async()=>{
   const ex=id?ITEMS.find(i=>i.id===id):null;
   if(act==='target'){
    const r=await openForm({title:'الهدف الأسبوعي',values:{weekMin:st.weekMin},fields:[{k:'weekMin',l:'دقائق النشاط في الأسبوع (الموصى به حوالي 150)',t:'number',req:1,full:1}]});
    if(!r)return;await saveSettings({weekMin:Math.max(1,r.weekMin)});
   }
   if(act==='editAct'){
    const r=await openForm({title:'تعديل نشاط',values:ex.data,del:true,fields:[
     {k:'type',l:'النوع',t:'select',o:ATYPES.map(t=>[t,t])},{k:'minutes',l:'المدة (دقيقة)',t:'number',req:1},{k:'km',l:'المسافة (كم)',t:'number'},{k:'date',l:'التاريخ',t:'date',req:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveItem(ex,Object.assign({},ex.data,r));
   }
   renderActivity(el);
  });
 };
}
registerTab({id:'activity',order:7,title:'النشاط',render:renderActivity});
