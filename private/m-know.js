'use strict';
/* ====================== المعرفة: القراءة والملاحظات وحفظ القرآن ====================== */
const SURAHS=[["الفاتحة",7],["البقرة",286],["آل عمران",200],["النساء",176],["المائدة",120],["الأنعام",165],["الأعراف",206],["الأنفال",75],["التوبة",129],["يونس",109],["هود",123],["يوسف",111],["الرعد",43],["إبراهيم",52],["الحجر",99],["النحل",128],["الإسراء",111],["الكهف",110],["مريم",98],["طه",135],["الأنبياء",112],["الحج",78],["المؤمنون",118],["النور",64],["الفرقان",77],["الشعراء",227],["النمل",93],["القصص",88],["العنكبوت",69],["الروم",60],["لقمان",34],["السجدة",30],["الأحزاب",73],["سبأ",54],["فاطر",45],["يس",83],["الصافات",182],["ص",88],["الزمر",75],["غافر",85],["فصلت",54],["الشورى",53],["الزخرف",89],["الدخان",59],["الجاثية",37],["الأحقاف",35],["محمد",38],["الفتح",29],["الحجرات",18],["ق",45],["الذاريات",60],["الطور",49],["النجم",62],["القمر",55],["الرحمن",78],["الواقعة",96],["الحديد",29],["المجادلة",22],["الحشر",24],["الممتحنة",13],["الصف",14],["الجمعة",11],["المنافقون",11],["التغابن",18],["الطلاق",12],["التحريم",12],["الملك",30],["القلم",52],["الحاقة",52],["المعارج",44],["نوح",28],["الجن",28],["المزمل",20],["المدثر",56],["القيامة",40],["الإنسان",31],["المرسلات",50],["النبأ",40],["النازعات",46],["عبس",42],["التكوير",29],["الانفطار",19],["المطففين",36],["الانشقاق",25],["البروج",22],["الطارق",17],["الأعلى",19],["الغاشية",26],["الفجر",30],["البلد",20],["الشمس",15],["الليل",21],["الضحى",11],["الشرح",8],["التين",8],["العلق",19],["القدر",5],["البينة",8],["الزلزلة",8],["العاديات",11],["القارعة",11],["التكاثر",8],["العصر",3],["الهمزة",9],["الفيل",5],["قريش",4],["الماعون",7],["الكوثر",3],["الكافرون",6],["النصر",3],["المسد",5],["الإخلاص",4],["الفلق",5],["الناس",6]];
const AYAH_TOTAL=SURAHS.reduce((s,x)=>s+x[1],0);
const BSTATUS={want:'أريد قراءته',reading:'أقرأه الآن',done:'انتهيت منه'};
let KSUB='reading',NQ='',NTAG='',QF='all';

