'use strict';
/* ====================== النظرة العامة ====================== */
function renderHome(el){
 const td=todayS(),open=TASKS.filter(t=>t.status!=='done');
 const dueToday=open.filter(t=>t.due&&t.due<=td).sort(sortTasks);
 const overdue=open.filter(t=>t.due&&t.due<td).length;
 const fam=familyUpcoming(7);
 const m=monthOf(td),tx=monthTxns(m),inc=sum(tx.filter(x=>x.data.type==='in'),x=>x.data.amount),spent=sum(tx.filter(x=>x.data.type==='out'),x=>x.data.amount);
 const bills=ofKind('bill').filter(b=>b.data.active!==false&&!(b.data.paid||{})[m]).map(b=>({b,due:billDue(b,m)})).filter(x=>x.due<=addDays(td,7)).sort((a,b)=>a.due<b.due?-1:1);
 const goals=ofKind('goal'),gAct=goals.filter(g=>!goalInfo(g).done);
 const inv=ofKind('invest'),iv=sum(inv,i=>i.data.invested),ivv=sum(inv,i=>i.data.value??i.data.invested);
 const st=settings(),wm=weekMinutes(weekStart()),habits=ofKind('habit'),hDone=habits.filter(h=>(h.data.days||{})[td]).length;
 const rs=readingStats(),qs=quranStats();
 const hour=new Date().getHours(),greet=hour<12?'صباح الخير':hour<18?'مساء الخير':'مساء الخير';
 el.innerHTML=`
  <div class="panel" style="background:linear-gradient(135deg,var(--panel),var(--panel2))"><h2 style="font-size:22px">${greet} يا حمد</h2><p class="hint" style="margin:0">${esc(hijri())} · ${esc(fmtDY(td))}</p></div>
  <div class="stats">
   ${statCard('مهام اليوم',fmt(dueToday.length),overdue?`<span class="dn">${overdue} متأخرة</span>`:'<span>لا توجد متأخرات</span>',overdue?'bad':(dueToday.length?'warn':'ok'),'tasks')}
   ${statCard('العائلة خلال 7 أيام',fmt(fam.length),fam.length?esc(fam[0].label):'<span>لا شيء قريب</span>','info','family')}
   ${statCard('صافي هذا الشهر',money(inc-spent),`<span>دخل ${fmt(inc)}</span><span>مصروف ${fmt(spent)}</span>`,inc-spent>=0?'ok':'bad','finance')}
   ${statCard('أهداف جارية',fmt(gAct.length),`<span>استثماراتك ${money(ivv)}</span>${iv>0?`<span class="${ivv>=iv?'up':'dn'}">${ivv>=iv?'▲':'▼'} ${Math.abs((ivv-iv)/iv*100).toFixed(1)}%</span>`:''}`,'gold','goals')}
   ${statCard('نشاط الأسبوع',`${fmt(wm)} <small>من ${fmt(st.weekMin)} د</small>`,`<span>${hDone}/${habits.length} عادات اليوم</span>`,wm>=st.weekMin?'ok':'info','activity')}
   ${statCard('القراءة',`${fmt(rs.week)} <small>صفحة هذا الأسبوع</small>`,`<span>${rs.done} كتب هذه السنة</span>`,'info','know')}
   ${statCard('حفظ القرآن',`${fmt(qs.mem)} <small>آية</small>`,`<span>${(qs.mem/AYAH_TOTAL*100).toFixed(1)}%</span><span>اليوم ${qs.todayNew}/${st.qDaily}</span>`,'ok','know')}
  </div>
  <div class="two">
   <div class="panel"><div class="ph"><h2>مهام تنتظرك</h2><button class="btn sm" data-go="tasks">كل المهام</button></div>
    ${dueToday.length?`<ul class="tasks" id="hlist">${dueToday.slice(0,6).map(taskRow).join('')}</ul>`:'<div class="empty">لا مهام مستحقة اليوم.</div>'}</div>
   <div class="panel"><h2>قريباً</h2>
    ${fam.length?fam.slice(0,4).map(x=>li(esc(x.label),esc(x.sub),`<span class="tag warn">${inDays(x.when)}</span>`)).join(''):''}
    ${bills.length?bills.slice(0,4).map(x=>li('فاتورة: '+esc(x.b.data.name),money(x.b.data.amount),`<span class="tag ${x.due<td?'bad':''}">${x.due<td?'متأخرة':fmtD(x.due)}</span>`)).join(''):''}
    ${!fam.length&&!bills.length?'<div class="empty">لا مواعيد أو فواتير خلال 7 أيام.</div>':''}</div>
  </div>`;
 el.onclick=async e=>{await taskAction(e,()=>renderHome(el))};
}
registerTab({id:'home',order:1,title:'نظرة عامة',render:renderHome});
