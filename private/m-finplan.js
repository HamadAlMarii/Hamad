'use strict';
/* ====================== الخطة المالية (من ملف إكسل التقدير المالي) ======================
   الملف يُقرأ داخل المتصفح ويُحفظ في Supabase (مفتاح finplan)، ولا تُكتب أي أرقام في الكود لأن المستودع عام. */
const XLSX_SRC='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const AR_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const FP_PLAN_ROWS=['المخصصات السنوية','صندوق الطوارئ','الاستثمار','ادخار البيت','ادخار المولود','الزكاة','الصدقة','الذهب'];
const FP_GROUPS=[
 {k:'fixed',l:'المصاريف الثابتة',c:'#3987e5'},
 {k:'debt',l:'الديون والأقساط',c:'#d95926'},
 {k:'goal',l:'الأهداف',c:'#199e70'},
 {k:'plan',l:'الادخار والخطط',c:'#c98500'},
 {k:'free',l:'فائض',c:'#59636a'}
];
let FPM=null;

function loadXlsx(){
 if(window.XLSX) return Promise.resolve();
 return new Promise((ok,bad)=>{const s=document.createElement('script');s.src=XLSX_SRC;s.onload=ok;s.onerror=()=>bad(new Error('تعذر تحميل قارئ الإكسل، تأكد من الإنترنت'));document.head.appendChild(s)});
}
const cellS=v=>v==null?'':String(v).trim();
const isNum=v=>typeof v==='number'&&isFinite(v);
const secNo=s=>{const m=cellS(s).match(/^([٠-٩0-9]+)\)/);return m?num(m[1]):null};

/* المدخلات: ١) الدخل ٢) المصاريف الثابتة ٣) الأهداف */
function parseInputs(rows){
 const out={income:[],fixed:[],goals:[]},keys={1:'income',2:'fixed',3:'goals'};let cur=null;
 rows.forEach(r=>{
  const a=cellS(r[0]),n=secNo(a);
  if(n){cur=keys[n]||null;return}
  if(!cur||!a||a.startsWith('إجمالي')||a.startsWith('مثال')||!isNum(r[1])) return;
  out[cur].push({n:a,v:r[1],c:cellS(r[2])});
 });
 return out;
}
/* الخطط: أقسام مرقّمة، كل صف = بند وقيمة وملاحظة */
function parsePlans(rows){
 const secs=[];let cur=null;
 rows.forEach(r=>{
  const a=cellS(r[0]),n=secNo(a);
  if(n){cur={no:n,t:a.replace(/^[^)]*\)\s*/,''),rows:[]};secs.push(cur);return}
  if(!cur||!a||r[1]==null||r[1]==='') return;
  cur.rows.push({n:a,v:r[1],c:cellS(r[2])});
 });
 const set=rows.find(r=>cellS(r[0]).includes('تبدأ الخطط'));
 return {secs,startIdx:set&&isNum(set[1])?set[1]:1};
}
/* الخطة الشهرية: صف العناوين يبدأ بـ "الهدف"، والأشهر من العمود E */
function parseMonthly(rows,goalNames){
 const hi=rows.findIndex(r=>cellS(r[0])==='الهدف');
 if(hi<1) throw new Error('ما لقيت ورقة الخطة الشهرية بالشكل المتوقع');
 /* السنة من أول شهر في صف السنوات، وبعدها تزيد كل ما رجعنا ليناير */
 const hr=rows[hi],months=[];let y=num((rows[hi-1]||[])[4]),prev=-1;
 if(!y) throw new Error('ما لقيت سنة بداية الخطة فوق أول شهر');
 for(let c=4;c<hr.length&&cellS(hr[c]);c++){
  const mi=AR_MONTHS.indexOf(cellS(hr[c]));
  if(mi<0) throw new Error('اسم شهر غير معروف: '+cellS(hr[c]));
  if(mi<prev) y++;
  prev=mi;months.push(`${y}-${pad(mi+1)}`);
 }
 const vals=r=>months.map((_,i)=>isNum(r[4+i])?r[4+i]:(num(r[4+i])||0));
 const items=[];let income=null,extra=null;
 for(let i=hi+1;i<rows.length;i++){
  const r=rows[i],a=cellS(r[0]);if(!a) continue;
  if(a.startsWith('إجمالي الصرف')||a.startsWith('الفرق')||a==='الحالة'||a.startsWith('الرصيد')||a.startsWith('إجمالي الدخل')) continue;
  if(a.startsWith('الدخل الشهري')){income=vals(r);continue}
  if(a.startsWith('دخل إضافي')){extra=vals(r);continue}
  const kind=a==='المصاريف الثابتة'?'fixed':FP_PLAN_ROWS.some(p=>a.startsWith(p))?'plan':goalNames.has(a)?'goal':'debt';
  items.push({n:a,kind,target:isNum(r[1])?r[1]:null,vals:vals(r)});
 }
 if(!income) throw new Error('ما لقيت صف الدخل الشهري');
 return {months,items,income,extra:extra||months.map(()=>0)};
}
async function importFinPlan(file){
 await loadXlsx();
 const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
 const sheet=name=>{const k=wb.SheetNames.find(s=>s.trim()===name);if(!k) throw new Error('الملف ما فيه ورقة: '+name);return XLSX.utils.sheet_to_json(wb.Sheets[k],{header:1,raw:true,defval:null})};
 const inputs=parseInputs(sheet('المدخلات')),plans=parsePlans(sheet('الخطط'));
 const monthly=parseMonthly(sheet('الخطة الشهرية'),new Set(inputs.goals.map(g=>g.n)));
 await saveKV('finplan',Object.assign({v:1,file:file.name,at:new Date().toISOString()},inputs,plans,monthly));
}

