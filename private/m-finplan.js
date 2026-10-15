'use strict';
/* ====================== مخطط الميزانية التفاعلي ======================
   تكتب المدخلات في الجهة الأولى، والداشبورد في الجهة الثانية يتحدث مع كل حرف.
   كل شيء يُحفظ تلقائياً في Supabase (مفتاح budget)، ولا تُكتب أي أرقام في الكود لأن المستودع عام. */
const XLSX_SRC='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const AR_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const BG_GROUPS=[
 {k:'fixed',l:'الثابتة والمخصصات',c:'#3987e5'},
 {k:'debt',l:'الديون',c:'#d95926'},
 {k:'goal',l:'الأهداف',c:'#199e70'},
 {k:'save',l:'الطوارئ والاستثمار والذهب',c:'#c98500'},
 {k:'give',l:'الصدقة',c:'#d55181'},
 {k:'free',l:'فائض',c:'#59636a'}
];
const bgDefault=()=>({v:1,start:monthOf(todayS()),months:24,
 income:[{n:'الراتب',v:null}],fixed:[],annual:[],debts:[],goals:[],
 emerg:{months:6,bal:0,monthly:null,start:''},invest:{monthly:null,ret:6,start:''},
 sadaqa:{pct:null},gold:{monthly:null,price:490,start:''}});
let BG=null,BGsel=null,bgSaveT=null,bgState='',BG_EL=null,bgRsT=null;
/* الرسم مرسوم بعرض عموده الفعلي، فنعيد رسمه إذا تغير حجم النافذة */
addEventListener('resize',()=>{clearTimeout(bgRsT);bgRsT=setTimeout(()=>{if(BG_EL&&BG_EL.isConnected&&!BG_EL.hidden&&BG_EL.querySelector('#bgDash'))bgRefreshDash(BG_EL)},200)});

/* ====== الحساب: محاكاة شهر بشهر ====== */
const n0=v=>+v||0;
const active=(start,m)=>!start||m>=start;
function simulate(B){
 const months=Array.from({length:Math.max(1,Math.min(120,n0(B.months)||1))},(_,i)=>addMonths(B.start||monthOf(todayS()),i));
 const inc=sum(B.income,x=>x.v),fixed=sum(B.fixed,x=>x.v),annualM=sum(B.annual,x=>x.v)/12;
 const inst=sum(B.debts,d=>d.monthly);
 const eTarget=(fixed+inst+annualM)*n0(B.emerg.months);
 const debtRem=B.debts.map(d=>n0(d.total)),goalSaved=B.goals.map(g=>n0(g.saved)),done={};
 let eBal=n0(B.emerg.bal),inv=0,invPaid=0,grams=0,debtPaid=0;
 const r=n0(B.invest.ret)/100/12,price=n0(B.gold.price);
 const rows=months.map(m=>{
  const row={m,inc,fixed:fixed+annualM,debt:0,goal:0,save:0,give:inc*n0(B.sadaqa.pct)/100,events:[]};
  B.debts.forEach((d,i)=>{
   if(debtRem[i]<=0||!active(d.start,m)) return;
   const p=Math.min(n0(d.monthly),debtRem[i]);debtRem[i]-=p;row.debt+=p;debtPaid+=p;
   if(debtRem[i]<=0.5&&!done['d'+i]){done['d'+i]=m;row.events.push({t:'debt',l:'سداد '+(d.n||'دين')})}
  });
  B.goals.forEach((g,i)=>{
   const tgt=n0(g.target);if(goalSaved[i]>=tgt||!active(g.start,m)) return;
   const p=Math.min(n0(g.monthly),tgt-goalSaved[i]);goalSaved[i]+=p;row.goal+=p;
   if(goalSaved[i]>=tgt-0.5&&tgt>0&&!done['g'+i]){done['g'+i]=m;row.events.push({t:'goal',l:'اكتمال '+(g.n||'هدف')})}
  });
  if(active(B.emerg.start,m)&&eBal<eTarget){
   const p=Math.min(n0(B.emerg.monthly),eTarget-eBal);eBal+=p;row.save+=p;
   if(eBal>=eTarget-0.5&&eTarget>0&&!done.e){done.e=m;row.events.push({t:'save',l:'اكتمال صندوق الطوارئ'})}
  }
  inv*=1+r;
  if(active(B.invest.start,m)){const p=n0(B.invest.monthly);inv+=p;invPaid+=p;row.save+=p}
  if(active(B.gold.start,m)){const p=n0(B.gold.monthly);row.save+=p;if(price)grams+=p/price}
  row.out=row.fixed+row.debt+row.goal+row.save+row.give;row.diff=inc-row.out;row.free=Math.max(0,row.diff);
  return row;
 });
 return {months,rows,inc,fixed,annualM,inst,eTarget,eBal,inv,invPaid,grams,debtPaid,done,
  debtRem,goalSaved,debtTotal:sum(B.debts,d=>d.total)};
}

