(function () {
  'use strict';

  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#f5f5f7');
    tg.setBackgroundColor('#f5f5f7');
  }

  // URL params
  var params = new URLSearchParams(window.location.search);
  var userId = params.get('id') || '0';
  var premiumDays = parseInt(params.get('days') || '0', 10);
  var avatarUrl = params.get('avatar') || '';
  var searches = [];
  try {
    searches = JSON.parse(decodeURIComponent(params.get('searches') || '[]'));
  } catch (e) {
    searches = [];
  }

  // Config
  var PLANS = {
    week:      { name: '1 Неделя',  crypto: '3.00',   stars: 150 },
    month:     { name: '1 Месяц',   crypto: '10.00',  stars: 500,  popular: true },
    '3months': { name: '3 Месяца',  crypto: '25.00',  stars: 1250 },
    year:      { name: '1 Год',     crypto: '100.00', stars: 5000 },
    forever:   { name: 'Навсегда',  crypto: '150.00', stars: 7500 },
  };

  var DOMAINS = [
    { value: 'vinted.fr', flag: '\u{1F1EB}\u{1F1F7}', label: '\u0424\u0440\u0430\u043D\u0446\u0438\u044F' },
    { value: 'vinted.de', flag: '\u{1F1E9}\u{1F1EA}', label: '\u0413\u0435\u0440\u043C\u0430\u043D\u0438\u044F' },
    { value: 'vinted.it', flag: '\u{1F1EE}\u{1F1F9}', label: '\u0418\u0442\u0430\u043B\u0438\u044F' },
    { value: 'vinted.es', flag: '\u{1F1EA}\u{1F1F8}', label: '\u0418\u0441\u043F\u0430\u043D\u0438\u044F' },
    { value: 'vinted.pl', flag: '\u{1F1F5}\u{1F1F1}', label: '\u041F\u043E\u043B\u044C\u0448\u0430' },
  ];

  var CONDITIONS = [
    { id: '6', label: '\u041D\u043E\u0432\u043E\u0435 \u0441 \u0431\u0438\u0440\u043A\u0430\u043C\u0438' },
    { id: '1', label: '\u041D\u043E\u0432\u043E\u0435' },
    { id: '2', label: '\u041E\u0447\u0435\u043D\u044C \u0445\u043E\u0440\u043E\u0448\u0435\u0435' },
    { id: '3', label: '\u0425\u043E\u0440\u043E\u0448\u0435\u0435' },
    { id: '4', label: '\u0423\u0434\u043E\u0432\u043B\u0435\u0442\u0432\u043E\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435' },
  ];

  // State
  var editingId = null;
  var selectedConditions = new Set();
  var selectedDomains = new Set(['vinted.fr']);

  // DOM
  function $(s) { return document.querySelector(s); }
  function $$(s) { return document.querySelectorAll(s); }

  var tabPages = $$('.tab-page');
  var navItems = $$('.nav-item');
  var searchForm = $('#searchForm');
  var formTitle = $('#formTitle');
  var cancelEditBtn = $('#cancelEditBtn');
  var submitBtn = $('#submitBtn');
  var searchList = $('#searchList');
  var searchCountLabel = $('#searchCountLabel');
  var conditionChips = $('#conditionChips');
  var domainGrid = $('#domainGrid');
  var toastEl = $('#toast');

  // Tabs
  navItems.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.tab;
      tabPages.forEach(function (p) { p.classList.remove('active'); });
      navItems.forEach(function (n) { n.classList.remove('active'); });
      $('#' + id).classList.add('active');
      btn.classList.add('active');
    });
  });

  // Toast
  var toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add('hidden'); }, 2800);
  }

  // Send to bot
  function sendData(data) {
    if (tg) {
      tg.sendData(JSON.stringify(data));
    } else {
      console.log('sendData:', data);
      showToast('Отправлено (dev)');
    }
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Render domains
  function renderDomains() {
    domainGrid.innerHTML = '';
    DOMAINS.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'domain-item' + (selectedDomains.has(d.value) ? ' active' : '');
      el.innerHTML =
        '<span class="domain-flag">' + d.flag + '</span>' +
        '<span class="domain-label">' + d.label + '</span>' +
        '<div class="domain-check"><div class="domain-check-inner"></div></div>';
      el.addEventListener('click', function () {
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
      domainGrid.appendChild(el);
    });
  }

  // Render conditions
  function renderConditions() {
    conditionChips.innerHTML = '';
    CONDITIONS.forEach(function (c) {
      var chip = document.createElement('div');
      chip.className = 'chip' + (selectedConditions.has(c.id) ? ' active' : '');
      chip.textContent = c.label;
      chip.addEventListener('click', function () {
        if (selectedConditions.has(c.id)) {
          selectedConditions.delete(c.id);
          chip.classList.remove('active');
        } else {
          selectedConditions.add(c.id);
          chip.classList.add('active');
        }
      });
      conditionChips.appendChild(chip);
    });
  }

  // Render profile
  function renderProfile() {
    var user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    var firstName = '';
    var lastName = '';
    var username = '';

    if (user) {
      firstName = user.first_name || '';
      lastName = user.last_name || '';
      username = user.username || '';
    }

    var name = [firstName, lastName].filter(Boolean).join(' ') || '--';
    $('#profileName').textContent = name;
    $('#profileUsername').textContent = username ? '@' + username : '';

    // Avatar
    var avatarLetter = $('#profileAvatarLetter');
    var avatarImg = $('#profileAvatarImg');

    if (avatarUrl) {
      avatarImg.src = avatarUrl;
      avatarImg.classList.remove('hidden');
      avatarLetter.classList.add('hidden');
      avatarImg.onerror = function () {
        avatarImg.classList.add('hidden');
        avatarLetter.classList.remove('hidden');
        avatarLetter.textContent = (firstName || '?')[0].toUpperCase();
      };
    } else {
      avatarLetter.textContent = (firstName || '?')[0].toUpperCase();
      avatarLetter.classList.remove('hidden');
      avatarImg.classList.add('hidden');
    }

    $('#statId').textContent = userId;
    $('#statPremium').textContent = premiumDays > 0 ? 'Активен' : 'Нет';
    $('#statDays').textContent = premiumDays;
    $('#statSearches').textContent = searches.length;
  }

  // Render subscription
  function renderSubscription() {
    var dot = $('#subDot');
    if (premiumDays > 0) {
      dot.className = 'sub-dot on';
      $('#subTitle').textContent = 'Premium \u2014 ' + premiumDays + ' дн.';
      $('#subDesc').textContent = 'Можно создавать и редактировать поиски';
    } else {
      dot.className = 'sub-dot off';
      $('#subTitle').textContent = 'Premium не активен';
      $('#subDesc').textContent = 'Оформи подписку для работы бота';
    }

    var list = $('#plansList');
    list.innerHTML = '';

    Object.keys(PLANS).forEach(function (key) {
      var plan = PLANS[key];
      var card = document.createElement('div');
      card.className = 'plan-card' + (plan.popular ? ' popular' : '');
      card.innerHTML =
        '<div class="plan-head">' +
          '<div class="plan-name">' + plan.name + '</div>' +
          (plan.popular ? '<span class="plan-badge">Популярный</span>' : '') +
        '</div>' +
        '<div class="plan-prices">' +
          '<div>Stars: ' + plan.stars + '</div>' +
          '<div>USDT: ' + plan.crypto + '</div>' +
        '</div>' +
        '<div class="plan-actions">' +
          '<button class="btn-pay stars" data-plan="' + key + '" data-method="stars">Stars</button>' +
          '<button class="btn-pay crypto" data-plan="' + key + '" data-method="crypto">Crypto</button>' +
          '<button class="btn-pay card" data-plan="' + key + '" data-method="card">Карта</button>' +
        '</div>';

      card.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var m = btn.dataset.method;
          var p = btn.dataset.plan;
          if (m === 'stars') {
            sendData({ action: 'buy_stars', plan: p });
          } else if (m === 'crypto') {
            sendData({ action: 'buy_crypto', plan: p });
          } else {
            if (tg) {
              tg.openTelegramLink('https://t.me/liknine');
            } else {
              window.open('https://t.me/liknine', '_blank');
            }
            showToast('Напиши @liknine для оплаты картой');
          }
        });
      });

      list.appendChild(card);
    });
  }

  // Render searches
  function renderSearches() {
    searchList.innerHTML = '';
    searchCountLabel.textContent = searches.length;

    if (!searches.length) {
      searchList.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">--</div>' +
          '<div class="empty-text">Нет активных поисков<br>Создай первый во вкладке Поиск</div>' +
        '</div>';
      return;
    }

    searches.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'search-card';

      var domains = (s.domain || 'vinted.fr').split(',').map(function (d) { return d.trim(); }).join(', ');
      var filters = [];
      if (s.category && s.category !== 'all') filters.push(s.category === 'clothes' ? 'Одежда' : 'Обувь');
      if (s.size) filters.push('Size: ' + s.size);
      if (s.min_price > 0) filters.push('от ' + s.min_price);
      if (s.max_price > 0) filters.push('до ' + s.max_price);
      if (s.minus_words) filters.push('\u2212' + s.minus_words);

      var condLabels = [];
      try {
        var conds = typeof s.conditions === 'string' ? JSON.parse(s.conditions) : (s.conditions || []);
        conds.forEach(function (c) {
          var f = CONDITIONS.find(function (x) { return x.id === String(c); });
          if (f) condLabels.push(f.label);
        });
      } catch (e) {}

      card.innerHTML =
        '<div class="search-card-top">' +
          '<div>' +
            '<div class="search-card-title">' + escHtml(s.query || '--') + '</div>' +
            '<div class="search-card-meta">' + escHtml(domains) + '</div>' +
          '</div>' +
          '<div class="badge-active">Активен</div>' +
        '</div>' +
        '<div class="search-card-filters">' +
          filters.map(function (f) { return '<span class="filter-tag">' + escHtml(f) + '</span>'; }).join('') +
          condLabels.map(function (c) { return '<span class="filter-tag">' + escHtml(c) + '</span>'; }).join('') +
        '</div>' +
        '<div class="search-card-actions">' +
          '<button class="btn-secondary edit-btn">Изменить</button>' +
          '<button class="btn-danger delete-btn">Удалить</button>' +
        '</div>';

      card.querySelector('.edit-btn').addEventListener('click', function () { startEdit(s); });
      card.querySelector('.delete-btn').addEventListener('click', function () {
        if (confirm('Удалить поиск «' + s.query + '»?')) {
          sendData({ action: 'delete', search_id: s.id });
        }
      });

      searchList.appendChild(card);
    });
  }

  // Edit
  function startEdit(s) {
    editingId = s.id;
    formTitle.textContent = 'Редактирование';
    cancelEditBtn.classList.remove('hidden');
    submitBtn.textContent = 'Сохранить';

    $('#query').value = s.query || '';
    $('#size').value = s.size || '';
    $('#min_price').value = s.min_price || '';
    $('#max_price').value = s.max_price || '';
    $('#minus_words').value = s.minus_words || '';
    $('#category').value = s.category || 'all';

    selectedDomains.clear();
    (s.domain || 'vinted.fr').split(',').forEach(function (d) {
      d = d.trim();
      if (DOMAINS.some(function (x) { return x.value === d; })) selectedDomains.add(d);
    });
    if (!selectedDomains.size) selectedDomains.add('vinted.fr');
    renderDomains();

    selectedConditions.clear();
    try {
      var conds = typeof s.conditions === 'string' ? JSON.parse(s.conditions) : (s.conditions || []);
      conds.forEach(function (c) { selectedConditions.add(String(c)); });
    } catch (e) {}
    renderConditions();

    tabPages.forEach(function (p) { p.classList.remove('active'); });
    navItems.forEach(function (n) { n.classList.remove('active'); });
    $('#tabSearch').classList.add('active');
    navItems[0].classList.add('active');

    $('#formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelEdit() {
    editingId = null;
    formTitle.textContent = 'Новый поиск';
    cancelEditBtn.classList.add('hidden');
    submitBtn.textContent = 'Создать поиск';
    searchForm.reset();
    selectedConditions.clear();
    selectedDomains.clear();
    selectedDomains.add('vinted.fr');
    renderConditions();
    renderDomains();
  }

  cancelEditBtn.addEventListener('click', cancelEdit);

  // Submit
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var query = $('#query').value.trim();
    if (!query) {
      showToast('Введи запрос');
      return;
    }

    var data = {
      query: query,
      domain: Array.from(selectedDomains),
      category: $('#category').value,
      size: $('#size').value.trim(),
      min_price: parseFloat($('#min_price').value) || 0,
      max_price: parseFloat($('#max_price').value) || 0,
      minus_words: $('#minus_words').value.trim(),
      conditions: Array.from(selectedConditions),
    };

    if (editingId) {
      data.action = 'edit';
      data.search_id = editingId;
      showToast('Сохраняю...');
    } else {
      showToast('Создаю поиск...');
    }

    sendData(data);
  });

  // Contact button (in case tg available)
  var contactBtn = $('#contactBtn');
  if (contactBtn) {
    contactBtn.addEventListener('click', function (e) {
      if (tg) {
        e.preventDefault();
        tg.openTelegramLink('https://t.me/liknine');
      }
    });
  }

  // Init
  renderDomains();
  renderConditions();
  renderProfile();
  renderSubscription();
  renderSearches();

})();