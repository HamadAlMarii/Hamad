/* المحتوى الافتراضي للموقع العام + دالة الدمج.
   لوحة التحكم تحفظ تعديلاتك في Supabase، وهذا الملف هو الاحتياط إذا تعذر الوصول لها. */
(function(){
 function isObj(x){return x&&typeof x==='object'&&!Array.isArray(x)}
 function merge(base,over){
  if(!isObj(base)||!isObj(over)) return over===undefined?base:over;
  var out={};
  Object.keys(base).forEach(function(k){out[k]=base[k]});
  Object.keys(over).forEach(function(k){out[k]=isObj(base[k])&&isObj(over[k])?merge(base[k],over[k]):over[k]});
  return out;
 }
 window.hjMerge=merge;
 window.SITE_DEFAULT={
  v:1,
  order:['companies','work','about','contact'],
  hidden:{},
  theme:{bg:'#031A2B',sky:'#4DB8E8',blue:'#007CB7',ink:'#F2F7FA'},
  companies:['NOX Group','Al-Nufoud Arabian Company','Aseeb','Al-Nufoud','Falak Investment Hub'],
  words:{
   ar:['الاستراتيجية الرقمية','التجارة الإلكترونية','السوشال ميديا','إدارة العلامات','المجتمعات الرقمية'],
   en:['digital strategy','e-commerce','social media','brand management','digital communities']
  },
  links:[{label:'LinkedIn',url:'https://www.linkedin.com/in/hamadaljaidi'}],
  ar:{
   title:'حمد الجعيدي · متخصص تسويق رقمي',
   desc:'حمد الجعيدي، متخصص تسويق رقمي بخبرة تتجاوز 12 سنة في الاستراتيجية الرقمية والتجارة الإلكترونية والسوشال ميديا وإدارة العلامات.',
   mono:'ح.ج',name:'حمد الجعيدي',name2:'HAMAD AL-JAIDI',role:'متخصص تسويق رقمي',focus:'أعمل على',
   lead:'أكثر من 12 سنة في الاستراتيجية الرقمية والتجارة الإلكترونية والسوشال ميديا وإدارة العلامات.',
   h_co:'شركات عملت معها',h_work:'ما أعمل عليه',
   caps:[
    {t:'الاستراتيجية الرقمية',d:'خطط تسويقية مبنية على الأهداف والأرقام، من تحليل السوق إلى مؤشرات الأداء.'},
    {t:'التجارة الإلكترونية',d:'إدارة المتاجر الإلكترونية ورحلة العميل من أول زيارة إلى إتمام الطلب.'},
    {t:'السوشال ميديا',d:'محتوى وحملات وإدارة حسابات تبني حضوراً وتحوّله إلى طلب.'},
    {t:'إدارة العلامة التجارية',d:'هوية ورسالة ونبرة واحدة عبر كل نقاط التواصل.'},
    {t:'بناء المجتمعات الرقمية',d:'بناء مجتمعات حول العلامات التجارية وتنشيطها.'},
    {t:'الإبداع والحركة',d:'تنسيق التصميم وتحريك الشعارات وإنتاج المحتوى المرئي.'}
   ],
   h_about:'نبذة',
   about:'أعمل على الاستراتيجية والتنفيذ معاً: أضع الخطة، وأنظّم الأدوات والفريق، وأتابع الأرقام حتى تتحقق الأهداف. من المملكة العربية السعودية.',
   h_contact:'تواصل',contact_p:'الأسهل عبر LinkedIn.',foot:'© 2026 حمد الجعيدي'
  },
  en:{
   title:'Hamad Al-Jaidi · Digital Marketing Specialist',
   desc:'Hamad Al-Jaidi, a digital marketing specialist with 12+ years in digital strategy, e-commerce, social media and brand management.',
   mono:'HJ',name:'Hamad Al\u2011Jaidi',name2:'حمد الجعيدي',role:'Digital marketing specialist',focus:'I work on',
   lead:'12+ years in digital strategy, e-commerce, social media and brand management.',
   h_co:'Companies I\u2019ve worked with',h_work:'What I work on',
   caps:[
    {t:'Digital strategy',d:'Marketing plans built on goals and numbers, from market analysis to performance indicators.'},
    {t:'E-commerce',d:'Running online stores and the customer journey from the first visit to the completed order.'},
    {t:'Social media',d:'Content, campaigns and account management that build presence and turn it into demand.'},
    {t:'Brand management',d:'One identity, message and tone across every touchpoint.'},
    {t:'Digital communities',d:'Building communities around brands and keeping them active.'},
    {t:'Creative and motion',d:'Design coordination, logo animation and visual content production.'}
   ],
   h_about:'About',
   about:'I work on strategy and execution together: I set the plan, organise the tools and the team, and follow the numbers until the goals are met. Based in Saudi Arabia.',
   h_contact:'Contact',contact_p:'The easiest way is LinkedIn.',foot:'\u00a9 2026 Hamad Al-Jaidi'
  }
 };
})();
