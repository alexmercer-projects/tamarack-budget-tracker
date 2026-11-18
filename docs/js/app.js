/* Tamarack Build Co. tracker, concept demo. Every figure on the page is calculated here from js/data.js (example data). */
(function () {
  'use strict';
  var D = window.TRACKER_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function money(n, cents) {
    var neg = n < 0; n = Math.abs(n);
    var s = n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
    return (neg ? '−$' : '$') + s;
  }
  function short(n) {
    var a = Math.abs(n), s;
    if (a >= 1e6) s = (a / 1e6).toFixed(2) + 'M'; else if (a >= 1e3) s = (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k'; else s = Math.round(a);
    return (n < 0 ? '−$' : '$') + s;
  }
  function pct(n) { return (n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0) + '%'; }
  function dt(s, year) { var p = s.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]) + (year ? ', ' + p[0] : ''); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sum(a, f) { return a.reduce(function (t, x) { return t + f(x); }, 0); }
  function r2(n) { return Math.round(n * 100) / 100; }

  /* ---------- rollups (same logic as the workbook's SUMIFS) ---------- */
  var cats = D.budget.map(function (b, i) {
    var pays = D.payments.filter(function (p) { return p.cat === b.cat; });
    var co = r2(sum(D.changeOrders.filter(function (c) { return c.cat === b.cat && c.status === 'Approved'; }), function (c) { return c.amount; }));
    var revised = b.budget + co, paid = r2(sum(pays, function (p) { return p.amount; }));
    var share = revised ? paid / revised : 0;
    var status = paid > revised ? 'over' : paid === 0 ? 'none' : share >= 0.9 ? 'watch' : 'ok';
    return { i: i, cat: b.cat, budget: b.budget, co: co, revised: revised, paid: paid, left: r2(revised - paid), share: share, status: status,
      missing: pays.filter(function (p) { return p.receipt !== 'Yes'; }).length, n: pays.length };
  });
  var T = {
    budget: sum(cats, function (c) { return c.budget; }),
    co: r2(sum(cats, function (c) { return c.co; })),
    revised: sum(cats, function (c) { return c.revised; }),
    paid: r2(sum(D.payments, function (p) { return p.amount; }))
  };
  T.left = r2(T.revised - T.paid);
  var pendingCOs = D.changeOrders.filter(function (c) { return c.status === 'Pending'; });
  var missing = D.payments.filter(function (p) { return p.receipt !== 'Yes'; });
  var unsigned = D.changeOrders.filter(function (c) { return c.status === 'Approved' && c.signed !== 'Yes'; });
  var over = cats.filter(function (c) { return c.status === 'over'; });
  var bySource = {};
  D.payments.forEach(function (p) { bySource[p.source] = r2((bySource[p.source] || 0) + p.amount); });
  var STATUS = { over: 'Over budget', watch: 'Watch', ok: 'On track', none: 'Not started' };

  /* ---------- header + KPIs ---------- */
  $('#p-name').textContent = D.project.project.replace(/^Example /, '').replace(/^./, function (c) { return c.toUpperCase(); });
  $('#p-addr').textContent = D.project.address;
  $('#p-asof').textContent = dt(D.project.asOf, true);
  var K = {
    remaining: money(T.left, true),
    remainingSub: pct(T.left / T.revised) + ' of the revised budget left to pay',
    revised: money(T.revised),
    revisedSub: money(T.budget) + ' original ' + (T.co >= 0 ? '+ ' : '− ') + money(Math.abs(T.co)) + ' approved COs',
    paid: money(T.paid, true),
    paidSub: D.payments.length + ' payments · ' + pct(T.paid / T.revised) + ' of budget',
    pending: money(sum(pendingCOs, function (c) { return c.amount; })),
    pendingSub: pendingCOs.length + ' waiting on approval, not in budget yet',
    missing: String(missing.length),
    missingSub: money(sum(missing, function (p) { return p.amount; }), true) + ' paid without one'
  };
  $$('[data-k]').forEach(function (el) { el.textContent = K[el.getAttribute('data-k')]; });

  /* paid meter, split by source */
  var srcKeys = Object.keys(bySource).sort(function (a, b) { return bySource[b] - bySource[a]; });
  $('#meter-bar').innerHTML = srcKeys.map(function (k, i) {
    return '<span class="meter__seg meter__seg--' + i + '" style="width:' + (bySource[k] / T.revised * 100).toFixed(3) + '%"></span>';
  }).join('');
  $('#meter-legend').innerHTML = srcKeys.map(function (k, i) {
    return '<span><i class="dot dot--' + i + '"></i>' + esc(k) + ' <b>' + money(bySource[k]) + '</b></span>';
  }).join('') + '<span><i class="dot dot--left"></i>Remaining <b>' + money(T.left) + '</b></span>';

  /* ---------- categories ---------- */
  var sortBy = 'order';
  function renderCats() {
    var list = cats.slice();
    if (sortBy === 'pct') list.sort(function (a, b) { return b.share - a.share; });
    if (sortBy === 'left') list.sort(function (a, b) { return b.left - a.left; });
    $('#cats').innerHTML = list.map(function (c) {
      var w = Math.min(c.share, 1) * 100, extra = c.share > 1 ? Math.max((c.share - 1) / c.share * 100, 3) : 0;
      var co = c.co ? '<span class="cat__co">' + (c.co > 0 ? '+' : '−') + money(Math.abs(c.co)) + ' CO</span>' : '';
      var miss = c.missing ? '<span class="cat__miss" title="Payments without a receipt">' + c.missing + ' no receipt</span>' : '';
      return '<li class="cat cat--' + c.status + ' rv">' +
        '<button type="button" class="cat__btn" data-cat="' + esc(c.cat) + '" aria-label="' + esc(c.cat) + ': ' + money(c.paid, true) + ' paid of ' + money(c.revised) + ', ' + STATUS[c.status] + '. Show its payments.">' +
        '<span class="cat__name"><b>' + esc(c.cat) + '</b><span class="cat__meta"><span class="chip chip--' + c.status + '">' + STATUS[c.status] + '</span>' + co + miss + '</span></span>' +
        '<span class="cat__bar"><span class="track"><span class="fill" style="width:' + w.toFixed(2) + '%"></span>' + (extra ? '<span class="overflow" style="width:' + extra.toFixed(2) + '%"></span>' : '') + '</span>' +
        '<span class="cat__pct">' + pct(c.share) + ' of ' + money(c.revised) + '</span></span>' +
        '<span class="cat__paid r">' + money(c.paid, true) + '</span>' +
        '<span class="cat__left r' + (c.left < 0 ? ' neg' : '') + '">' + money(c.left, true) + '</span>' +
        '</button></li>';
    }).join('');
    $('#cats-foot').innerHTML = '<span><b>Total</b> · ' + cats.length + ' categories · ' + pct(T.paid / T.revised) + ' of ' + money(T.revised) + '</span>' +
      '<span class="r"><b>' + money(T.paid, true) + '</b></span><span class="r"><b>' + money(T.left, true) + '</b></span>';
    reveal();
  }
  $$('[data-sort]').forEach(function (b) {
    b.addEventListener('click', function () {
      sortBy = b.getAttribute('data-sort');
      $$('[data-sort]').forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
      renderCats();
    });
  });
  $('#cats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    F.cat = b.getAttribute('data-cat'); $('#f-cat').value = F.cat; renderPays();
    $('#payments').scrollIntoView({ behavior: document.documentElement.classList.contains('anim') ? 'smooth' : 'auto' });
  });

  /* ---------- payments ---------- */
  var F = { q: '', cat: '', method: '', src: '', rec: '' }, showAll = false, LIMIT = 10;
  $('#pay-more').addEventListener('click', function () { showAll = !showAll; renderPays(); });
  function fillSelect(sel, vals) { vals.forEach(function (v) { var o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); }); }
  fillSelect($('#f-cat'), D.budget.map(function (b) { return b.cat; }).filter(function (c) { return D.payments.some(function (p) { return p.cat === c; }); }));
  fillSelect($('#f-method'), D.payments.map(function (p) { return p.method; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
  fillSelect($('#f-src'), srcKeys);
  function renderPays() {
    var q = F.q.trim().toLowerCase();
    var rows = D.payments.filter(function (p) {
      return (!F.cat || p.cat === F.cat) && (!F.method || p.method === F.method) && (!F.src || p.source === F.src) &&
        (!F.rec || p.receipt === F.rec) && (!q || (p.to + ' ' + p.inv + ' ' + p.note + ' ' + p.cat).toLowerCase().indexOf(q) > -1);
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var filtered = F.q || F.cat || F.method || F.src || F.rec;
    var all = rows; if (!filtered && !showAll && rows.length > LIMIT) rows = rows.slice(0, LIMIT);
    $('#pay-more-wrap').hidden = rows.length === all.length && !showAll || !!filtered;
    $('#pay-more').textContent = showAll ? 'Show the latest ' + LIMIT + ' only' : 'Show all ' + all.length + ' payments';
    $('#pay-body').innerHTML = rows.length ? rows.map(function (p) {
      var bad = p.receipt !== 'Yes';
      return '<tr class="' + (bad ? 'is-miss' : '') + '">' +
        '<td class="c-date" data-x="' + esc(' · ' + p.cat + ' · ' + p.method + (p.draw ? ' · Draw ' + p.draw : '')) + '"><time datetime="' + p.date + '">' + dt(p.date) + '</time></td>' +
        '<td class="c-to"><b>' + esc(p.to) + '</b><small>' + esc(p.inv) + ' · ' + esc(p.note) + (p.draw ? '<span class="c-draw"> · Draw ' + p.draw + '</span>' : '') + '</small></td>' +
        '<td class="c-cat" data-l="Category">' + esc(p.cat) + '</td>' +
        '<td class="c-m" data-l="Method">' + esc(p.method) + '</td>' +
        '<td class="c-src" data-l="From">' + esc(p.source) + '</td>' +
        '<td class="c-amt r">' + money(p.amount, true) + '</td>' +
        '<td class="c-rec">' + (bad ? '<span class="flag">Missing</span>' : '<span class="ok"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>On file</span>') + '</td></tr>';
    }).join('') : '<tr class="empty"><td colspan="7">No payments match these filters.</td></tr>';
    var tot = r2(sum(all, function (p) { return p.amount; }));
    $('#pay-total').textContent = money(tot, true);
    $('#pay-tlabel').textContent = 'Total, ' + all.length + ' payment' + (all.length === 1 ? '' : 's');
    $('#pay-count').innerHTML = (filtered ? '<b>' + all.length + '</b> of ' + D.payments.length + ' payments match' : rows.length < all.length ? 'Latest <b>' + rows.length + '</b> of ' + all.length + ' payments' : 'All <b>' + all.length + '</b> payments') +
      ' · <b>' + money(tot, true) + '</b>' + (F.cat ? ' · ' + esc(F.cat) : '');
    $('#f-clear').hidden = !filtered;
  }
  $('#f-q').addEventListener('input', function (e) { F.q = e.target.value; renderPays(); });
  $('#f-cat').addEventListener('change', function (e) { F.cat = e.target.value; renderPays(); });
  $('#f-method').addEventListener('change', function (e) { F.method = e.target.value; renderPays(); });
  $('#f-src').addEventListener('change', function (e) { F.src = e.target.value; renderPays(); });
  function setRec(v) {
    F.rec = v;
    $$('[data-rec]').forEach(function (x) { var on = x.getAttribute('data-rec') === v; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
    renderPays();
  }
  $$('[data-rec]').forEach(function (b) { b.addEventListener('click', function () { setRec(b.getAttribute('data-rec')); }); });
  $('#f-clear').addEventListener('click', function () {
    F.q = F.cat = F.method = F.src = ''; $('#f-q').value = ''; $('#f-cat').value = ''; $('#f-method').value = ''; $('#f-src').value = ''; setRec('');
  });

  /* ---------- change orders ---------- */
  var coBy = function (s) { return D.changeOrders.filter(function (c) { return c.status === s; }); };
  $('#co-sum').innerHTML = ['Approved', 'Pending', 'Declined'].map(function (s) {
    var l = coBy(s), amt = sum(l, function (c) { return c.amount; });
    return '<div class="co-sum__i co-sum__i--' + s.toLowerCase() + '"><span>' + s + '</span><b>' + (amt > 0 ? '+' : '') + money(amt) + '</b><small>' + l.length + ' change order' + (l.length === 1 ? '' : 's') + (s === 'Approved' ? ', in budget' : s === 'Pending' ? ', not in budget' : '') + '</small></div>';
  }).join('');
  $('#cos').innerHTML = D.changeOrders.slice().reverse().map(function (c) {
    var st = c.status.toLowerCase(), needSig = c.status === 'Approved' && c.signed !== 'Yes';
    return '<li class="co co--' + st + ' rv"><div class="co__top"><span class="co__no">' + c.no + '</span><span class="chip chip--' + st + '">' + c.status + '</span>' +
      (needSig ? '<span class="flag">Not signed</span>' : c.signed === 'Yes' ? '<span class="co__sig">Signed</span>' : '') +
      '<b class="co__amt' + (c.amount < 0 ? ' is-credit' : '') + '">' + (c.amount > 0 ? '+' : '') + money(c.amount) + '</b></div>' +
      '<p class="co__desc">' + esc(c.desc) + '</p><p class="co__meta">' + esc(c.cat) + ' · ' + esc(c.who) + ' · ' + dt(c.date) + '</p></li>';
  }).join('');

  /* ---------- needs attention ---------- */
  var attn = [];
  over.forEach(function (c) { attn.push({ k: 'red', h: c.cat + ' is ' + money(-c.left, true) + ' over', p: money(c.paid, true) + ' paid against a revised budget of ' + money(c.revised) + '.' }); });
  missing.slice().sort(function (a, b) { return b.amount - a.amount; }).forEach(function (p) {
    attn.push({ k: 'amber', h: 'Receipt missing: ' + p.to, p: money(p.amount, true) + ' on ' + dt(p.date) + ' · ' + p.inv + ' · ' + p.cat });
  });
  unsigned.forEach(function (c) { attn.push({ k: 'amber', h: c.no + ' approved but not signed', p: c.desc + ', ' + money(c.amount) + '.' }); });
  pendingCOs.forEach(function (c) { attn.push({ k: 'blue', h: c.no + ' waiting on a decision', p: c.desc + ', ' + money(c.amount) + ' if approved.' }); });
  $('#attn').innerHTML = attn.map(function (a) { return '<li class="attn__i attn__i--' + a.k + '"><b>' + esc(a.h) + '</b><span>' + esc(a.p) + '</span></li>'; }).join('');

  /* ---------- by month (SVG) ---------- */
  var months = {};
  D.payments.forEach(function (p) { var k = p.date.slice(0, 7); months[k] = r2((months[k] || 0) + p.amount); });
  var mk = Object.keys(months).sort(), max = Math.max.apply(null, mk.map(function (k) { return months[k]; }));
  var W = 340, H = 150, pad = 22, bw = (W - 10) / mk.length;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 34) + '" role="img" aria-label="Amount paid each month: ' + mk.map(function (k) { return MON[+k.slice(5) - 1] + ' ' + money(months[k]); }).join(', ') + '">';
  mk.forEach(function (k, i) {
    var h = Math.max(2, (months[k] / max) * (H - pad)), x = 5 + i * bw + bw * 0.18, w = bw * 0.64, y = H - h;
    svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"/>' +
      '<text class="v" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 7).toFixed(1) + '">' + short(months[k]) + '</text>' +
      '<text class="m" x="' + (x + w / 2).toFixed(1) + '" y="' + (H + 22) + '">' + MON[+k.slice(5) - 1] + '</text>';
  });
  svg += '<line x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '"/></svg>';
  $('#months').innerHTML = svg;

  /* ---------- fade-ins (off with ?static or reduced motion) ---------- */
  var io = null, root = document.documentElement;
  if (root.classList.contains('anim') && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
  } else root.classList.remove('anim');
  function reveal() { if (!io) return; $$('.rv:not(.in)').forEach(function (el, i) { el.style.transitionDelay = (i % 6) * 40 + 'ms'; io.observe(el); }); }

  renderCats(); renderPays(); reveal();
})();