/* ====== حسابات ====== */
function fpTotals(P){
 return P.months.map((m,i)=>{
  const g={fixed:0,debt:0,goal:0,plan:0};P.items.forEach(it=>g[it.kind]+=it.vals[i]||0);
  const spend=g.fixed+g.debt+g.goal+g.plan,inc=(P.income[i]||0)+(P.extra[i]||0);
  return Object.assign(g,{m,spend,inc,diff:inc-spend,free:Math.max(0,inc-spend)});
 });
}
const fpSec=(P,no)=>(P.secs.find(s=>s.no===no)||{rows:[]}).rows;
const fpVal=(P,no,txt)=>{const r=fpSec(P,no).find(x=>x.n.includes(txt));return r?r.v:null};
function fpFmt(r){
 if(!isNum(r.v)) return esc(r.v);
 if(/نسبة|العائد/.test(r.n)&&Math.abs(r.v)<=1) return `${+(r.v*100).toFixed(1)}%`;
 if(/جرام|الجرامات/.test(r.n)&&!/سعر/.test(r.n)) return `${r.v.toFixed(1)} جم`;
 if(/عدد|بعد كم شهر|الشهر رقم/.test(r.n)) return fmt(r.v);
 return money(r.v);
}
const paidMap=()=>KV.finpaid||{};
function itemPaid(it,P){const pm=paidMap();return sum(P.months.map((m,i)=>(pm[m]||{})[it.n]?it.vals[i]:0),x=>x)}
function lastMonth(it,P){for(let i=it.vals.length-1;i>=0;i--)if(it.vals[i]>0)return P.months[i];return null}

