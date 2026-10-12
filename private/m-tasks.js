'use strict';
/* ====== الشركات (للمهام ولوحة الأرقام) ====== */
const COMP={
 venues:{n:'نوكس فينيوز',lead:'الليدز المؤهلة',t:{lead:37,cpl:250,resp:90}},
 noqoosh:{n:'نقوش',lead:'الاستفسارات المؤهلة',t:{lead:14,cpl:150,resp:90}},
 rahi:{n:'راهي',lead:'الليدز المؤهلة',t:{lead:8,cpl:300,resp:90}},
 events:{n:'نوكس للفعاليات',lead:'الفرص الجديدة',t:{lead:1,cpl:0,resp:90}},
 creative:{n:'كرييتف هاوس',lead:'طلبات الأجنحة',t:{lead:3,cpl:350,resp:90}},
 group:{n:'المجموعة',lead:'اجتماعات الحسابات',t:{lead:2,cpl:0,resp:90}}
};
const TASKCO=Object.assign({},Object.fromEntries(Object.entries(COMP).map(([k,v])=>[k,v.n])),
 {personal:'شخصي',family:'العائلة',finance:'المالية',knowledge:'المعرفة والقرآن'});

/* ====== المهام ====== */
let TASKS=[],TFILTER='today',TCO='all';
async function loadTasks(){TASKS=await apiAll('tasks?select=*&order=created_at.desc')||[]}
registerLoader(loadTasks);
const PRI={high:0,normal:1,low:2};
function bucketOf(t){
 const td=todayS(),wk=addDays(td,7);
 return {
  today:t.status!=='done'&&!!t.due&&t.due<=td,
  week:t.status!=='done'&&!!t.due&&t.due>td&&t.due<=wk,
  waiting:t.status==='waiting',
  nodate:t.status==='todo'&&!t.due,
  all:t.status!=='done',
  done:t.status==='done'
 };
}
function sortTasks(a,b){
 if(a.status==='done'&&b.status==='done') return (b.done_at||'').localeCompare(a.done_at||'');
 const pa=PRI[a.priority]??1,pb2=PRI[b.priority]??1;
 if(pa!==pb2) return pa-pb2;
 if(a.due&&b.due&&a.due!==b.due) return a.due<b.due?-1:1;
 if(a.due&&!b.due) return -1;if(!a.due&&b.due) return 1;
 return (b.created_at||'').localeCompare(a.created_at||'');
}
function dueInfo(d){
 const td=todayS();
 if(d===td) return {txt:'اليوم',cls:'today'};
 if(d===addDays(td,1)) return {txt:'غداً',cls:''};
 if(d<td){const n=daysBetween(d,td);return {txt:`متأخرة ${n} ${n===1?'يوم':'أيام'}`,cls:'over'}}
 return {txt:fmtD(d),cls:''};
}
function taskRow(t){
 const d=t.due?dueInfo(t.due):null;
 return `<li class="task ${t.status==='done'?'done':''}" data-id="${esc(t.id)}">
  <button class="chk" data-a="toggle" aria-pressed="${t.status==='done'}" aria-label="إنجاز المهمة"></button>
  <div><div class="ttl">${esc(t.title)}</div>
   <div class="tmeta"><span class="tag">${esc(TASKCO[t.company]||t.company)}</span>${d?`<span class="due ${d.cls}">${esc(d.txt)}</span>`:''}${t.status==='waiting'?'<span class="tag warn">بانتظار رد</span>':''}</div></div>
  <span class="pri p-${esc(t.priority)}" title="الأولوية"></span>
  <div class="acts"><button data-a="wait">${t.status==='waiting'?'استئناف':'بانتظار رد'}</button><button data-a="edit">تعديل</button><button data-a="del">حذف</button></div>
 </li>`;
}
async function taskAction(e,after){
 const btn=e.target.closest('[data-a]');if(!btn)return false;
 const li=btn.closest('.task');if(!li)return false;
 const t=TASKS.find(x=>x.id===li.dataset.id);if(!t)return true;
 const a=btn.dataset.a;
 await guard(async()=>{
  const patch=async body=>{const [u]=await api('tasks?id=eq.'+encodeURIComponent(t.id),{method:'PATCH',prefer:'return=representation',body});Object.assign(t,u)};
  if(a==='toggle'){const done=t.status!=='done';await patch({status:done?'done':'todo',done_at:done?new Date().toISOString():null})}
  else if(a==='wait') await patch({status:t.status==='waiting'?'todo':'waiting'});
  else if(a==='edit'){
   const r=await openForm({title:'تعديل المهمة',values:{title:t.title,company:t.company,priority:t.priority,due:t.due||''},del:true,fields:[
    {k:'title',l:'المهمة',req:1,full:1},
    {k:'company',l:'القسم',t:'select',o:Object.entries(TASKCO)},
    {k:'priority',l:'الأولوية',t:'select',o:[['high','عالية'],['normal','عادية'],['low','منخفضة']]},
    {k:'due',l:'الموعد',t:'date'}]});
   if(!r) return;
   if(r.__del){await api('tasks?id=eq.'+encodeURIComponent(t.id),{method:'DELETE'});TASKS=TASKS.filter(x=>x.id!==t.id)}
   else await patch({title:r.title.slice(0,300),company:r.company,priority:r.priority,due:r.due||null});
  }else if(a==='del'){
   if(!confirm('حذف هذه المهمة؟')) return;
   await api('tasks?id=eq.'+encodeURIComponent(t.id),{method:'DELETE'});TASKS=TASKS.filter(x=>x.id!==t.id);
  }
  after();
 });
 return true;
}
async function addTask(body){
 const [row]=await api('tasks',{method:'POST',prefer:'return=representation',body:Object.assign({user_id:S.user.id},body)});
 TASKS.unshift(row);return row;
}
const CHIPS=[['today','اليوم'],['week','هذا الأسبوع'],['waiting','بانتظار رد'],['nodate','بدون موعد'],['all','الكل'],['done','منتهية']];
function renderTasks(el){
 const base=TASKS.filter(t=>TCO==='all'||t.company===TCO);
 const counts={};CHIPS.forEach(([k])=>counts[k]=0);
 base.forEach(t=>{const b=bucketOf(t);CHIPS.forEach(([k])=>{if(b[k])counts[k]++})});
 let rows=base.filter(t=>bucketOf(t)[TFILTER]).sort(sortTasks);
 if(TFILTER==='done') rows=rows.slice(0,40);
 let lastCo='personal';try{lastCo=localStorage.getItem('hamad-lastco')||'personal'}catch(e){}
 if(!TASKCO[lastCo]) lastCo='personal';
 el.innerHTML=`
  <form class="panel" id="addForm"><div class="irow">
   <div class="full"><label for="nt">مهمة جديدة</label><input id="nt" placeholder="وش تبي تنجز؟" maxlength="300" autocomplete="off"></div>
   <div><label for="nc">القسم</label><select id="nc">${Object.entries(TASKCO).map(([k,v])=>`<option value="${k}" ${k===lastCo?'selected':''}>${esc(v)}</option>`).join('')}</select></div>
   <div><label for="np">الأولوية</label><select id="np"><option value="high">عالية</option><option value="normal" selected>عادية</option><option value="low">منخفضة</option></select></div>
   <div><label for="nd">الموعد</label><input id="nd" type="date"></div>
   <div><button class="btn gold" type="submit" style="width:100%;padding:10px">إضافة</button></div>
  </div></form>
  <div class="ph"><div class="chips" id="tchips" style="margin:0">${CHIPS.map(([k,l])=>`<button class="chip" data-f="${k}" aria-pressed="${TFILTER===k}">${l}<i>${counts[k]}</i></button>`).join('')}</div>
   <select id="tco" style="width:auto" aria-label="تصفية حسب القسم"><option value="all">كل الأقسام</option>${Object.entries(TASKCO).map(([k,v])=>`<option value="${k}" ${TCO===k?'selected':''}>${esc(v)}</option>`).join('')}</select></div>
  <ul class="tasks" id="tlist">${rows.length?rows.map(taskRow).join(''):`<li class="empty">${TFILTER==='today'?'ما عندك مهام لليوم. أضف مهمة فوق.':'لا يوجد شيء هنا.'}</li>`}</ul>`;
 el.onsubmit=async e=>{
  if(e.target.id!=='addForm')return;e.preventDefault();
  const title=$('nt').value.trim();if(!title){$('nt').focus();return}
  await guard(async()=>{
   const body={title:title.slice(0,300),company:$('nc').value,priority:$('np').value,due:$('nd').value||null};
   const row=await addTask(body);
   try{localStorage.setItem('hamad-lastco',body.company)}catch(e2){}
   TCO='all';
   if(!bucketOf(row)[TFILTER]) TFILTER=row.due?(row.due<=todayS()?'today':'week'):'nodate';
   renderTasks(el);toast('انضافت المهمة');$('nt').focus();
  });
 };
 el.onchange=e=>{if(e.target.id==='tco'){TCO=e.target.value;renderTasks(el)}};
 el.onclick=async e=>{
  const c=e.target.closest('#tchips .chip');if(c){TFILTER=c.dataset.f;renderTasks(el);return}
  await taskAction(e,()=>renderTasks(el));
 };
}
registerTab({id:'tasks',order:2,title:'المهام',render:renderTasks});