/* ====== الرسم: أعمدة مكدسة (من اليمين لليسار) ====== */
function bgChart(R,sel,W){
 W=Math.max(280,W||600);const H=220,pl=8,pr=44,pt=10,pb=34,n=R.rows.length,slot=(W-pl-pr)/n,bw=Math.max(4,slot*.62);
 const max=Math.max(1,...R.rows.map(t=>Math.max(t.inc,t.out)));
 const step=[1000,2000,5000,10000,20000,50000,100000].find(s=>max/s<=6)||200000,top=Math.ceil(max/step)*step,y=v=>pt+(H-pt-pb)*(1-v/top);
 const sx=i=>W-pr-slot*(i+1);
 let g='';
 for(let v=0;v<=top;v+=step) g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${W-pr+6}" y="${y(v)+4}" class="fpax">${v?fmt(v/1000)+'k':'0'}</text>`;
 const every=Math.ceil(20/slot);
 R.rows.forEach((t,i)=>{
  const x=sx(i)+(slot-bw)/2,segs=BG_GROUPS.filter(G=>t[G.k]>0.5);let base=0;
  segs.forEach((G,j)=>{
   const y0=y(base)-(j?1:0),y1=y(base+t[G.k])+1,last=j===segs.length-1,rr=last?Math.min(4,bw/2,Math.max(0,y0-y1)):0;
   g+=rr>0?`<path d="M${x},${y0} V${y1+rr} Q${x},${y1} ${x+rr},${y1} H${x+bw-rr} Q${x+bw},${y1} ${x+bw},${y1+rr} V${y0} Z" fill="${G.c}"/>`
    :`<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(0,y0-y1)}" fill="${G.c}"/>`;
   base+=t[G.k];
  });
  if(t.diff<-0.5) g+=`<text x="${x+bw/2}" y="${y(t.out)-4}" text-anchor="middle" class="fpax" style="fill:var(--bad);font-weight:700">!</text>`;
  const [yy,mm]=t.m.split('-');
  if(i%every===0||t.m===sel) g+=`<text x="${x+bw/2}" y="${H-pb+14}" text-anchor="middle" class="fpax${t.m===sel?' on':''}">${+mm}</text>`;
  if(+mm===1||i===0) g+=`<text x="${x+bw/2}" y="${H-pb+29}" text-anchor="middle" class="fpax yr">${yy}</text>`;
  if(t.m===sel) g+=`<rect x="${sx(i)+1}" y="${pt}" width="${slot-2}" height="${H-pt-pb}" fill="none" stroke="var(--gold)" stroke-width="1.5" rx="4"/>`;
  g+=`<rect class="fphit" x="${sx(i)}" y="${pt}" width="${slot}" height="${H-pt}" fill="transparent" data-fpi="${i}" data-act="bgm:${t.m}"/>`;
 });
 return `<div class="fpchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="توزيع الدخل على أشهر الخطة">${g}</svg><div class="fptip" hidden></div></div>`;
}
const legend=()=>`<div class="fplegend">${BG_GROUPS.map(G=>`<span><i style="background:${G.c}"></i>${G.l}</span>`).join('')}</div>`;

