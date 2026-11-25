// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the board, the top 10, one protocol's model and farm
// plan, and the live-token comparison. No network: every byte it shows is in
// data.js. The farm plan is the same plan main.ts writes to board.json:
// category, chains, TVL and age, derived from the protocol's own record.

(function () {
  var DATA = window.RADAR;
  if (!DATA) {
    document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px">This page needs data.js beside it. Run main.ts first.</p>');
    return;
  }

  var rows = DATA.rows;
  var live = DATA.live;
  var watchlist = new Set();
  // The watchlist is the board's first watchlist_size rows only when the board
  // is sorted by implied value; instead, recover it from the board's ranks:
  // a row is on the watchlist when its TVL is at or above the floor.
  // (The board is sorted by implied value, so membership is by TVL, not rank.)
  function onWatchlist(r) { return r.tvl_usd >= DATA.floor_usd; }

  function fmtMoney(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + String(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }
  function pctClass(n) {
    if (n === null || n === undefined) return '';
    return n >= 0 ? 'pos' : 'neg';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- facts -------------------------------------------------------------
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  setText('fact-asof', DATA.as_of);
  setText('fact-watchlist', String(DATA.watchlist_size));
  setText('fact-board', String(DATA.board_size) + ' rows');
  setText('fact-model', DATA.model_version);
  setText('foot-model', DATA.model_version);
  setText('foot-asof', DATA.as_of);
  setText('model-source', 'Source: ' + DATA.source + '. Snapshot date ' + DATA.as_of + '. Floor for the watchlist: ' + fmtMoney(DATA.floor_usd) + '.');

  // ---- top 10 ------------------------------------------------------------
  var top10 = document.getElementById('top10');
  rows.slice(0, 10).forEach(function (r) {
    var li = document.createElement('li');
    li.tabIndex = 0;
    li.innerHTML =
      '<div class="rank">#' + r.rank + '</div>' +
      '<div class="name">' + esc(r.name) + '</div>' +
      '<div class="cat">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.slice(0, 2).join(', ') || '—') + '</div>' +
      '<div class="val">' + fmtMoney(r.implied_value_usd) + '</div>' +
      '<div class="tvl">TVL ' + fmtMoney(r.tvl_usd) + '</div>';
    li.addEventListener('click', function () { showDetail(r); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(r); } });
    top10.appendChild(li);
  });

  // ---- filters -----------------------------------------------------------
  var fSearch = document.getElementById('f-search');
  var fCategory = document.getElementById('f-category');
  var fChain = document.getElementById('f-chain');
  var fTvl = document.getElementById('f-tvl');
  var fWatchlist = document.getElementById('f-watchlist');

  var categories = [];
  var chains = [];
  rows.forEach(function (r) {
    if (r.category && categories.indexOf(r.category) < 0) categories.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  categories.sort();
  chains.sort();
  categories.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    fCategory.appendChild(o);
  });
  chains.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    fChain.appendChild(o);
  });

  var sortKey = 'rank';
  var sortDir = 1;
  var selectedSlug = null;

  function filtered() {
    var q = fSearch.value.trim().toLowerCase();
    var cat = fCategory.value;
    var ch = fChain.value;
    var minTvl = Number(fTvl.value);
    var wl = fWatchlist.checked;
    return rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      if (cat && r.category !== cat) return false;
      if (ch && r.chains.indexOf(ch) < 0) return false;
      if (minTvl && r.tvl_usd < minTvl) return false;
      if (wl && !onWatchlist(r)) return false;
      return true;
    });
  }

  function sorted(list) {
    var k = sortKey;
    var d = sortDir;
    return list.slice().sort(function (a, b) {
      var av = a[k], bv = b[k];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * d;
      return (av - bv) * d;
    });
  }

  var tbody = document.getElementById('board-body');
  var empty = document.getElementById('board-empty');
  var rowCount = document.getElementById('row-count');

  function renderBoard() {
    var list = sorted(filtered());
    tbody.innerHTML = '';
    list.forEach(function (r) {
      var tr = document.createElement('tr');
      if (r.slug === selectedSlug) tr.className = 'selected';
      tr.innerHTML =
        '<td class="num">' + r.rank + '</td>' +
        '<td><strong>' + esc(r.name) + '</strong><span class="sub">' + esc(r.slug) + (onWatchlist(r) ? ' · watchlist' : ' · early') + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ') || '—') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + fmtMoney(r.tvl_usd) + '</td>' +
        '<td class="num"><span class="' + pctClass(r.change_7d) + '">' + fmtPct(r.change_7d) + '</span></td>' +
        '<td class="num"><strong>' + fmtMoney(r.implied_value_usd) + '</strong></td>';
      tr.addEventListener('click', function () { showDetail(r); });
      tbody.appendChild(tr);
    });
    empty.hidden = list.length > 0;
    rowCount.textContent = list.length + ' of ' + rows.length + ' rows';
    document.querySelectorAll('#board-table .sort').forEach(function (b) {
      b.removeAttribute('aria-sort');
      if (b.getAttribute('data-sort') === sortKey) b.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
    });
  }

  document.querySelectorAll('#board-table .sort').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-sort');
      if (sortKey === k) sortDir = -sortDir;
      else { sortKey = k; sortDir = k === 'name' || k === 'category' ? 1 : -1; }
      renderBoard();
    });
  });
  [fSearch, fCategory, fChain, fTvl, fWatchlist].forEach(function (el) {
    el.addEventListener('input', renderBoard);
    el.addEventListener('change', renderBoard);
  });
  document.getElementById('f-reset').addEventListener('click', function () {
    fSearch.value = '';
    fCategory.value = '';
    fChain.value = '';
    fTvl.value = '0';
    fWatchlist.checked = false;
    renderBoard();
  });

  // ---- detail ------------------------------------------------------------
  var detail = document.getElementById('detail');
  function showDetail(r) {
    selectedSlug = r.slug;
    renderBoard();
    document.getElementById('detail-rank').textContent = 'RANK #' + r.rank + ' · ' + (onWatchlist(r) ? 'WATCHLIST' : 'EARLY ROW');
    document.getElementById('detail-h').textContent = r.name;
    document.getElementById('detail-sub').textContent =
      (r.category || 'Uncategorised') + ' · ' + (r.chains.join(', ') || 'no chain listed') +
      ' · TVL ' + fmtMoney(r.tvl_usd) + ' · 7d ' + fmtPct(r.change_7d) +
      (r.age_days === null ? ' · age unknown' : ' · ' + r.age_days + ' days old');
    var m = document.getElementById('detail-model');
    var growthPct = r.change_7d === null ? 0 : Math.min(DATA.model.growth_cap, Math.max(DATA.model.growth_floor, r.change_7d));
    m.innerHTML =
      '<dt>TVL</dt><dd>' + fmtMoney(r.tvl_usd) + '</dd>' +
      '<dt>Category multiple</dt><dd>× ' + r.category_multiple.toFixed(2) + ' (' + esc(r.category || 'default') + ')</dd>' +
      '<dt>Growth (7d ' + fmtPct(growthPct) + ')</dt><dd>× ' + r.growth_multiplier.toFixed(4) + '</dd>' +
      '<dt>Maturity (' + (r.age_days === null ? 'age unknown, scored as 365 days' : r.age_days + ' days') + ')</dt><dd>× ' + r.maturity_multiplier.toFixed(4) + '</dd>' +
      '<dt>Chains (' + r.chains.length + ')</dt><dd>× ' + r.chain_multiplier.toFixed(4) + '</dd>' +
      '<dt>Implied value</dt><dd><strong>' + fmtMoney(r.implied_value_usd) + '</strong></dd>';
    document.getElementById('detail-formula').textContent =
      'implied = ' + fmtMoney(r.tvl_usd) + ' × ' + r.category_multiple.toFixed(2) + ' × ' + r.growth_multiplier.toFixed(4) + ' × ' + r.maturity_multiplier.toFixed(4) + ' × ' + r.chain_multiplier.toFixed(4) + ' = ' + fmtMoney(r.implied_value_usd) + '.';
    var steps = document.getElementById('detail-steps');
    steps.innerHTML = '';
    r.farm_steps.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      steps.appendChild(li);
    });
    detail.hidden = false;
    detail.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  document.getElementById('detail-close').addEventListener('click', function () {
    detail.hidden = true;
    selectedSlug = null;
    renderBoard();
  });

  // ---- live tokens ---------------------------------------------------------
  var liveBody = document.getElementById('live-body');
  live.forEach(function (p) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + esc(p.name) + '</strong><span class="sub">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td>' +
      '<td>' + esc(p.chains.slice(0, 3).join(', ') || '—') + '</td>' +
      '<td class="num">' + fmtMoney(p.tvl_usd) + '</td>' +
      '<td class="num"><strong>' + fmtMoney(p.mcap_usd) + '</strong></td>' +
      '<td class="num"><span class="' + pctClass(p.change_7d) + '">' + fmtPct(p.change_7d) + '</span></td>';
    liveBody.appendChild(tr);
  });

  // ---- deep links ----------------------------------------------------------
  // #detail=<slug> opens one protocol's detail; #category=<name>,
  // #chain=<name> and #watchlist=1 pre-set the board's filters. This is how
  // the three screenshots are taken: the board, one detail, one filtered view.
  function applyHash() {
    var h = location.hash.replace(/^#/, '');
    if (!h) return null;
    var params = new URLSearchParams(h);
    var cat = params.get('category');
    var ch = params.get('chain');
    if (cat) fCategory.value = cat;
    if (ch) fChain.value = ch;
    if (params.get('watchlist') === '1') fWatchlist.checked = true;
    var slug = params.get('detail');
    if (slug) {
      var found = null;
      rows.forEach(function (r) { if (r.slug === slug) found = r; });
      return found;
    }
    return null;
  }

  var deepDetail = applyHash();
  renderBoard();
  if (deepDetail) showDetail(deepDetail);
})();