/* ====== الرسم: أعمدة مكدسة لكل شهر ====== */
function fpChart(P,T,sel){
 const W=820,H=250,pl=8,pr=44,pt=10,pb=34,n=T.length,slot=(W-pl-pr)/n,bw=Math.max(6,slot*.62);
 const max=Math.max(1,...T.map(t=>Math.max(t.inc,t.spend)));
 const step=max>40000?10000:5000,top=Math.ceil(max/step)*step,y=v=>pt+(H-pt-pb)*(1-v/top);
 let g='';
 for(let v=0;v<=top;v+=step) g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${W-pr+6}" y="${y(v)+4}" text-anchor="start" class="fpax">${v?fmt(v/1000)+'k':'0'}</text>`;
 /* من اليمين لليسار مثل باقي الصفحة */
 const sx=i=>W-pr-slot*(i+1);
 T.forEach((t,i)=>{
  const x=sx(i)+(slot-bw)/2;let base=0;
  const segs=FP_GROUPS.filter(G=>t[G.k]>0);
  segs.forEach((G,j)=>{
   const y0=y(base),y1=y(base+t[G.k]),h=Math.max(0,y0-y1-(j<segs.length-1?0:0)),lastSeg=j===segs.length-1,r=lastSeg?Math.min(4,bw/2,h):0;
   const gap=j>0?2:0;
   g+=lastSeg&&r>0
    ?`<path d="M${x},${y0-gap} V${y1+r} Q${x},${y1} ${x+r},${y1} H${x+bw-r} Q${x+bw},${y1} ${x+bw},${y1+r} V${y0-gap} Z" fill="${G.c}"/>`
    :`<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(0,h-gap)}" fill="${G.c}"/>`;
   base+=t[G.k];
  });
  if(t.diff<-0.5) g+=`<text x="${x+bw/2}" y="${y(t.spend)-4}" text-anchor="middle" class="fpax" fill="var(--bad)">!</text>`;
  const [yy,mm]=t.m.split('-');
  g+=`<text x="${x+bw/2}" y="${H-pb+14}" text-anchor="middle" class="fpax${t.m===sel?' on':''}">${+mm}</text>`;
  if(+mm===1||i===0) g+=`<text x="${x+bw/2}" y="${H-pb+29}" text-anchor="middle" class="fpax yr">${yy}</text>`;
  if(t.m===sel) g+=`<rect x="${sx(i)+1}" y="${pt}" width="${slot-2}" height="${H-pt-pb}" fill="none" stroke="var(--gold)" stroke-width="1.5" rx="4"/>`;
  g+=`<rect class="fphit" x="${sx(i)}" y="${pt}" width="${slot}" height="${H-pt}" fill="transparent" data-fpi="${i}" data-act="fpm:${t.m}"/>`;
 });
 return `<div class="fplegend">${FP_GROUPS.map(G=>`<span><i style="background:${G.c}"></i>${G.l}</span>`).join('')}</div>
  <div class="fpchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="توزيع الدخل على الأشهر">${g}</svg><div class="fptip" hidden></div></div>`;
}