/* ---------- القراءة ---------- */
function readingStats(){
 const ws=weekStart(),logs=ofKind('rlog');
 const week=sum(logs.filter(l=>l.data.date>=ws&&l.data.date<=addDays(ws,6)),l=>l.data.pages);
 const today=sum(logs.filter(l=>l.data.date===todayS()),l=>l.data.pages);
 const yr=String(new Date().getFullYear());
 const done=ofKind('book').filter(b=>b.data.status==='done'&&String(b.data.finished||'').startsWith(yr)).length;
 return {week,today,done,reading:ofKind('book').filter(b=>b.data.status==='reading').length};
}
function bookRow(b){
 const d=b.data,p=pct(d.current||0,d.total||0);
 const stars=d.rating?'★'.repeat(d.rating)+'☆'.repeat(5-d.rating):'';
 return `<div class="li"><div><div class="tt">${esc(d.title)}${d.author?` <span style="color:var(--mute);font-weight:400">· ${esc(d.author)}</span>`:''}</div>
  <div class="ss">${d.total?`${fmt(d.current||0)} من ${fmt(d.total)} صفحة · ${Math.round(p)}%`:''}${stars?` · <span style="color:var(--gold)">${stars}</span>`:''}${d.finished?` · انتهى ${fmtD(d.finished)}`:''}</div>
  ${d.status==='reading'&&d.total?`<div style="margin-top:6px">${pb(p)}</div>`:''}</div>
  <div class="aa">${d.status==='reading'?ab('page:'+b.id,'تحديث الصفحة','gold'):''}${ab('editBook:'+b.id,'✎')}</div></div>`;
}
function renderReading(el,box){
 const st=settings(),rs=readingStats(),books=ofKind('book');
 const sel=books.filter(b=>b.data.status!=='done');
 const by=s=>books.filter(b=>b.data.status===s);
 box.innerHTML=`
  <div class="stats">
   ${statCard('صفحات اليوم',fmt(rs.today),'','info')}${statCard('صفحات الأسبوع',fmt(rs.week),'','gold')}
   ${statCard('كتب أنهيتها هذه السنة',`${fmt(rs.done)} <small>من ${fmt(st.booksYear)}</small>`,pb(pct(rs.done,st.booksYear),'var(--ok)'),'ok')}
   ${statCard('أقرأ الآن',fmt(rs.reading),'','')}
  </div>
  <form class="panel" id="rlForm"><div class="ph"><h2>سجّل قراءتك</h2>${ab('booksTarget','هدف السنة: '+st.booksYear+' كتاب')}</div><div class="irow">
   <div><label>الكتاب</label><select id="rb"><option value="">بدون كتاب محدد</option>${sel.map(b=>`<option value="${b.id}">${esc(b.data.title)}</option>`).join('')}</select></div>
   <div><label>عدد الصفحات</label><input id="rp" inputmode="numeric" placeholder="20" autocomplete="off"></div>
   <div><label>التاريخ</label><input id="rd" type="date" value="${todayS()}"></div>
   <div><button class="btn gold" style="width:100%;padding:10px" type="submit">إضافة</button></div></div></form>
  <div class="panel"><div class="ph"><h2>كتبي</h2>${ab('addBook','+ كتاب','gold')}</div>
   ${['reading','want','done'].map(s=>`<h3 style="margin-top:12px">${BSTATUS[s]} (${by(s).length})</h3>${by(s).length?by(s).map(bookRow).join(''):'<div class="ss" style="padding:6px 0">—</div>'}`).join('')}</div>`;
 box.onsubmit=async e=>{
  if(e.target.id!=='rlForm')return;e.preventDefault();
  const pages=num($('rp').value);if(pages==null||pages<=0){toast('أدخل عدد الصفحات',true);$('rp').focus();return}
  await guard(async()=>{
   const date=$('rd').value||todayS(),bid=$('rb').value;
   await addItem('knowledge','rlog',{date,pages,bookId:bid||null});
   if(bid){
    const b=ITEMS.find(i=>i.id===bid);
    if(b){
     const d=Object.assign({},b.data),cur=(d.current||0)+pages;
     d.current=d.total?Math.min(d.total,cur):cur;
     if(d.status==='want'){d.status='reading';d.started=d.started||date}
     if(d.total&&d.current>=d.total){d.status='done';d.finished=date}
     await saveItem(b,d);
    }
   }
   renderKnow($('tab-know'));toast('انحفظت القراءة');
  });
 };
 box.onclick=async e=>{
  const a=actOf(e);if(!a)return;
  const [act,id]=a.split(':');
  await guard(async()=>{
   const ex=id?ITEMS.find(i=>i.id===id):null;
   if(act==='booksTarget'){
    const r=await openForm({title:'هدف القراءة السنوي',values:{booksYear:st.booksYear},fields:[{k:'booksYear',l:'عدد الكتب في السنة',t:'number',req:1,full:1}]});
    if(!r)return;await saveSettings({booksYear:Math.max(1,Math.round(r.booksYear))});
   }
   if(act==='addBook'||act==='editBook'){
    const r=await openForm({title:ex?'تعديل كتاب':'كتاب جديد',values:ex?ex.data:{status:'want',current:0,rating:0},del:!!ex,fields:[
     {k:'title',l:'العنوان',req:1,full:1},{k:'author',l:'المؤلف'},{k:'total',l:'عدد الصفحات',t:'number'},
     {k:'status',l:'الحالة',t:'select',o:Object.entries(BSTATUS)},{k:'current',l:'الصفحة الحالية',t:'number'},
     {k:'rating',l:'التقييم',t:'select',o:[[0,'بدون'],[1,'★'],[2,'★★'],[3,'★★★'],[4,'★★★★'],[5,'★★★★★']]},
     {k:'started',l:'بدأته في',t:'date'},{k:'finished',l:'أنهيته في',t:'date'},{k:'notes',l:'ملاحظات',t:'textarea',full:1}]});
    if(!r)return;
    if(r.__del) await removeItem(ex);
    else{
     r.rating=+r.rating||0;
     if(r.status==='done'&&!r.finished) r.finished=todayS();
     if(r.status==='reading'&&!r.started) r.started=todayS();
     await saveOrAdd(ex,'knowledge','book',r);
    }
   }
   if(act==='page'){
    const r=await openForm({title:'تحديث: '+ex.data.title,values:{current:ex.data.current||0},fields:[{k:'current',l:'وصلت إلى الصفحة',t:'number',req:1,full:1}]});
    if(!r)return;
    const d=Object.assign({},ex.data,{current:r.current});
    if(d.total&&d.current>=d.total){d.status='done';d.finished=todayS();toast('ما شاء الله، أنهيت الكتاب')}
    await saveItem(ex,d);
   }
   renderKnow($('tab-know'));
  });
 };
}