/* ====== الداشبورد ====== */
function bgDash(cw){
 const B=BG,R=simulate(B),td=monthOf(todayS());
 if(!BGsel||!R.months.includes(BGsel)) BGsel=R.months.includes(td)?td:R.months[0];
 const t=R.rows[R.months.indexOf(BGsel)],inc=R.inc;
 const rate=inc>0?(t.save+t.goal+t.free)/inc*100:null;
 const deficits=R.rows.filter(x=>x.diff<-0.5);
 /* undefined = ما فيه ديون، null = تبقى ديون بعد الخطة */
 const debtFree=!B.debts.length?undefined:B.debts.some((d,i)=>R.debtRem[i]>0.5)?null:B.debts.map((d,i)=>R.done['d'+i]||'').sort().pop()||null;
 const events=R.rows.flatMap(x=>x.events.map(e=>Object.assign({m:x.m},e)));
 const unmet=B.goals.map((g,i)=>({g,left:n0(g.target)-R.goalSaved[i]})).filter(x=>x.left>0.5);
 const bar=BG_GROUPS.filter(G=>t[G.k]>0.5);
 const end=R.rows[R.rows.length-1];
 return `
  <div class="bghero ${t.diff<-0.5?'bad':t.diff>0.5?'ok':''}">
   <div><span class="lb">${t.diff<-0.5?'عجز':'المتبقي بدون تخصيص'} · ${esc(fmtM(BGsel))}</span><div class="v num">${money(Math.abs(t.diff))}</div></div>
   <div class="bghs"><span>الدخل <b class="num">${fmt(t.inc)}</b></span><span>المخصص <b class="num">${fmt(t.out)}</b></span><span>نسبة الادخار <b class="num">${rate==null?'—':Math.round(rate)+'%'}</b></span></div>
  </div>
  ${inc>0?`<div class="panel"><h3>وين يروح دخل ${esc(fmtM(BGsel))}</h3>
   <div class="bgbar">${bar.map(G=>`<i style="flex:${t[G.k]};background:${G.c}" title="${G.l}: ${fmt(t[G.k])}"></i>`).join('')}</div>
   <div class="bgbl">${bar.map(G=>`<div><i style="background:${G.c}"></i><span>${G.l}</span><b class="num">${fmt(t[G.k])}</b><small class="num">${Math.round(t[G.k]/inc*100)}%</small></div>`).join('')}</div></div>`:''}
  <div class="stats bgstats">
   ${statCard('الأقساط من الدخل',inc?Math.round(R.inst/inc*100)+'%':'—',`<span>${fmt(R.inst)} شهرياً</span>`,R.inst/inc>.33?'bad':R.inst/inc>.2?'warn':'ok')}
   ${statCard('الخلو من الديون',debtFree===undefined?'—':debtFree?esc(fmtM(debtFree)):'بعد الخطة',debtFree===null?`<span class="dn">باقي ${fmt(sum(R.debtRem,x=>x))}</span>`:`<span>من ${fmt(R.debtTotal)}</span>`,debtFree===null?'bad':'ok')}
   ${statCard('صندوق الطوارئ',R.eTarget?Math.round(pct(R.eBal,R.eTarget))+'%':'—',R.eTarget?`<span>${R.done.e?'يكتمل '+esc(fmtM(R.done.e)):'الهدف '+fmt(R.eTarget)}</span>`:'<span>حدد عدد الأشهر</span>','info')}
   ${statCard('الاستثمار نهاية الخطة',money(R.inv),R.invPaid?`<span>دفعت ${fmt(R.invPaid)}</span><span class="up">+${fmt(R.inv-R.invPaid)}</span>`:'','gold')}
  </div>
  <div class="panel"><div class="ph"><h3 style="margin:0">الخطة شهر بشهر</h3>${deficits.length?`<span class="tag bad">${deficits.length} أشهر فيها عجز</span>`:'<span class="tag ok">كل الأشهر متوازنة</span>'}</div>${legend()}${bgChart(R,BGsel,cw)}<p class="hint" style="margin:6px 0 0">اضغط أي شهر لعرض توزيعه فوق.</p></div>
  <div class="panel"><h3>المحطات</h3>
   ${events.length?events.map(e=>`<div class="fprow"><span><span class="tag ${e.t==='debt'?'warn':e.t==='goal'?'ok':'gold'}">${e.t==='debt'?'دين':e.t==='goal'?'هدف':'ادخار'}</span> ${esc(e.l)}</span><b>${esc(fmtM(e.m))}</b></div>`).join(''):emptyBox('أضف ديون أو أهداف بمبالغ شهرية عشان تطلع مواعيدها هنا.')}
   ${unmet.map(x=>`<div class="fprow"><span><span class="tag bad">ما يكتمل</span> ${esc(x.g.n||'هدف')}</span><b class="num" style="color:var(--bad)">ناقص ${fmt(x.left)}</b></div>`).join('')}
  </div>
  <div class="panel"><h3>نهاية الخطة · ${esc(fmtM(end.m))}</h3>
   <div class="fprow"><span>سددت من الديون</span><b class="num">${money(R.debtPaid)}</b></div>
   <div class="fprow"><span>رصيد الطوارئ</span><b class="num">${money(R.eBal)}</b></div>
   <div class="fprow"><span>قيمة الاستثمار المتوقعة</span><b class="num">${money(R.inv)}</b></div>
   ${R.grams?`<div class="fprow"><span>الذهب</span><b class="num">${R.grams.toFixed(1)} جم</b></div>`:''}
   <div class="fprow"><span>مجموع الفائض غير المخصص</span><b class="num">${money(sum(R.rows,x=>x.free))}</b></div>
  </div>`;
}