/* ====== العرض ====== */
function renderFinPlan(el,head){
 const P=KV.finplan;
 const importBtn=`<label class="btn sm ${P?'':'gold'}" style="cursor:pointer;margin:0">${P?'تحديث من ملف الإكسل':'استيراد ملف الإكسل'}<input type="file" id="fpFile" accept=".xlsx" hidden></label>`;
 if(!P){
  el.innerHTML=`${head}<div class="panel"><h2>الخطة المالية</h2><p class="hint">ارفع ملف «تقدير مالي شهري» وتنعرض هنا خطتك: الدخل، المصاريف الثابتة، الأهداف، الديون، صندوق الطوارئ، الاستثمار، البيت، والخطة شهر بشهر.</p>${importBtn}<p class="hint" style="margin-top:12px">الملف يُقرأ داخل متصفحك ويُحفظ في حسابك فقط.</p></div>`;
  return fpBind(el);
 }
 const T=fpTotals(P),td=monthOf(todayS());
 if(!FPM||!P.months.includes(FPM)) FPM=P.months.includes(td)?td:P.months[0];
 const mi=P.months.indexOf(FPM),t=T[mi],pm=paidMap()[FPM]||{};
 const inc=P.income.slice().sort((a,b)=>a-b)[P.income.length>>1]||0;
 const fixedM=sum(P.fixed,x=>x.v),inst=fpVal(P,1,'إجمالي الأقساط'),instP=fpVal(P,1,'نسبة الأقساط'),debtsLeft=fpVal(P,1,'إجمالي الديون');
 const freeAfter=fpVal(P,8,'المتاح بعد'),status=fpVal(P,8,'الحالة');
 const monthItems=P.items.map(it=>({it,v:it.vals[mi]||0})).filter(x=>x.v>0);
 const doneAmt=sum(monthItems.filter(x=>pm[x.it.n]),x=>x.v);
 const goals=P.items.filter(i=>i.kind==='goal'),debts=P.items.filter(i=>i.kind==='debt');
 const progRow=it=>{
  const planned=sum(it.vals,x=>x),tgt=it.target||planned,left=Math.max(0,tgt-planned),paid=itemPaid(it,P),lm=lastMonth(it,P);
  return `<div class="li"><div><div class="tt">${esc(it.n)} ${left>0.5?`<span class="tag ${planned?'warn':'bad'}">${planned?'متبقي بعد الخطة '+fmt(left):'غير مجدول'}</span>`:lm?`<span class="tag ok">يكتمل ${esc(fmtM(lm))}</span>`:''}</div>
   <div class="ss">الهدف ${money(tgt)} · مجدول ${fmt(planned)} · منفّذ ${fmt(paid)}</div>
   <div class="fpdual" style="margin-top:6px"><i class="pl" style="width:${pct(planned,tgt).toFixed(1)}%"></i><i class="pd" style="width:${pct(paid,tgt).toFixed(1)}%"></i></div></div>
   <div class="aa num" style="font-size:13px;color:var(--mute)">${Math.round(pct(paid,tgt))}%</div></div>`;
 };
 const secCard=no=>{const s=P.secs.find(x=>x.no===no);if(!s) return '';
  return `<div class="panel"><h3>${esc(s.t)}</h3>${s.rows.map(r=>`<div class="fprow"><span>${esc(r.n)}${r.c?`<small>${esc(r.c)}</small>`:''}</span><b class="num">${fpFmt(r)}</b></div>`).join('')}</div>`};
 const kindL={fixed:'ثابت',debt:'دين',goal:'هدف',plan:'خطة'};

 el.innerHTML=`${head}
  <div class="ph"><p class="hint" style="margin:0">من ملف ${esc(P.file)} · ${esc(fmtDY(P.at.slice(0,10)))} · ${esc(fmtM(P.months[0]))} إلى ${esc(fmtM(P.months[P.months.length-1]))}</p>${importBtn}</div>
  <div class="stats">
   ${statCard('الدخل الشهري',money(inc),'','ok')}
   ${statCard('المصاريف الثابتة',money(fixedM),`<span>${Math.round(pct(fixedM,inc))}% من الدخل</span>`,'info')}
   ${inst!=null?statCard('الأقساط الشهرية',money(inst),instP!=null?`<span>${Math.round(instP*100)}% من الدخل</span>`:'','warn'):''}
   ${debtsLeft!=null?statCard('الديون المتبقية',money(debtsLeft),'','bad'):''}
   ${freeAfter!=null?statCard('المتاح بعد الخطط',money(freeAfter),status?`<span>${esc(status)}</span>`:'',freeAfter>=0?'ok':'bad'):''}
  </div>
  <div class="panel"><div class="ph"><div><h2>أين يروح الدخل كل شهر</h2><p class="hint" style="margin:0">اضغط أي شهر لعرض تفاصيله.</p></div></div>${fpChart(P,T,FPM)}</div>
  <div class="panel"><div class="ph">
    <div style="display:flex;gap:8px;align-items:center">${ab('fpp','‹')}<h2 style="margin:0;min-width:140px;text-align:center">${esc(fmtM(FPM))}</h2>${ab('fpn','›')}${FPM!==td&&P.months.includes(td)?ab('fpm:'+td,'الشهر الحالي'):''}</div>
    <span class="tag ${t.diff<-0.5?'bad':t.diff>0.5?'ok':''}">${t.diff<-0.5?'عجز '+fmt(-t.diff):t.diff>0.5?'فائض '+fmt(t.diff):'متوازن'}</span></div>
   <div class="three" style="margin-bottom:12px">
    <div class="stat"><span class="lb">الدخل</span><div class="v num" style="font-size:20px">${money(t.inc)}</div></div>
    <div class="stat"><span class="lb">المخطط صرفه</span><div class="v num" style="font-size:20px">${money(t.spend)}</div></div>
    <div class="stat"><span class="lb">نفّذت منه</span><div class="v num" style="font-size:20px">${money(doneAmt)}</div>${pb(pct(doneAmt,t.spend),'var(--ok)')}</div>
   </div>
   <p class="hint">أشّر على كل بند بعد ما تدفعه أو تحوّله.</p>
   ${monthItems.map(x=>`<div class="fpline"><button class="chk" data-act="fpd:${encodeURIComponent(x.it.n)}" aria-pressed="${!!pm[x.it.n]}" aria-label="تم ${esc(x.it.n)}"></button><span class="tt">${esc(x.it.n)} <span class="tag">${kindL[x.it.kind]}</span></span><b class="num">${fmt(x.v)}</b></div>`).join('')}
  </div>
  <div class="two">
   <div class="panel"><h2>الأهداف</h2><p class="hint"><span class="fpkey pl"></span>مجدول في الخطة <span class="fpkey pd"></span>منفّذ</p>${goals.map(progRow).join('')||emptyBox('لا توجد أهداف.')}</div>
   <div class="panel"><h2>الديون</h2><p class="hint"><span class="fpkey pl"></span>مجدول في الخطة <span class="fpkey pd"></span>منفّذ</p>${debts.map(progRow).join('')||emptyBox('لا توجد ديون.')}</div>
  </div>
  <div class="two">
   <div class="panel"><h3>المصاريف الثابتة الشهرية · ${money(fixedM)}</h3>${P.fixed.slice().sort((a,b)=>b.v-a.v).map(f=>`<div class="brow"><span>${esc(f.n)}</span><div>${pb(pct(f.v,Math.max(...P.fixed.map(x=>x.v))))}</div><span class="num" style="font-size:13px;color:var(--mute)">${fmt(f.v)}</span></div>`).join('')}</div>
   ${secCard(2)}
  </div>
  <div class="fpgrid">${[3,4,5,6,7].map(secCard).join('')}</div>
  <details class="panel"><summary><b>الخطة الشهرية كاملة</b> <span class="hint">جدول كل البنود على كل الأشهر</span></summary>
   <div class="tw" style="margin-top:12px"><table class="fptable"><thead><tr><th class="fpn">البند</th><th>المستهدف</th>${P.months.map(m=>`<th class="${m===FPM?'cur':''}">${esc(AR_MONTHS[+m.slice(5)-1].slice(0,3))}<br><small>${m.slice(0,4)}</small></th>`).join('')}</tr></thead>
   <tbody>${P.items.map(it=>`<tr><th class="fpn">${esc(it.n)}</th><td class="num">${it.target!=null?fmt(it.target):''}</td>${it.vals.map((v,i)=>`<td class="num${P.months[i]===FPM?' cur':''}">${v?fmt(v):''}</td>`).join('')}</tr>`).join('')}</tbody>
   <tfoot>${[['إجمالي الصرف','spend'],['الدخل','inc'],['الفرق','diff']].map(([l,k])=>`<tr><th class="fpn">${l}</th><td></td>${T.map(x=>`<td class="num${x.m===FPM?' cur':''}" ${k==='diff'&&x.diff<-0.5?'style="color:var(--bad)"':''}>${fmt(x[k])}</td>`).join('')}</tr>`).join('')}</tfoot></table></div></details>`;
 fpBind(el,P,T);
}
function fpBind(el,P,T){
 const f=el.querySelector('#fpFile');
 if(f) f.onchange=async()=>{const file=f.files[0];if(!file)return;
  await guard(async()=>{toast('جاري قراءة الملف...');await importFinPlan(file);FPM=null;rerender();toast('تم تحديث الخطة المالية')})};
 const ch=el.querySelector('.fpchart');
 if(ch&&T){
  const tip=ch.querySelector('.fptip');
  ch.onmousemove=e=>{
   const h=e.target.closest('[data-fpi]');if(!h){tip.hidden=true;return}
   const t=T[+h.dataset.fpi];
   tip.innerHTML=`<b>${esc(fmtM(t.m))}</b>${FP_GROUPS.filter(G=>t[G.k]>0).map(G=>`<div><i style="background:${G.c}"></i>${G.l}<span class="num">${fmt(t[G.k])}</span></div>`).join('')}<div class="tot">الدخل<span class="num">${fmt(t.inc)}</span></div>${t.diff<-0.5?`<div style="color:var(--bad)">عجز<span class="num">${fmt(-t.diff)}</span></div>`:''}`;
   tip.hidden=false;
   const r=ch.getBoundingClientRect(),x=e.clientX-r.left,w=tip.offsetWidth;
   tip.style.left=Math.max(0,Math.min(r.width-w,x-w/2))+'px';tip.style.top=Math.max(0,e.clientY-r.top-tip.offsetHeight-14)+'px';
  };
  ch.onmouseleave=()=>tip.hidden=true;
 }
}
/* يُستدعى من شاشة المالية عند الضغط */
async function finPlanAct(act,id){
 const P=KV.finplan;if(!P)return false;
 const i=P.months.indexOf(FPM);
 if(act==='fpp'){if(i>0)FPM=P.months[i-1];return true}
 if(act==='fpn'){if(i<P.months.length-1)FPM=P.months[i+1];return true}
 if(act==='fpm'){FPM=id;return true}
 if(act==='fpd'){
  const n=decodeURIComponent(id),all=Object.assign({},paidMap()),m=Object.assign({},all[FPM]||{});
  if(m[n]) delete m[n]; else m[n]=1;
  all[FPM]=m;await saveKV('finpaid',all);return true;
 }
 return false;
}