/* ---------- الملاحظات والمعرفة ---------- */
function renderNotes(el,box){
 const notes=ofKind('note').slice().sort((a,b)=>(a.data.date||'')<(b.data.date||'')?1:-1);
 const tagsOf=n=>String(n.data.tags||'').split(/[,،]/).map(x=>x.trim()).filter(Boolean);
 const allTags=[...new Set(notes.flatMap(tagsOf))];
 const q=NQ.trim().toLowerCase();
 const rows=notes.filter(n=>(!NTAG||tagsOf(n).includes(NTAG))&&(!q||[n.data.title,n.data.text,n.data.tags,n.data.source].join(' ').toLowerCase().includes(q)));
 box.innerHTML=`
  <div class="panel"><div class="ph"><div><h2>ما تعلمته</h2><p class="hint" style="margin:0">فوائد وأفكار وملخصات تبي تحتفظ بها.</p></div>${ab('addNote','+ ملاحظة','gold')}</div>
   <div class="irow" style="margin-bottom:10px"><div class="full"><input id="nsearch" placeholder="ابحث في ملاحظاتك" value="${esc(NQ)}" autocomplete="off"></div></div>
   ${allTags.length?`<div class="chips"><button class="chip" data-act="tag:" aria-pressed="${!NTAG}">الكل</button>${allTags.map(t=>`<button class="chip" data-act="tag:${esc(t)}" aria-pressed="${NTAG===t}">${esc(t)}</button>`).join('')}</div>`:''}
   <div id="nlist">${rows.length?rows.map(n=>li(esc(n.data.title),
     `${n.data.date?fmtDY(n.data.date):''}${n.data.source?' · '+esc(n.data.source):''}${tagsOf(n).length?' · '+tagsOf(n).map(esc).join('، '):''}<div style="margin-top:4px;color:var(--ink);opacity:.85">${esc(String(n.data.text||'').slice(0,180))}${String(n.data.text||'').length>180?'…':''}</div>`,
     ab('editNote:'+n.id,'فتح'))).join(''):emptyBox(notes.length?'لا توجد نتائج.':'ابدأ بتدوين أول فائدة تعلمتها.')}</div></div>`;
 const s=$('nsearch');
 s.oninput=()=>{NQ=s.value;const pos=s.selectionStart;renderNotes(el,box);const n=$('nsearch');n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}};
 box.onclick=async e=>{
  const a=actOf(e);if(!a)return;
  const idx=a.indexOf(':'),act=idx<0?a:a.slice(0,idx),id=idx<0?'':a.slice(idx+1);
  if(act==='tag'){NTAG=id;return renderNotes(el,box)}
  await guard(async()=>{
   const ex=id?ITEMS.find(i=>i.id===id):null;
   if(act==='addNote'||act==='editNote'){
    const r=await openForm({title:ex?'ملاحظة':'ملاحظة جديدة',values:ex?ex.data:{date:todayS()},del:!!ex,fields:[
     {k:'title',l:'العنوان',req:1,full:1},{k:'text',l:'النص',t:'textarea',rows:7,full:1},
     {k:'tags',l:'وسوم (افصل بفاصلة)'},{k:'source',l:'المصدر'},{k:'date',l:'التاريخ',t:'date'}]});
    if(!r)return;
    if(r.__del) await removeItem(ex); else await saveOrAdd(ex,'knowledge','note',r);
   }
   renderKnow($('tab-know'));
  });
 };
}