/* ====== المدخلات ====== */
const fin=(path,v,o={})=>`<input class="bgi${o.c?' '+o.c:''}" data-p="${path}" ${o.t==='month'?'type="month"':o.t==='text'?'type="text"':'type="text" inputmode="decimal"'} value="${esc(v??'')}" placeholder="${esc(o.ph||'')}" aria-label="${esc(o.al||'')}" autocomplete="off">`;
function listSec(key,title,cols,hint){
 const rows=BG[key];
 return `<div class="bgsec"><div class="ph" style="margin-bottom:6px"><h3 style="margin:0">${title}</h3><button class="btn sm" data-act="bgadd:${key}">+ إضافة</button></div>${hint?`<p class="hint" style="margin:0 0 8px">${hint}</p>`:''}
  ${rows.length?`<div class="bgl${cols.length>2?' wide':''}" style="grid-template-columns:${cols.map(c=>c.w||'1fr').join(' ')} 28px;--k:${cols.length-1}">${cols.map(c=>`<span class="bgh">${c.l}</span>`).join('')}<span class="bgh"></span>
   ${rows.map((r,i)=>cols.map(c=>`<label class="bgc${c.k==='n'?' nm':''}"><span class="bgcl">${c.l}</span>${fin(`${key}.${i}.${c.k}`,r[c.k],{t:c.t,ph:c.ph,al:c.l})}</label>`).join('')+`<button class="bgx" data-act="bgdel:${key}|${i}" aria-label="حذف">×</button>`).join('')}</div>`:`<p class="hint" style="margin:0">ما فيه بنود.</p>`}
  ${key!=='debts'&&key!=='goals'?`<div class="bgsum">المجموع <b class="num">${fmt(sum(rows,x=>x.v))}</b>${key==='annual'?` · شهرياً <b class="num">${fmt(sum(rows,x=>x.v)/12)}</b>`:''}</div>`:''}</div>`;
}
const one=(path,label,v,o={})=>`<label class="bgf"><span>${label}</span>${fin(path,v,Object.assign({al:label},o))}</label>`;
function bgInputs(){
 const B=BG;
 return `
  <div class="bgsec"><h3>الإعدادات</h3><div class="bgg">${one('start','بداية الخطة',B.start,{t:'month'})}${one('months','عدد الأشهر',B.months)}</div></div>
  ${listSec('income','الدخل الشهري',[{k:'n',l:'البند',t:'text'},{k:'v',l:'المبلغ',w:'110px'}])}
  ${listSec('fixed','المصاريف الثابتة الشهرية',[{k:'n',l:'البند',t:'text'},{k:'v',l:'المبلغ',w:'110px'}])}
  ${listSec('annual','المخصصات السنوية',[{k:'n',l:'البند',t:'text'},{k:'v',l:'بالسنة',w:'110px'}],'مصاريف تجي مرة بالسنة (رمضان، صيانة، تجديد وثائق)، تنقسم على 12 تلقائياً.')}
  ${listSec('debts','الديون والأقساط',[{k:'n',l:'الدين',t:'text'},{k:'total',l:'المتبقي',w:'90px'},{k:'monthly',l:'القسط',w:'78px'},{k:'start',l:'يبدأ',t:'month',w:'118px'}],'يتوقف القسط تلقائياً لما يخلص الدين.')}
  ${listSec('goals','الأهداف',[{k:'n',l:'الهدف',t:'text'},{k:'target',l:'المبلغ',w:'84px'},{k:'saved',l:'المدخر',w:'76px'},{k:'monthly',l:'شهرياً',w:'76px'},{k:'start',l:'يبدأ',t:'month',w:'118px'}])}
  <div class="bgsec"><h3>صندوق الطوارئ</h3><p class="hint" style="margin:0 0 8px">الهدف = (الثابتة + الأقساط + المخصصات) × عدد الأشهر.</p><div class="bgg">
   ${one('emerg.months','عدد الأشهر',B.emerg.months)}${one('emerg.bal','الرصيد الحالي',B.emerg.bal)}${one('emerg.monthly','المساهمة الشهرية',B.emerg.monthly)}${one('emerg.start','يبدأ',B.emerg.start,{t:'month'})}</div></div>
  <div class="bgsec"><h3>الاستثمار</h3><div class="bgg">${one('invest.monthly','شهرياً',B.invest.monthly)}${one('invest.ret','العائد السنوي %',B.invest.ret)}${one('invest.start','يبدأ',B.invest.start,{t:'month'})}</div><p class="hint" style="margin:8px 0 0">العائد افتراض للتوضيح، مو مضمون.</p></div>
  <div class="bgsec"><h3>الصدقة والذهب</h3><div class="bgg">${one('sadaqa.pct','الصدقة % من الدخل',B.sadaqa.pct)}${one('gold.monthly','ذهب شهرياً',B.gold.monthly)}${one('gold.price','سعر الجرام',B.gold.price)}${one('gold.start','يبدأ',B.gold.start,{t:'month'})}</div></div>`;
}