/* ====== لوحة الأرقام الأربعة (تُحفظ في kv) ====== */
let CUR_CO='venues',WEEK=weekStart();
const wkey=(co,w)=>`w|${co}|${w}`;
const rec=(co,w)=>KV[wkey(co,w)]||{};
const targetsOf=co=>Object.assign({},COMP[co].t,(KV.targets||{})[co]||{});
async function setRec(co,w,patch){
 return !!(await guard(async()=>{await saveKV(wkey(co,w),Object.assign({},rec(co,w),patch));toast('حُفظ');return true}));
}
const cplOf=r=>{const l=num(r.lead),s=num(r.spend);return(l&&s!=null)?s/l:null};
function statusOf(co){
 const r=rec(co,WEEK),t=targetsOf(co),l=num(r.lead);if(l==null)return'none';
 let bad=0,warn=0;
 if(l<t.lead*.8)bad++;else if(l<t.lead)warn++;
 const cp=cplOf(r);if(cp!=null&&t.cpl){if(cp>t.cpl*1.2)bad++;else if(cp>t.cpl)warn++}
 const rs=num(r.resp);if(rs!=null){if(rs<t.resp*.8)bad++;else if(rs<t.resp)warn++}
 return bad?'bad':(warn?'warn':'ok');
}
const DOT={ok:'var(--ok)',warn:'var(--warn)',bad:'var(--bad)',none:'var(--line)'};
function delta(cur,prev,lowerBetter){
 if(cur==null||prev==null||prev===0)return'<span>—</span>';
 const p=(cur-prev)/prev*100,good=lowerBetter?p<0:p>0,flat=Math.abs(p)<2;
 return `<span class="${flat?'':(good?'up':'dn')}">${p>0?'▲':'▼'} ${Math.abs(p).toFixed(0)}%</span>`;
}
function renderBoard(el){
 const c=COMP[CUR_CO],t=targetsOf(CUR_CO),r=rec(CUR_CO,WEEK),pr=rec(CUR_CO,addDays(WEEK,-7));
 const cp=cplOf(r),pcp=cplOf(pr),resp=num(r.resp),lead=num(r.lead);
 const ins=[1,2,3].map(i=>r['is'+i]).filter(Boolean);
 const bad=ins.filter(s=>s==='r').length,warn=ins.filter(s=>s==='y').length;
 const ist=!ins.length?'':(bad?'bad':(warn?'warn':'ok'));
 const cards=[
  {lb:c.lead,v:fmt(lead),u:'',cls:lead==null?'':(lead>=t.lead?'ok':(lead>=t.lead*.8?'warn':'bad')),m:[`المستهدف ${t.lead}`,delta(lead,num(pr.lead))]},
  {lb:'تكلفة الليد',v:cp==null?'—':fmt(cp),u:'ريال',cls:(cp==null||!t.cpl)?'':(cp<=t.cpl?'ok':(cp<=t.cpl*1.2?'warn':'bad')),m:[t.cpl?`المستهدف ${t.cpl} فأقل`:'بلا مستهدف',delta(cp,pcp,true)]},
  {lb:'الرد خلال ساعتين',v:resp==null?'—':fmt(resp),u:'%',cls:resp==null?'':(resp>=t.resp?'ok':(resp>=t.resp*.8?'warn':'bad')),m:[`المستهدف ${t.resp}%`,delta(resp,num(pr.resp))]},
  {lb:'حالة المبادرات',v:ins.length?`${ins.filter(s=>s==='g').length}/${ins.length}`:'—',u:'تسير',cls:ist,m:[bad?`${bad} متوقفة`:'',warn?`${warn} فيها عائق`:''].filter(Boolean)}
 ];
 const weeks=[];for(let i=0;i<8;i++)weeks.push(addDays(WEEK,-7*i));
 el.innerHTML=`
  <div class="chips">${Object.entries(COMP).map(([k,v])=>`<button class="chip" data-co="${k}" aria-pressed="${k===CUR_CO}"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${DOT[statusOf(k)]};margin-left:7px"></span>${esc(v.n)}</button>`).join('')}</div>
  <div class="ph" style="justify-content:flex-start"><button class="btn sm" id="prevW">◀ السابق</button><b id="wlab">أسبوع ${fmtD(WEEK)} – ${fmtD(addDays(WEEK,6))}</b><button class="btn sm" id="nextW">التالي ▶</button></div>
  <div class="kpis">${cards.map(k=>`<div class="stat ${k.cls}"><span class="lb">${esc(k.lb)}</span><div class="v num">${k.v} ${k.u?`<small>${k.u}</small>`:''}</div><div class="m">${k.m.map(x=>x.startsWith('<')?x:`<span>${esc(x)}</span>`).join('')}</div></div>`).join('')}</div>
  <div class="panel"><h2>أرقام الأسبوع</h2><p class="hint">تعبئها الخميس وتقرأها الأحد.</p><div class="grid4">
   <div><label>${esc(c.lead)} هذا الأسبوع</label><input class="num" inputmode="numeric" data-f="lead" value="${esc(r.lead??'')}"></div>
   <div><label>الإنفاق الإعلاني (ريال)</label><input class="num" inputmode="numeric" data-f="spend" value="${esc(r.spend??'')}"></div>
   <div><label>نسبة الرد خلال ساعتين (%)</label><input class="num" inputmode="numeric" data-f="resp" value="${esc(r.resp??'')}"></div>
   <div><label>صفقات أو حجوزات أُغلقت</label><input class="num" inputmode="numeric" data-f="deals" value="${esc(r.deals??'')}"></div></div></div>
  <div class="panel"><h2>أهم ثلاث مبادرات</h2><p class="hint">أخضر يسير، أصفر فيه عائق، أحمر متوقف.</p>${[1,2,3].map(i=>`<div class="init"><input data-f="in${i}" placeholder="المبادرة ${i}" value="${esc(r['in'+i]||'')}">
   <div class="sv" data-i="${i}"><button class="g" data-s="g" aria-pressed="${r['is'+i]==='g'}">يسير</button><button class="y" data-s="y" aria-pressed="${r['is'+i]==='y'}">عائق</button><button class="r" data-s="r" aria-pressed="${r['is'+i]==='r'}">متوقف</button></div></div>`).join('')}</div>
  <div class="panel"><h2>إغلاق الأسبوع</h2><div class="notes">
   <div><label>ما الذي تحرك</label><textarea data-f="n1">${esc(r.n1||'')}</textarea></div>
   <div><label>العائق الأكبر</label><textarea data-f="n2">${esc(r.n2||'')}</textarea></div>
   <div><label>قرار الأسبوع القادم</label><textarea data-f="n3">${esc(r.n3||'')}</textarea></div></div></div>
  <div class="panel"><h2>آخر 8 أسابيع</h2><div class="tw"><table><thead><tr><th>الأسبوع</th><th>${esc(c.lead)}</th><th>تكلفة الليد</th><th>الرد %</th><th>صفقات</th></tr></thead><tbody>${weeks.map(w=>{const rr=rec(CUR_CO,w),cc=cplOf(rr);
   return `<tr class="${w===WEEK?'cur':''}"><td>${fmtD(w)}</td><td class="num">${fmt(num(rr.lead))}</td><td class="num">${cc==null?'—':fmt(cc)}</td><td class="num">${rr.resp?esc(rr.resp)+'%':'—'}</td><td class="num">${fmt(num(rr.deals))}</td></tr>`}).join('')}</tbody></table></div></div>
  <div class="panel"><h2>المستهدفات الأسبوعية</h2><p class="hint">عدّلها لما تتغير الخطة.</p><div class="grid4">
   <div><label>مستهدف ${esc(c.lead)} أسبوعياً</label><input class="num" inputmode="numeric" data-t="lead" value="${t.lead}"></div>
   <div><label>سقف تكلفة الليد (ريال)</label><input class="num" inputmode="numeric" data-t="cpl" value="${t.cpl}"></div>
   <div><label>مستهدف الرد خلال ساعتين (%)</label><input class="num" inputmode="numeric" data-t="resp" value="${t.resp}"></div></div></div>`;
 el.onchange=async e=>{
  const x=e.target;
  if(x.dataset.f){if(await setRec(CUR_CO,WEEK,{[x.dataset.f]:x.value}))renderBoard(el)}
  else if(x.dataset.t){
   const v=num(x.value);const all=Object.assign({},KV.targets||{});
   all[CUR_CO]=Object.assign({},all[CUR_CO]||{},{[x.dataset.t]:v==null?0:v});
   await guard(async()=>{await saveKV('targets',all);toast('حُفظ')});renderBoard(el);
  }
 };
 el.onclick=async e=>{
  const co=e.target.closest('[data-co]');if(co){CUR_CO=co.dataset.co;renderBoard(el);return}
  const sv=e.target.closest('.sv button');
  if(sv){const i=sv.parentElement.dataset.i,cur=rec(CUR_CO,WEEK)['is'+i];if(await setRec(CUR_CO,WEEK,{['is'+i]:cur===sv.dataset.s?'':sv.dataset.s}))renderBoard(el);return}
  if(e.target.id==='prevW'){WEEK=addDays(WEEK,-7);renderBoard(el)}
  if(e.target.id==='nextW'){WEEK=addDays(WEEK,7);renderBoard(el)}
 };
}
registerTab({id:'board',order:3,title:'الأرقام الأربعة',render:renderBoard});