/* ---------- حفظ القرآن ---------- */
const ayahs=n=>`${n} ${n>=3&&n<=10?'آيات':'آية'}`;
const qItem=n=>ofKind('qsurah').find(i=>i.data.n===n)||null;
const memOf=n=>{const it=qItem(n);return it?Math.min(it.data.mem||0,SURAHS[n-1][1]):0};
function quranStats(){
 let mem=0,full=0;
 SURAHS.forEach((s,i)=>{const m=memOf(i+1);mem+=m;if(m>=s[1])full++});
 const logs=ofKind('qlog'),days=new Set(logs.map(l=>l.data.date));
 let d=days.has(todayS())?todayS():addDays(todayS(),-1),streak=0;while(days.has(d)){streak++;d=addDays(d,-1)}
 const todayNew=sum(logs.filter(l=>l.data.date===todayS()&&l.data.type==='new'),l=>(l.data.to-l.data.from+1));
 return {mem,full,streak,todayNew};
}
function qDefaults(type,n){
 const s=SURAHS[n-1],m=memOf(n),st=settings();
 if(type==='new'){const from=Math.min(s[1],m+1);return {from,to:Math.min(s[1],from+st.qDaily-1)}}
 return {from:1,to:Math.max(1,m||s[1])};
}
let QLAST=114;
function renderQuran(el,box){
 const st=settings(),qs=quranStats(),p=pct(qs.mem,AYAH_TOTAL);
 const logs=ofKind('qlog').slice().sort((a,b)=>a.data.date<b.data.date?1:(a.data.date>b.data.date?-1:(a.created_at<b.created_at?1:-1))).slice(0,8);
 const due=SURAHS.map((s,i)=>({n:i+1,name:s[0],m:memOf(i+1),it:qItem(i+1)})).filter(x=>x.m>0)
  .sort((a,b)=>((a.it&&a.it.data.last)||'0000')<((b.it&&b.it.data.last)||'0000')?-1:1).slice(0,6);
 const tiles=SURAHS.map((s,i)=>({n:i+1,name:s[0],a:s[1],m:memOf(i+1)})).filter(x=>QF==='all'||(QF==='part'&&x.m>0&&x.m<x.a)||(QF==='full'&&x.m>=x.a)||(QF==='none'&&x.m===0));
 const def=qDefaults('new',QLAST);
 box.innerHTML=`
  <div class="stats">
   ${statCard('المحفوظ',`${fmt(qs.mem)} <small>من ${fmt(AYAH_TOTAL)} آية</small>`,pb(p,'var(--ok)'),'ok')}
   ${statCard('نسبة الحفظ',p.toFixed(1)+'%','','gold')}
   ${statCard('سور مكتملة',fmt(qs.full),'<span>من 114</span>','info')}
   ${statCard('حفظ اليوم',`${fmt(qs.todayNew)} <small>من ${fmt(st.qDaily)} آية</small>`,pb(pct(qs.todayNew,st.qDaily),qs.todayNew>=st.qDaily?'var(--ok)':''),qs.todayNew>=st.qDaily?'ok':'')}
   ${statCard('أيام متتالية',fmt(qs.streak),'<span>حفظ أو مراجعة</span>','gold')}
  </div>
  <form class="panel" id="qForm"><div class="ph"><h2>سجّل وردك</h2>${ab('qTarget','هدف الحفظ اليومي: '+st.qDaily+' آيات')}</div><div class="irow">
   <div><label>النوع</label><select id="qt"><option value="new">حفظ جديد</option><option value="review">مراجعة</option></select></div>
   <div><label>السورة</label><select id="qs">${SURAHS.map((s,i)=>`<option value="${i+1}" ${i+1===QLAST?'selected':''}>${i+1}. ${esc(s[0])}</option>`).join('')}</select></div>
   <div><label>من آية</label><input id="qf" inputmode="numeric" value="${def.from}" autocomplete="off"></div>
   <div><label>إلى آية</label><input id="qe" inputmode="numeric" value="${def.to}" autocomplete="off"></div>
   <div><label>التاريخ</label><input id="qd" type="date" value="${todayS()}"></div>
   <div><button class="btn gold" style="width:100%;padding:10px" type="submit">تسجيل</button></div></div></form>
  <div class="two">
   <div class="panel"><h2>للمراجعة</h2><p class="hint">السور الأقدم مراجعة من محفوظك.</p>
    ${due.length?due.map(x=>li(esc(x.name),`${ayahs(x.m)} · ${x.it&&x.it.data.last?'آخر مراجعة '+fmtD(x.it.data.last)+` (قبل ${daysBetween(x.it.data.last,todayS())} يوم)`:'لم تُراجع بعد'}`,ab('rev:'+x.n,'تمت المراجعة','gold'))).join(''):emptyBox('سجّل ما حفظته ليظهر هنا.')}</div>
   <div class="panel"><h2>آخر التسجيلات</h2>${logs.length?logs.map(l=>li(`${l.data.type==='new'?'حفظ':'مراجعة'}: ${esc(SURAHS[l.data.surah-1][0])} ${l.data.from}-${l.data.to}`,fmtDY(l.data.date),ab('dlog:'+l.id,'حذف'))).join(''):emptyBox('لا توجد تسجيلات.')}</div>
  </div>
  <div class="panel"><div class="ph"><h2>السور</h2><div class="chips" style="margin:0">${[['all','الكل'],['part','قيد الحفظ'],['full','محفوظة'],['none','لم تبدأ']].map(([k,l])=>`<button class="chip" data-act="qf:${k}" aria-pressed="${QF===k}">${l}</button>`).join('')}</div></div>
   <p class="hint">اضغط أي سورة لتعديل ما حفظته منها.</p>
   <div class="tiles">${tiles.map(x=>`<button class="tile ${x.m>=x.a?'full':x.m>0?'part':''}" data-act="surah:${x.n}"><b>${x.n}. ${esc(x.name)}</b><span class="num">${x.m}/${x.a}</span>${pb(pct(x.m,x.a),x.m>=x.a?'var(--ok)':'var(--warn)')}</button>`).join('')}</div></div>`;
 const sync=()=>{const d=qDefaults($('qt').value,+$('qs').value);$('qf').value=d.from;$('qe').value=d.to};
 $('qt').onchange=sync;$('qs').onchange=sync;
 box.onsubmit=async e=>{
  if(e.target.id!=='qForm')return;e.preventDefault();
  const n=+$('qs').value,a=SURAHS[n-1][1],from=num($('qf').value),to=num($('qe').value),type=$('qt').value,date=$('qd').value||todayS();
  if(from==null||to==null||from<1||to>a||from>to){toast(`الآيات يجب أن تكون بين 1 و ${a} (من ≤ إلى)`,true);return}
  await guard(async()=>{
   await addItem('knowledge','qlog',{date,type,surah:n,from:Math.round(from),to:Math.round(to)});
   const ex=qItem(n),d=Object.assign({n,mem:0,last:null,note:''},ex?ex.data:{});
   d.mem=Math.max(d.mem||0,Math.round(to));d.last=date>(d.last||'')?date:d.last;
   await saveOrAdd(ex,'knowledge','qsurah',d);
   QLAST=n;renderKnow($('tab-know'));toast('انحفظ وردك');
  });
 };
 box.onclick=async e=>{
  const a=actOf(e);if(!a)return;
  const [act,id]=a.split(':');
  if(act==='qf'){QF=id;return renderQuran(el,box)}
  await guard(async()=>{
   if(act==='qTarget'){
    const r=await openForm({title:'هدف الحفظ اليومي',values:{qDaily:st.qDaily},fields:[{k:'qDaily',l:'عدد الآيات الجديدة يومياً',t:'number',req:1,full:1}]});
    if(!r)return;await saveSettings({qDaily:Math.max(1,Math.round(r.qDaily))});
   }
   if(act==='dlog'){const l=ITEMS.find(i=>i.id===id);if(l&&confirm('حذف هذا التسجيل؟ (محفوظك لا يتغير، عدّله من السورة)'))await removeItem(l)}
   if(act==='rev'){
    const n=+id,ex=qItem(n),m=memOf(n);
    await addItem('knowledge','qlog',{date:todayS(),type:'review',surah:n,from:1,to:Math.max(1,m)});
    await saveItem(ex,Object.assign({},ex.data,{last:todayS()}));toast('تقبل الله');
   }
   if(act==='surah'){
    const n=+id,s=SURAHS[n-1],ex=qItem(n);
    const r=await openForm({title:`سورة ${s[0]} (${s[1]} آية)`,values:{mem:ex?ex.data.mem||0:0,last:ex?ex.data.last||'':'',note:ex?ex.data.note||'':''},fields:[
     {k:'mem',l:'عدد الآيات المحفوظة',t:'number',req:1},{k:'last',l:'آخر مراجعة',t:'date'},{k:'note',l:'ملاحظة',t:'textarea',full:1}]});
    if(!r)return;
    if(r.mem<0||r.mem>s[1]){toast(`العدد بين 0 و ${s[1]}`,true);return}
    await saveOrAdd(ex,'knowledge','qsurah',{n,mem:Math.round(r.mem),last:r.last||null,note:r.note});
   }
   renderKnow($('tab-know'));
  });
 };
}

/* ---------- الحاوية ---------- */
function renderKnow(el){
 el=el||$('tab-know');
 el.innerHTML=`<div class="chips">${[['reading','القراءة'],['notes','المعرفة والملاحظات'],['quran','حفظ القرآن']].map(([k,l])=>`<button class="chip" data-ksub="${k}" aria-pressed="${KSUB===k}">${l}</button>`).join('')}</div><div id="kbox"></div>`;
 const box=$('kbox');
 if(KSUB==='reading') renderReading(el,box);
 else if(KSUB==='notes') renderNotes(el,box);
 else renderQuran(el,box);
 el.onclick=e=>{const c=e.target.closest('[data-ksub]');if(c){KSUB=c.dataset.ksub;renderKnow(el)}};
}
registerTab({id:'know',order:8,title:'المعرفة والقرآن',render:renderKnow});