/* ====== الربط ====== */
const TEXT_KEYS=new Set(['n','start']);
function setPath(o,path,raw){
 const ks=path.split('.'),last=ks.pop();
 ks.forEach(k=>o=o[k]);
 o[last]=TEXT_KEYS.has(last)?raw.trim():num(raw);
}
function bgSave(){
 bgState='يُحفظ...';const st=document.getElementById('bgSt');if(st)st.textContent=bgState;
 clearTimeout(bgSaveT);
 bgSaveT=setTimeout(()=>guard(async()=>{await saveKV('budget',BG);bgState='محفوظ';const s=document.getElementById('bgSt');if(s)s.textContent=bgState}),700);
}
function bgRefreshDash(el){
 const d=el.querySelector('#bgDash');if(!d)return;
 d.innerHTML=bgDash(d.clientWidth-36);bgTip(d);
 const R=simulate(BG),t=R.rows[R.months.indexOf(BGsel)]||R.rows[0],mini=el.querySelector('#bgMini');
 if(mini) mini.innerHTML=`<span>${t.diff<-0.5?'عجز':'المتبقي'}</span><b class="num" style="color:${t.diff<-0.5?'var(--bad)':'var(--ok)'}">${fmt(Math.abs(t.diff))}</b><span>من ${fmt(t.inc)}</span>`;
}
function bgTip(d){
 const ch=d.querySelector('.fpchart');if(!ch)return;
 const tip=ch.querySelector('.fptip'),R=simulate(BG);
 ch.onmousemove=e=>{
  const h=e.target.closest('[data-fpi]');if(!h){tip.hidden=true;return}
  const t=R.rows[+h.dataset.fpi];
  tip.innerHTML=`<b>${esc(fmtM(t.m))}</b>${BG_GROUPS.filter(G=>t[G.k]>0.5).map(G=>`<div><i style="background:${G.c}"></i>${G.l}<span class="num">${fmt(t[G.k])}</span></div>`).join('')}<div class="tot">الدخل<span class="num">${fmt(t.inc)}</span></div>${t.diff<-0.5?`<div style="color:var(--bad)">عجز<span class="num">${fmt(-t.diff)}</span></div>`:''}${t.events.map(e=>`<div style="color:var(--gold)">${esc(e.l)}</div>`).join('')}`;
  tip.hidden=false;
  const r=ch.getBoundingClientRect(),w=tip.offsetWidth;
  tip.style.left=Math.max(0,Math.min(r.width-w,e.clientX-r.left-w/2))+'px';tip.style.top=Math.max(0,e.clientY-r.top-tip.offsetHeight-14)+'px';
 };
 ch.onmouseleave=()=>tip.hidden=true;
}
function renderFinPlan(el,head){
 if(!BG) BG=KV.budget?Object.assign(bgDefault(),KV.budget):bgDefault();
 el.innerHTML=`${head}
  <div class="ph"><p class="hint" style="margin:0">اكتب أرقامك والداشبورد يتحدث مباشرة. <span id="bgSt" class="tag">${esc(bgState||(KV.budget?'محفوظ':'غير محفوظ'))}</span></p>
   <label class="btn sm" style="cursor:pointer;margin:0">تعبئة من ملف الإكسل<input type="file" id="bgFile" accept=".xlsx" hidden></label></div>
  <div class="bgwrap">
   <div class="bgin"><div class="bgmini" id="bgMini"></div>${bgInputs()}</div>
   <div class="bgdash" id="bgDash"></div>
  </div>`;
 bgRefreshDash(el);BG_EL=el;
 el.oninput=e=>{
  const i=e.target.closest('[data-p]');if(!i)return;
  setPath(BG,i.dataset.p,i.value);
  const sec=i.closest('.bgsec'),s=sec&&sec.querySelector('.bgsum');
  if(s){const k=i.dataset.p.split('.')[0];s.innerHTML=`المجموع <b class="num">${fmt(sum(BG[k],x=>x.v))}</b>${k==='annual'?` · شهرياً <b class="num">${fmt(sum(BG[k],x=>x.v)/12)}</b>`:''}`}
  bgRefreshDash(el);bgSave();
 };
 const f=el.querySelector('#bgFile');
 f.onchange=async()=>{const file=f.files[0];if(!file)return;
  if(KV.budget&&!confirm('التعبئة من الملف تستبدل المدخلات الحالية. متأكد؟'))return;
  await guard(async()=>{BG=await budgetFromExcel(file);BGsel=null;await saveKV('budget',BG);bgState='محفوظ';renderFinPlan(el,head);toast('تمت التعبئة من الملف، راجع الأرقام')});
 };
}
async function finPlanAct(act,id,el){
 if(act==='bgm'){BGsel=id;bgRefreshDash(el);return 'done'}
 if(act==='bgadd'){BG[id].push(id==='debts'?{n:'',total:null,monthly:null,start:''}:id==='goals'?{n:'',target:null,saved:null,monthly:null,start:''}:{n:'',v:null});bgSave();return 'full'}
 if(act==='bgdel'){const [k,i]=id.split('|');BG[k].splice(+i,1);bgSave();return 'full'}
 return false;
}

