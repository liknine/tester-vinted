(function () {
  'use strict';

  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0e0e0e');
    tg.setBackgroundColor('#0e0e0e');
  }

  var params      = new URLSearchParams(window.location.search);
  var userId      = params.get('id') || '0';
  var premiumDays = parseInt(params.get('days') || '0', 10);
  var avatarUrl   = params.get('avatar') ? decodeURIComponent(params.get('avatar')) : '';
  var searches    = [];
  try { searches = JSON.parse(decodeURIComponent(params.get('searches') || '[]')); } catch(e) {}

  var PLANS = {
    week:      { name: '1 Неделя',  crypto: '3.00',   stars: 150 },
    month:     { name: '1 Месяц',   crypto: '10.00',  stars: 500,  popular: true },
    '3months': { name: '3 Месяца',  crypto: '25.00',  stars: 1250 },
    year:      { name: '1 Год',     crypto: '100.00', stars: 5000 },
    forever:   { name: 'Навсегда',  crypto: '150.00', stars: 7500 },
  };

  var DOMAINS = [
    { value: 'vinted.fr', flag: '🇫🇷', label: 'Франция' },
    { value: 'vinted.de', flag: '🇩🇪', label: 'Германия' },
    { value: 'vinted.it', flag: '🇮🇹', label: 'Италия' },
    { value: 'vinted.es', flag: '🇪🇸', label: 'Испания' },
    { value: 'vinted.pl', flag: '🇵🇱', label: 'Польша' },
  ];

  var CONDITIONS = [
    { id: '6', label: '🏷 Новое с бирками' },
    { id: '1', label: '✨ Новое' },
    { id: '2', label: '👍 Очень хорошее' },
    { id: '3', label: '👌 Хорошее' },
    { id: '4', label: '📦 Удовлетворительное' },
  ];

  var editingId          = null;
  var selectedConditions = new Set();
  var selectedDomains    = new Set(['vinted.fr']);

  function $(s)  { return document.querySelector(s); }
  function $$(s) { return document.querySelectorAll(s); }

  var tabPages   = $$('.tab-page');
  var navItems   = $$('.nav-item');
  var toastEl    = $('#toast');

  // TABS
  navItems.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.tab;
      tabPages.forEach(function(p) { p.classList.remove('active'); });
      navItems.forEach(function(n) { n.classList.remove('active'); });
      $('#' + id).classList.add('active');
      btn.classList.add('active');
    });
  });

  // TOAST
  var toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { toastEl.classList.add('hidden'); }, 2800);
  }

  // SEND
  function sendData(data) {
    if (tg) {
      tg.sendData(JSON.stringify(data));
    } else {
      console.log('sendData:', data);
      showToast('dev: ' + JSON.stringify(data));
    }
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = String(s || '');
    return d.innerHTML;
  }

  // DOMAINS
  function renderDomains() {
    var grid = $('#domainGrid');
    grid.innerHTML = '';
    DOMAINS.forEach(function(d) {
      var el = document.createElement('div');
      el.className = 'domain-item' + (selectedDomains.has(d.value) ? ' active' : '');
      el.innerHTML =
        '<span class="domain-flag">' + d.flag + '</span>' +
        '<span class="domain-label">' + d.label + '</span>' +
        '<div class="domain-check"><div class="domain-check-inner"></div></div>';
      el.addEventListener('click', function() {
        if (selectedDomains.has(d.value)) {
          if (selectedDomains.size > 1) {
            selectedDomains.delete(d.value);
            el.classList.remove('active');
          } else {
            showToast('Нужен хотя бы один домен');
          }
        } else {
          selectedDomains.add(d.value);
          el.classList.add('active');
        }
      });
      grid.appendChild(el);
    });
  }

  // CONDITIONS
  function renderConditions() {
    var box = $('#conditionChips');
    box.innerHTML = '';
    CONDITIONS.forEach(function(c) {
      var chip = document.createElement('div');
      chip.className = 'chip' + (selectedConditions.has(c.id) ? ' active' : '');
      chip.textContent = c.label;
      chip.addEventListener('click', function() {
        if (selectedConditions.has(c.id)) {
          selectedConditions.delete(c.id);
          chip.classList.remove('active');
        } else {
          selectedConditions.add(c.id);
          chip.classList.add('active');
        }
      });
      box.appendChild(chip);
    });
  }

  // PROFILE
  function renderProfile() {
    var user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    var firstName = user ? (user.first_name || '') : '';
    var lastName  = user ? (user.last_name  || '') : '';
    var username  = user ? (user.username   || '') : '';
    var name = [firstName, lastName].filter(Boolean).join(' ') || 'Пользователь';

    $('#profileName').textContent     = name;
    $('#profileUsername').textContent = username ? '@' + username : 'нет username';
    $('#statId').textContent          = userId;
    $('#statPremium').textContent     = premiumDays > 0 ? '✅ Активен' : '❌ Нет';
    $('#statDays').textContent        = premiumDays;
    $('#statSearches').textContent    = searches.length;

    var letter = $('#profileAvatarLetter');
    var img    = $('#profileAvatarImg');

    if (avatarUrl) {
      img.src = avatarUrl;
      img.classList.remove('hidden');
      letter.classList.add('hidden');
      img.onerror = function() {
        img.classList.add('hidden');
        letter.classList.remove('hidden');
        letter.textContent = (firstName || '?')[0].toUpperCase();
      };
    } else {
      letter.textContent = (firstName || '?')[0].toUpperCase();
      letter.classList.remove('hidden');
      img.classList.add('hidden');
    }
  }

  // SUBSCRIPTION
  function renderSubscription() {
    var dot = $('#subDot');
    if (premiumDays > 0) {
      dot.className = 'sub-dot on';
      $('#subTitle').textContent = 'Premium — ' + premiumDays + ' дн.';
      $('#subDesc').textContent  = 'Засады активны и работают';
    } else {
      dot.className = 'sub-dot off';
      $('#subTitle').textContent = 'Premium не активен';
      $('#subDesc').textContent  = 'Оформи подписку для работы бота';
    }

    var list = $('#plansList');
    list.innerHTML = '';
    Object.keys(PLANS).forEach(function(key) {
      var plan = PLANS[key];
      var card = document.createElement('div');
      card.className = 'plan-card' + (plan.popular ? ' popular' : '');
      card.innerHTML =
        '<div class="plan-head">' +
          '<div class="plan-name">' + plan.name + '</div>' +
          (plan.popular ? '<span class="plan-badge">Популярный</span>' : '') +
        '</div>' +
        '<div class="plan-prices">' +
          '<div>⭐ ' + plan.stars + ' Stars</div>' +
          '<div>💎 ' + plan.crypto + ' USDT</div>' +
        '</div>' +
        '<div class="plan-actions">' +
          '<button class="btn-pay stars" data-plan="' + key + '" data-method="stars">⭐ Stars</button>' +
          '<button class="btn-pay crypto" data-plan="' + key + '" data-method="crypto">💎 Crypto</button>' +
          '<button class="btn-pay card"   data-plan="' + key + '" data-method="card">💳 Карта</button>' +
        '</div>';

      card.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var m = btn.dataset.method;
          var p = btn.dataset.plan;
          if (m === 'stars') {
            sendData({ action: 'buy_stars', plan: p });
          } else if (m === 'crypto') {
            sendData({ action: 'buy_crypto', plan: p });
          } else {
            if (tg) tg.openTelegramLink('https://t.me/liknine');
            else window.open('https://t.me/liknine', '_blank');
            showToast('Напиши @liknine для оплаты картой');
          }
        });
      });
      list.appendChild(card);
    });
  }

  // SEARCHES
  function renderSearches() {
    var list  = $('#searchList');
    var count = $('#searchCountLabel');
    list.innerHTML = '';
    count.textContent = searches.length;

    if (!searches.length) {
      list.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">🎯</div>' +
          '<div class="empty-text">Нет активных засад.<br>Создай первую во вкладке «Поиск»</div>' +
        '</div>';
      return;
    }

    searches.forEach(function(s) {
      var card = document.createElement('div');
      card.className = 'search-card';

      var domains = (s.domain || 'vinted.fr').split(',').map(function(d) { return d.trim(); }).join(', ');
      var filters = [];
      if (s.category && s.category !== 'all') filters.push(s.category === 'clothes' ? '👕 Одежда' : '👟 Обувь');
      if (s.size)       filters.push('📐 ' + s.size);
      if (s.min_price > 0) filters.push('от ' + s.min_price + '€');
      if (s.max_price > 0) filters.push('до ' + s.max_price + '€');
      if (s.minus_words)   filters.push('🚫 ' + s.minus_words);

      var condLabels = [];
      try {
        var conds = typeof s.conditions === 'string' ? JSON.parse(s.conditions) : (s.conditions || []);
        conds.forEach(function(c) {
          var f = CONDITIONS.find(function(x) { return x.id === String(c); });
          if (f) condLabels.push(f.label);
        });
      } catch(e) {}

      card.innerHTML =
        '<div class="search-card-top">' +
          '<div>' +
            '<div class="search-card-title">' + escHtml(s.query || '—') + '</div>' +
            '<div class="search-card-meta">🌍 ' + escHtml(domains) + '</div>' +
          '</div>' +
          '<span class="badge-active">Активна</span>' +
        '</div>' +
        '<div class="search-card-filters">' +
          filters.map(function(f) { return '<span class="filter-tag">' + escHtml(f) + '</span>'; }).join('') +
          condLabels.map(function(c) { return '<span class="filter-tag">' + escHtml(c) + '</span>'; }).join('') +
        '</div>' +
        '<div class="search-card-actions">' +
          '<button class="btn-secondary edit-btn">✏️ Изменить</button>' +
          '<button class="btn-danger delete-btn">🗑 Удалить</button>' +
        '</div>';

      card.querySelector('.edit-btn').addEventListener('click', function() { startEdit(s); });
      card.querySelector('.delete-btn').addEventListener('click', function() {
        if (confirm('Удалить засаду «' + s.query + '»?')) {
          sendData({ action: 'delete', search_id: s.id });
        }
      });

      list.appendChild(card);
    });
  }

  // EDIT
  function startEdit(s) {
    editingId = s.id;
    $('#formTitle').textContent  = '✏️ Редактирование';
    $('#cancelEditBtn').classList.remove('hidden');
    $('#submitBtn').textContent  = 'Сохранить';
    $('#query').value       = s.query       || '';
    $('#size').value        = s.size        || '';
    $('#min_price').value   = s.min_price   || '';
    $('#max_price').value   = s.max_price   || '';
    $('#minus_words').value = s.minus_words || '';
    $('#category').value    = s.category    || 'all';

    selectedDomains.clear();
    (s.domain || 'vinted.fr').split(',').forEach(function(d) {
      d = d.trim();
      if (DOMAINS.some(function(x) { return x.value === d; })) selectedDomains.add(d);
    });
    if (!selectedDomains.size) selectedDomains.add('vinted.fr');
    renderDomains();

    selectedConditions.clear();
    try {
      var conds = typeof s.conditions === 'string' ? JSON.parse(s.conditions) : (s.conditions || []);
      conds.forEach(function(c) { selectedConditions.add(String(c)); });
    } catch(e) {}
    renderConditions();

    tabPages.forEach(function(p) { p.classList.remove('active'); });
    navItems.forEach(function(n) { n.classList.remove('active'); });
    $('#tabSearch').classList.add('active');
    navItems[0].classList.add('active');
    $('#formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelEdit() {
    editingId = null;
    $('#formTitle').textContent = 'Новая засада';
    $('#cancelEditBtn').classList.add('hidden');
    $('#submitBtn').textContent = 'Создать засаду';
    $('#searchForm').reset();
    selectedConditions.clear();
    selectedDomains.clear();
    selectedDomains.add('vinted.fr');
    renderConditions();
    renderDomains();
  }

  $('#cancelEditBtn').addEventListener('click', cancelEdit);

  // SUBMIT
  $('#searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var query = $('#query').value.trim();
    if (!query) { showToast('Введи запрос'); return; }

    var data = {
      query:       query,
      domain:      Array.from(selectedDomains),
      category:    $('#category').value,
      size:        $('#size').value.trim(),
      min_price:   parseFloat($('#min_price').value)   || 0,
      max_price:   parseFloat($('#max_price').value)   || 0,
      minus_words: $('#minus_words').value.trim(),
      conditions:  Array.from(selectedConditions),
    };

    if (editingId) {
      data.action    = 'edit';
      data.search_id = editingId;
      showToast('Сохраняю...');
    } else {
      showToast('Создаю засаду...');
    }
    sendData(data);
  });

  // CONTACT
  var contactBtn = $('#contactBtn');
  if (contactBtn) {
    contactBtn.addEventListener('click', function() {
      if (tg) tg.openTelegramLink('https://t.me/liknine');
      else window.open('https://t.me/liknine', '_blank');
    });
  }

  // INIT
  renderDomains();
  renderConditions();
  renderProfile();
  renderSubscription();
  renderSearches();

})();