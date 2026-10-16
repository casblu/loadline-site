(function () {
  'use strict';
  var S = window.Sonify, $ = function (id) { return document.getElementById(id); };
  var MAXPTS = 240, series = [], cur = null, view = [], plan = null, player = null, raf = 0, own = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function link(u) { return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a>' : 'not given'; }

  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' → ' + r.status); return r.json(); }); }

  function build() {
    return Promise.all([getJSON('data/ercot-day.json'), getJSON('data/ercot-history.json'), getJSON('data/ai-datacenters.json')]).then(function (a) {
      var day = a[0], hist = a[1], ai = a[2], m = ai.meta, es = m.primary_source;
      var ercotNote = 'System-wide Texas grid only; data-center load is not metered separately.';
      series.push({ id: 'ercot-day', label: 'ERCOT demand today (5-minute)', unit: 'MW', source: 'ERCOT public dashboards', url: day.source_url, reported: 'Published ' + day.source_updated_at + ' (CT); fetched ' + day.fetched_at, note: ercotNote + ' Actual readings so far in the current ERCOT operating day.', pts: day.points.map(function (p) { return { t: p.t, v: p.demand_mw, label: p.t.slice(11, 16) + ' CT' }; }) });
      series.push({ id: 'ercot-cap-day', label: 'ERCOT available capacity today (5-minute)', unit: 'MW', source: 'ERCOT public dashboards', url: day.source_url, reported: 'Published ' + day.source_updated_at + ' (CT); fetched ' + day.fetched_at, note: ercotNote, pts: day.points.filter(function (p) { return p.capacity_mw != null; }).map(function (p) { return { t: p.t, v: p.capacity_mw, label: p.t.slice(11, 16) + ' CT' }; }) });
      series.push({ id: 'ercot-hist', label: 'ERCOT demand, hourly history', unit: 'MW', source: 'ERCOT public dashboards, hourly readings stored by this site', url: hist.source_url, reported: 'Readings ' + (hist.points[0] || {}).t + ' to ' + (hist.points[hist.points.length - 1] || {}).t + ' (CT); fetched ' + hist.fetched_at, note: hist.note + ' ' + ercotNote, pts: hist.points.map(function (p) { return { t: p.t, v: p.demand_mw, label: p.t.slice(5, 16) + ' CT' }; }) });
      var base = { source: es.name + ' (CC BY 4.0)', url: es.url, reported: 'Dataset generated ' + m.generated_utc + ' UTC; each site value carries its own "as of" date (shown in the table label)', note: 'A ranked list of sites, not a time series. Mostly Epoch AI estimates, not company-reported.' };
      function ranked(id, label, unit, field, noteX) {
        var rows = ai.sites.filter(function (s) { return s[field] && typeof s[field].value === 'number'; }).sort(function (x, y) { return y[field].value - x[field].value; });
        series.push({ id: id, label: label, unit: unit, source: base.source, url: base.url, reported: base.reported, note: base.note + (noteX || ''), ordered: true,
          pts: rows.map(function (s, i) { return { t: i, v: s[field].value, label: '#' + (i + 1) + ' ' + s.name + (s[field].as_of ? ' (as of ' + s[field].as_of + ')' : ''), }; }) });
      }
      // capacity fields are plain values in some builds; support both shapes
      ai.sites.forEach(function (s) { ['capacity_it_mw_estimate', 'capacity_it_mw_projected_max'].forEach(function (k) { if (typeof s[k] === 'number') s[k] = { value: s[k] }; }); });
      ranked('ai-cap', 'AI data centers: estimated IT capacity, largest to smallest', 'MW', 'capacity_it_mw_estimate', ' IT power, not total facility power.');
      ranked('ai-proj', 'AI data centers: projected maximum IT capacity, largest to smallest', 'MW', 'capacity_it_mw_projected_max', ' Projection, not current.');
      var ts = ai.sites.filter(function (s) { return s.capacity_it_mw_estimate && typeof s.capacity_it_mw_estimate.value === 'number' && s.capacity_it_mw_estimate.as_of; }).sort(function (x, y) { return x.capacity_it_mw_estimate.as_of < y.capacity_it_mw_estimate.as_of ? -1 : 1; });
      series.push({ id: 'ai-time', label: 'AI data centers: estimated IT capacity by "as of" date', unit: 'MW', source: base.source, url: base.url, reported: base.reported, note: 'Each site is placed at the date of its latest Epoch estimate. Points are different sites, so this shows which dates have large estimates, not growth of one site.', pts: ts.map(function (s) { return { t: s.capacity_it_mw_estimate.as_of, v: s.capacity_it_mw_estimate.value, label: s.capacity_it_mw_estimate.as_of + ' ' + s.name }; }) });
    });
  }

  function fillSelect() {
    $('series').innerHTML = series.map(function (s, i) { return '<option value="' + i + '">' + esc(s.label) + '</option>'; }).join('');
  }

  function select(i) {
    stop(); cur = series[i];
    var pts = S.normalize(cur.pts.map(function (p) { return { t: p.t, v: p.v, label: p.label }; }));
    if (cur.ordered) pts.forEach(function (p, k) { p.t = k; });
    cur.n = pts; view = S.downsample(pts, MAXPTS);
    var shown = view.length < pts.length ? ' (' + pts.length + ' points averaged into ' + view.length + ' for playback)' : '';
    $('meta').innerHTML = '<b>Source:</b> ' + esc(cur.source) + '<br><b>Link:</b> ' + link(cur.url) + '<br><b>Reported / dated:</b> ' + esc(cur.reported) + '<br><b>Points:</b> ' + pts.length + shown + '<br><span class="tiny">' + esc(cur.note) + '</span>';
    $('alt').textContent = S.summarize(view, cur.unit);
    $('chart').setAttribute('aria-label', cur.label + '. ' + S.summarize(view, cur.unit));
    $('tbl').tBodies[0].innerHTML = pts.map(function (p) { return '<tr><td>' + esc(p.label) + '</td><td class="n">' + S.fmt(p.v) + (cur.unit ? ' ' + esc(cur.unit) : '') + '</td></tr>'; }).join('');
    $('tbl').tHead.rows[0].cells[1].textContent = 'Value' + (cur.unit ? ' (' + cur.unit + ')' : '');
    replan(); draw(0);
  }

  function opts() { return { mode: $('mapping').value, scale: $('scale').value, octaves: +$('octaves').value, speed: +$('speed').value }; }
  function replan() { plan = view.length ? S.plan(view, opts()) : null; }

  function draw(pos) {
    var c = $('chart'), g = c.getContext('2d'), W = c.width, H = c.height, P = { l: 56, r: 14, t: 14, b: 26 };
    g.clearRect(0, 0, W, H);
    if (!view.length) return;
    var e = S.extent(view), lo = e[0], hi = e[1] === e[0] ? e[0] + 1 : e[1];
    function X(i) { return P.l + (view.length < 2 ? 0.5 : i / (view.length - 1)) * (W - P.l - P.r); }
    function Y(v) { return P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b); }
    g.font = '12px system-ui,sans-serif'; g.fillStyle = '#93a0bd'; g.strokeStyle = '#1f2b47'; g.lineWidth = 1;
    for (var k = 0; k <= 3; k++) { var v = lo + (hi - lo) * k / 3, y = Y(v); g.beginPath(); g.moveTo(P.l, y); g.lineTo(W - P.r, y); g.stroke(); g.fillText(S.fmt(v), 4, y + 4); }
    g.fillText(view[0].label, P.l, H - 8); var lt = view[view.length - 1].label; g.textAlign = 'right'; g.fillText(lt, W - P.r, H - 8); g.textAlign = 'left';
    g.strokeStyle = '#f7931a'; g.lineWidth = 2.5; g.beginPath();
    view.forEach(function (p, i) { i ? g.lineTo(X(i), Y(p.v)) : g.moveTo(X(i), Y(p.v)); }); g.stroke();
    // playhead: find current note
    var idx = 0;
    if (plan && pos > 0) { for (var j = 0; j < plan.notes.length; j++) { if (plan.notes[j].time <= pos) idx = j; else break; } }
    if (pos > 0 || (player && player.state !== 'stopped')) {
      var x = X(idx); g.strokeStyle = '#6ea8ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, P.t); g.lineTo(x, H - P.b); g.stroke();
      g.fillStyle = '#6ea8ff'; g.beginPath(); g.arc(x, Y(view[idx].v), 5, 0, 7); g.fill();
      $('readout').innerHTML = '<b>' + esc(view[idx].label) + '</b>: ' + S.fmt(view[idx].v) + (cur.unit ? ' ' + esc(cur.unit) : '');
    }
  }

  function loop() { draw(player ? player.position() : 0); if (player && player.state === 'playing') raf = requestAnimationFrame(loop); }
  function setPlay(txt, status) { $('play').textContent = txt; $('status').textContent = status; }
  function toggle() {
    if (!view.length) return;
    try {
      if (player && player.state === 'playing') { player.pause(); setPlay('▶ Resume', 'Paused.'); return; }
      if (player && player.state === 'paused') { player.resume(); setPlay('❚❚ Pause', 'Playing.'); loop(); return; }
      replan(); player = new S.Player(function (st) { if (st === 'ended') { setPlay('▶ Play again', 'Finished.'); draw(player.plan.total); } });
      player.play(plan, { wave: $('wave').value, volume: +$('vol').value });
      setPlay('❚❚ Pause', 'Playing ' + cur.label + '.'); loop();
    } catch (err) { $('status').textContent = 'Could not play audio: ' + err.message; }
  }
  function stop() { cancelAnimationFrame(raf); if (player) player.stop(); player = null; setPlay('▶ Play', 'Stopped.'); $('readout').innerHTML = '&nbsp;'; if (view.length) draw(0); }

  // ---- own data ----
  function showOwn(table) {
    var nc = S.numericColumns(table);
    if (!table.rows.length || !nc.length) { $('cols').hidden = true; $('ownmsg').textContent = 'No numeric column found. Check the data has a column of numbers.'; return; }
    own = table; var opts = table.columns.map(function (c, i) { return '<option value="' + i + '">' + esc(c) + '</option>'; }).join('');
    $('valcol').innerHTML = nc.map(function (i) { return '<option value="' + i + '">' + esc(table.columns[i]) + '</option>'; }).join('');
    $('timecol').innerHTML = '<option value="-1">(row order)</option>' + opts;
    var guess = table.columns.map(function (c, i) { return /time|date|day|when|year|month|stamp/i.test(c) ? i : -1; }).filter(function (i) { return i >= 0 && nc.indexOf(i) < 0 || (i >= 0 && nc.length > 1 && i !== nc[nc.length - 1]); })[0];
    if (guess != null) { $('timecol').value = guess; var other = nc.filter(function (i) { return i !== guess; })[0]; if (other != null) $('valcol').value = other; }
    $('cols').hidden = false; $('ownmsg').textContent = table.rows.length + ' rows read. Pick columns, then press “Sonify this”.';
  }
  function parseText(t) {
    t = t.trim(); if (!t) { $('ownmsg').textContent = 'Nothing to read yet.'; return; }
    try { showOwn(/^[\[{]/.test(t) ? S.tableFromJSON(JSON.parse(t)) : S.parseCSV(t)); } catch (e) { $('ownmsg').textContent = 'Could not read that: ' + e.message; }
  }
  function applyOwn() {
    var pts = S.pointsFromTable(own, +$('valcol').value, +$('timecol').value);
    if (!pts.length) { $('ownmsg').textContent = 'No numeric values in that column.'; return; }
    var name = $('ownname').value || 'My data', unit = $('ownunit').value, src = $('ownsrc').value;
    var s = { id: 'own', label: 'Yours: ' + name, unit: unit, source: src || 'Provided by you (not verified by Loadline)', url: '', reported: src ? 'As stated by you' : 'No date given', note: 'Your data stays in this browser tab.', pts: pts, ordered: false };
    var ix = series.findIndex(function (x) { return x.id === 'own'; });
    if (ix >= 0) series[ix] = s; else series.push(s);
    fillSelect(); var k = series.indexOf(s); $('series').value = k; select(k);
    $('player').scrollIntoView({ behavior: 'smooth' });
  }

  function init() {
    ['mapping', 'scale', 'wave'].forEach(function (id) { $(id).addEventListener('change', function () { stop(); replan(); }); });
    $('octaves').addEventListener('input', function () { $('octout').textContent = this.value; });
    $('octaves').addEventListener('change', function () { stop(); replan(); });
    $('speed').addEventListener('input', function () { $('speedout').textContent = this.value + '×'; });
    $('speed').addEventListener('change', function () { stop(); replan(); });
    $('vol').addEventListener('input', function () { if (player && player.master) player.master.gain.value = +this.value; });
    $('series').addEventListener('change', function () { select(+this.value); });
    $('play').addEventListener('click', toggle); $('stop').addEventListener('click', stop);
    $('chart').addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } else if (e.key === 'Escape') stop(); });
    $('usepaste').addEventListener('click', function () { parseText($('paste').value); });
    $('sample').addEventListener('click', function () { $('paste').value = 'time,temperature_c\n2026-10-01,12.4\n2026-10-02,14.1\n2026-10-03,9.8\n2026-10-04,11.2\n2026-10-05,16.7\n2026-10-06,18.3\n2026-10-07,13.5'; parseText($('paste').value); $('ownname').value = 'Sample temperatures'; $('ownunit').value = '°C'; $('ownsrc').value = 'Made-up sample, for demonstration only'; });
    $('loadurl').addEventListener('click', function () {
      var u = $('url').value.trim(); if (!u) return; $('ownmsg').textContent = 'Loading…';
      fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (t) { $('paste').value = t.slice(0, 200000); $('ownsrc').value = u + ', loaded ' + new Date().toISOString().slice(0, 10); parseText(t); })
        .catch(function (e) { $('ownmsg').textContent = 'Could not load that URL (' + e.message + '). It may block cross-origin requests. Download it and paste it instead.'; });
    });
    $('applyown').addEventListener('click', applyOwn);
    build().then(function () { fillSelect(); var d = series[0].pts.length >= 24 ? 0 : 2; $('series').value = d; select(d); }).catch(function (e) { $('status').textContent = 'Could not load site data: ' + e.message + '. You can still paste your own data below.'; });
  }
  init();
})();