/* ====== التعبئة من ملف الإكسل (اختياري) ====== */
function loadXlsx(){
 if(window.XLSX) return Promise.resolve();
 return new Promise((ok,bad)=>{const s=document.createElement('script');s.src=XLSX_SRC;s.onload=ok;s.onerror=()=>bad(new Error('تعذر تحميل قارئ الإكسل، تأكد من الإنترنت'));document.head.appendChild(s)});
}
const cellS=v=>v==null?'':String(v).trim();
const isNum=v=>typeof v==='number'&&isFinite(v);
const secNo=s=>{const m=cellS(s).match(/^([٠-٩0-9]+)\)/);return m?num(m[1]):null};
function sections(rows){
 const secs={};let cur=null;
 rows.forEach(r=>{
  const a=cellS(r[0]),n=secNo(a);
  if(n){cur=secs[n]=[];return}
  if(!cur||!a||a.startsWith('مثال')||r[1]==null||r[1]==='') return;
  cur.push({n:a,v:r[1]});
 });
 return secs;
}
async function budgetFromExcel(file){
 await loadXlsx();
 const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
 const sheet=name=>{const k=wb.SheetNames.find(s=>s.trim()===name);return k?XLSX.utils.sheet_to_json(wb.Sheets[k],{header:1,raw:true,defval:null}):null};
 const inp=sheet('المدخلات'),pl=sheet('الخطط'),mo=sheet('الخطة الشهرية');
 if(!inp) throw new Error('الملف ما فيه ورقة «المدخلات»');
 const S1=sections(inp),S2=pl?sections(pl):{},B=bgDefault();
 const listOf=a=>(a||[]).filter(r=>isNum(r.v)&&!r.n.startsWith('إجمالي'));
 const find=(sec,txt)=>{const r=(S2[sec]||[]).find(x=>x.n.includes(txt));return r&&isNum(r.v)?r.v:null};
 B.income=listOf(S1[1]).map(r=>({n:r.n,v:r.v}));
 B.fixed=listOf(S1[2]).map(r=>({n:r.n,v:r.v}));
 B.annual=listOf(S2[2]).filter(r=>!/الإجمالي|المخصص الشهري/.test(r.n)).map(r=>({n:r.n,v:r.v}));
 const goalNames=new Set(listOf(S1[3]).map(r=>r.n));
 /* الخطة الشهرية: بداية الخطة، وأقساط الديون، والمبلغ الشهري لكل هدف */
 let planStart=null,rowsBy={};
 if(mo){
  const hi=mo.findIndex(r=>cellS(r[0])==='الهدف');
  if(hi>0){
   const y=num((mo[hi-1]||[])[4]),mi=AR_MONTHS.indexOf(cellS(mo[hi][4]));
   if(y&&mi>=0){B.start=`${y}-${pad(mi+1)}`}
   let cnt=0;for(let c=4;cellS(mo[hi][c]);c++)cnt++;B.months=cnt||B.months;
   for(let i=hi+1;i<mo.length;i++){const a=cellS(mo[i][0]);if(a)rowsBy[a]={target:mo[i][1],vals:mo[i].slice(4,4+cnt).map(v=>isNum(v)?v:0)}}
  }
  const si=find(0,'تبدأ')||(pl&&(pl.find(r=>cellS(r[0]).includes('تبدأ الخطط'))||[])[1]);
  if(isNum(si)) planStart=addMonths(B.start,si-1);
 }
 const firstIdx=v=>v.findIndex(x=>x>0),firstVal=v=>{const i=firstIdx(v);return i<0?null:v[i]};
 const avgNZ=v=>{const nz=v.filter(x=>x>0);return nz.length?Math.round(sum(nz,x=>x)/nz.length):null};
 const startOf=v=>{const i=firstIdx(v);return i>0?addMonths(B.start,i):''};
 B.goals=listOf(S1[3]).map(r=>{const m=rowsBy[r.n];return {n:r.n,target:r.v,saved:0,monthly:m?avgNZ(m.vals):null,start:m?startOf(m.vals):''}});
 const PLAN=/^(المخصصات السنوية|صندوق الطوارئ|الاستثمار|ادخار البيت|ادخار المولود|الزكاة|الصدقة|الذهب|المصاريف الثابتة|إجمالي|الدخل|دخل إضافي|الفرق|الحالة|الرصيد)/;
 B.debts=Object.entries(rowsBy).filter(([n])=>!goalNames.has(n)&&!PLAN.test(n)).map(([n,m])=>({n,total:isNum(m.target)?m.target:sum(m.vals,x=>x),monthly:firstVal(m.vals),start:startOf(m.vals)}));
 B.emerg={months:find(3,'عدد الأشهر المستهدف')??6,bal:find(3,'الرصيد الحالي')||0,monthly:find(3,'المساهمة الشهرية'),start:planStart||''};
 B.invest={monthly:find(4,'الاستثمار الشهري'),ret:(find(4,'العائد')||0.06)*100,start:planStart||''};
 const house=find(5,'المبلغ المطلوب'),houseM=find(5,'الادخار الشهري');
 if(house) B.goals.push({n:'البيت',target:house,saved:find(5,'المدخر حالياً')||0,monthly:houseM,start:planStart||''});
 const baby=find(6,'تكاليف'),babyM=find(6,'الادخار الشهري');
 if(baby) B.goals.push({n:'المولود',target:baby,saved:0,monthly:babyM,start:planStart||''});
 B.sadaqa={pct:(find(7,'نسبة الصدقة')||0)*100};
 B.gold={monthly:find(7,'شراء ذهب'),price:find(0,'سعر جرام')||(pl&&(pl.find(r=>cellS(r[0]).includes('سعر جرام'))||[])[1])||490,start:planStart||''};
 return B;
}
