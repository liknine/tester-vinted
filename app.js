(function(){
  'use strict';
  var tg=window.Telegram&&window.Telegram.WebApp;
  if(tg){tg.ready();tg.expand();tg.setHeaderColor('#fafafa');tg.setBackgroundColor('#fafafa')}

  var P=new URLSearchParams(location.search);
  var userId=P.get('id')||'0', premDays=parseInt(P.get('days')||'0',10);
  var avatarUrl=P.get('avatar')?decodeURIComponent(P.get('avatar')):'';
  var searches=[];try{searches=JSON.parse(decodeURIComponent(P.get('searches')||'[]'))}catch(e){}

  var PLANS={
    week:{name:'1 Week',crypto:'3.00',stars:150},
    month:{name:'1 Month',crypto:'10.00',stars:500,pop:true},
    '3months':{name:'3 Months',crypto:'25.00',stars:1250},
    year:{name:'1 Year',crypto:'100.00',stars:5000},
    forever:{name:'Forever',crypto:'150.00',stars:7500}
  };
  var DOMAINS=[
    {v:'vinted.fr',f:'🇫🇷',l:'France'},{v:'vinted.de',f:'🇩🇪',l:'Germany'},
    {v:'vinted.it',f:'🇮🇹',l:'Italy'},{v:'vinted.es',f:'🇪🇸',l:'Spain'},
    {v:'vinted.pl',f:'🇵🇱',l:'Poland'}
  ];
  var CONDS=[
    {id:'6',l:'New with tags'},{id:'1',l:'New'},{id:'2',l:'Very good'},
    {id:'3',l:'Good'},{id:'4',l:'Satisfactory'}
  ];

  var editId=null,selConds=new Set(),selDoms=new Set(['vinted.fr']);
  function $(s){return document.querySelector(s)}
  function $$(s){return document.querySelectorAll(s)}

  // TABS
  $$('.nav-btn').forEach(function(b){b.addEventListener('click',function(){
    var id=b.dataset.tab;
    $$('.page').forEach(function(p){p.classList.remove('active')});
    $$('.nav-btn').forEach(function(n){n.classList.remove('active')});
    $('#'+id).classList.add('active');b.classList.add('active');
  })});

  // TOAST
  var tt;function toast(m){var t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(tt);tt=setTimeout(function(){t.classList.add('hidden')},2500)}

  // SEND
  function send(d){if(tg)tg.sendData(JSON.stringify(d));else{console.log(d);toast('dev: sent')}}
  function esc(s){var d=document.createElement('div');d.textContent=String(s||'');return d.innerHTML}

  // DOMAINS
  function renderDoms(){
    var g=$('#domainGrid');g.innerHTML='';
    DOMAINS.forEach(function(d){
      var el=document.createElement('div');
      el.className='dom'+(selDoms.has(d.v)?' active':'');
      el.innerHTML='<span class="dom-flag">'+d.f+'</span><span>'+d.l+'</span><div class="dom-check"><div class="dom-tick"></div></div>';
      el.addEventListener('click',function(){
        if(selDoms.has(d.v)){if(selDoms.size>1){selDoms.delete(d.v);el.classList.remove('active')}else toast('Need at least one')}
        else{selDoms.add(d.v);el.classList.add('active')}
      });g.appendChild(el);
    });
  }

  // CONDITIONS
  function renderConds(){
    var b=$('#conditionChips');b.innerHTML='';
    CONDS.forEach(function(c){
      var t=document.createElement('div');
      t.className='tag'+(selConds.has(c.id)?' active':'');
      t.textContent=c.l;
      t.addEventListener('click',function(){
        if(selConds.has(c.id)){selConds.delete(c.id);t.classList.remove('active')}
        else{selConds.add(c.id);t.classList.add('active')}
      });b.appendChild(t);
    });
  }

  // PROFILE
  function renderProfile(){
    var u=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;
    var fn=u?(u.first_name||''):'',ln=u?(u.last_name||''):'',un=u?(u.username||''):'';
    var name=[fn,ln].filter(Boolean).join(' ')||'User';
    $('#profileName').textContent=name;
    $('#profileUsername').textContent=un?'@'+un:'';
    $('#statId').textContent=userId;
    $('#statPremium').textContent=premDays>0?'Active':'No';
    $('#statDays').textContent=premDays;
    $('#statSearches').textContent=searches.length;
    var letter=$('#profileAvatarLetter'),img=$('#profileAvatarImg');
    if(avatarUrl){
      img.src=avatarUrl;img.classList.remove('hidden');letter.classList.add('hidden');
      img.onerror=function(){img.classList.add('hidden');letter.classList.remove('hidden');letter.textContent=(fn||'?')[0].toUpperCase()};
    }else{letter.textContent=(fn||'?')[0].toUpperCase();letter.classList.remove('hidden');img.classList.add('hidden')}
  }

  // SUBSCRIPTION
  function renderSub(){
    var dot=$('#subDot');
    if(premDays>0){dot.className='status-dot on';$('#subTitle').textContent='Premium — '+premDays+' days';$('#subDesc').textContent='Ambushes are active'}
    else{dot.className='status-dot off';$('#subTitle').textContent='Not active';$('#subDesc').textContent='Subscribe to start using the bot'}
    var list=$('#plansList');list.innerHTML='';
    Object.keys(PLANS).forEach(function(k){
      var p=PLANS[k],c=document.createElement('div');
      c.className='plan'+(p.pop?' pop':'');
      c.innerHTML='<div class="plan-top"><div class="plan-name">'+p.name+'</div>'+(p.pop?'<span class="plan-pop">Popular</span>':'')+'</div>'+
        '<div class="plan-prices"><span>'+p.stars+' Stars</span><span>'+p.crypto+' USDT</span></div>'+
        '<div class="plan-btns">'+
        '<button class="pay-btn stars" data-p="'+k+'" data-m="stars">Stars</button>'+
        '<button class="pay-btn crypto" data-p="'+k+'" data-m="crypto">Crypto</button>'+
        '<button class="pay-btn card" data-p="'+k+'" data-m="card">Card</button></div>';
      c.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){
        var m=b.dataset.m,pl=b.dataset.p;
        if(m==='stars')send({action:'buy_stars',plan:pl});
        else if(m==='crypto')send({action:'buy_crypto',plan:pl});
        else{if(tg)tg.openTelegramLink('https://t.me/liknine');else window.open('https://t.me/liknine');toast('DM @liknine for card payment')}
      })});list.appendChild(c);
    });
  }

  // SEARCHES
  function renderSearches(){
    var list=$('#searchList'),cnt=$('#searchCountLabel');list.innerHTML='';cnt.textContent=searches.length;
    if(!searches.length){list.innerHTML='<div class="empty"><div class="empty-t">No active ambushes<br>Create one in Search tab</div></div>';return}
    searches.forEach(function(s){
      var card=document.createElement('div');card.className='s-card';
      var doms=(s.domain||'vinted.fr').split(',').map(function(d){return d.trim()}).join(', ');
      var f=[];
      if(s.category&&s.category!=='all')f.push(s.category==='clothes'?'Clothing':'Shoes');
      if(s.size)f.push(s.size);if(s.min_price>0)f.push('from '+s.min_price);if(s.max_price>0)f.push('to '+s.max_price);
      if(s.minus_words)f.push('-'+s.minus_words);
      var cl=[];try{var cn=typeof s.conditions==='string'?JSON.parse(s.conditions):(s.conditions||[]);
        cn.forEach(function(c){var x=CONDS.find(function(y){return y.id===String(c)});if(x)cl.push(x.l)})}catch(e){}
      card.innerHTML='<div class="s-top"><div><div class="s-title">'+esc(s.query||'—')+'</div><div class="s-meta">'+esc(doms)+'</div></div><span class="s-badge">Active</span></div>'+
        '<div class="s-filters">'+f.concat(cl).map(function(t){return'<span class="s-tag">'+esc(t)+'</span>'}).join('')+'</div>'+
        '<div class="s-actions"><button class="sm-btn edit-btn">Edit</button><button class="sm-btn danger del-btn">Delete</button></div>';
      card.querySelector('.edit-btn').addEventListener('click',function(){startEdit(s)});
      card.querySelector('.del-btn').addEventListener('click',function(){if(confirm('Delete "'+s.query+'"?'))send({action:'delete',search_id:s.id})});
      list.appendChild(card);
    });
  }

  function startEdit(s){
    editId=s.id;$('#formTitle').textContent='Edit ambush';$('#cancelEditBtn').classList.remove('hidden');$('#submitBtn').textContent='Save';
    $('#query').value=s.query||'';$('#size').value=s.size||'';$('#min_price').value=s.min_price||'';$('#max_price').value=s.max_price||'';$('#minus_words').value=s.minus_words||'';$('#category').value=s.category||'all';
    selDoms.clear();(s.domain||'vinted.fr').split(',').forEach(function(d){d=d.trim();if(DOMAINS.some(function(x){return x.v===d}))selDoms.add(d)});if(!selDoms.size)selDoms.add('vinted.fr');renderDoms();
    selConds.clear();try{var c=typeof s.conditions==='string'?JSON.parse(s.conditions):(s.conditions||[]);c.forEach(function(x){selConds.add(String(x))})}catch(e){}renderConds();
    $$('.page').forEach(function(p){p.classList.remove('active')});$$('.nav-btn').forEach(function(n){n.classList.remove('active')});$('#tabSearch').classList.add('active');$$('.nav-btn')[0].classList.add('active');
    $('#formCard').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function cancelEdit(){
    editId=null;$('#formTitle').textContent='New ambush';$('#cancelEditBtn').classList.add('hidden');$('#submitBtn').textContent='Create ambush';
    $('#searchForm').reset();selConds.clear();selDoms.clear();selDoms.add('vinted.fr');renderConds();renderDoms();
  }
  $('#cancelEditBtn').addEventListener('click',cancelEdit);

  $('#searchForm').addEventListener('submit',function(e){
    e.preventDefault();var q=$('#query').value.trim();if(!q){toast('Enter query');return}
    var d={query:q,domain:Array.from(selDoms),category:$('#category').value,size:$('#size').value.trim(),
      min_price:parseFloat($('#min_price').value)||0,max_price:parseFloat($('#max_price').value)||0,
      minus_words:$('#minus_words').value.trim(),conditions:Array.from(selConds)};
    if(editId){d.action='edit';d.search_id=editId;toast('Saving...')}else toast('Creating...');
    send(d);
  });

  $('#contactBtn').addEventListener('click',function(){if(tg)tg.openTelegramLink('https://t.me/liknine');else window.open('https://t.me/liknine')});

  renderDoms();renderConds();renderProfile();renderSub();renderSearches();
})();