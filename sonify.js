/* Loadline sonify.js — tiny, dependency-free data sonification module.
   Accepts any array of {t, v, label?} points (t = number | Date | date string | omitted).
   Works in browsers (window.Sonify) and Node (module.exports) so the mapping logic is testable. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sonify = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SCALES = {
    pentatonic: [0, 2, 4, 7, 9],
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  };
  var MODES = { // which dimensions the value drives
    pitch: { pitch: 1 }, pitchvol: { pitch: 1, vol: 1 }, pitchbright: { pitch: 1, bright: 1 },
    volume: { vol: 1 }, tempo: { tempo: 1 }, timbre: { bright: 1 }
  };

  function toTime(t, i) {
    if (t == null || t === '') return i;
    if (typeof t === 'number') return t;
    if (t instanceof Date) return t.getTime();
    var s = String(t).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    var iso = s.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    var ms = Date.parse(iso);
    return isNaN(ms) ? i : ms;
  }
  function isTimeLike(points) { return points.some(function (p) { return typeof p.t === 'number' && p.t > 1e11; }); }

  /* Clean to [{t, v, label}], drop non-finite values, sort by t when time given. */
  function normalize(raw) {
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i], v = (r && typeof r === 'object') ? r.v : r;
      v = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : v;
      if (typeof v !== 'number' || !isFinite(v)) continue;
      var tv = (r && typeof r === 'object') ? r.t : null;
      out.push({ t: toTime(tv, out.length), v: v, label: r && r.label != null ? String(r.label) : (tv != null ? String(tv) : '#' + (out.length + 1)) });
    }
    var timed = raw.length && raw[0] && typeof raw[0] === 'object' && raw[0].t != null;
    if (timed) out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  /* Reduce to at most max points by bucket-mean so long series stay listenable. */
  function downsample(pts, max) {
    if (pts.length <= max) return pts.slice();
    var out = [], size = pts.length / max;
    for (var b = 0; b < max; b++) {
      var lo = Math.floor(b * size), hi = Math.max(lo + 1, Math.floor((b + 1) * size)), s = 0, n = 0;
      for (var i = lo; i < hi && i < pts.length; i++) { s += pts[i].v; n++; }
      out.push({ t: pts[lo].t, v: s / n, label: pts[lo].label });
    }
    return out;
  }

  function extent(pts) {
    var lo = Infinity, hi = -Infinity;
    pts.forEach(function (p) { if (p.v < lo) lo = p.v; if (p.v > hi) hi = p.v; });
    return [lo, hi];
  }
  function norm01(v, lo, hi) { return hi === lo ? 0.5 : (v - lo) / (hi - lo); }

  /* Frequencies (Hz) of the scale across `octaves` octaves from `rootMidi` (inclusive top note). */
  function scaleFreqs(scaleName, rootMidi, octaves) {
    var steps = SCALES[scaleName] || SCALES.pentatonic, f = [];
    for (var o = 0; o < octaves; o++) steps.forEach(function (s) { f.push(midiToHz(rootMidi + 12 * o + s)); });
    f.push(midiToHz(rootMidi + 12 * octaves));
    return f;
  }
  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* Value (0..1) -> snapped scale frequency. */
  function pitchFor(n, freqs) {
    var i = Math.round(Math.max(0, Math.min(1, n)) * (freqs.length - 1));
    return freqs[i];
  }

  /* Build the note schedule. opts: mode, scale, root (midi), octaves, speed (x), baseStep (s per point).
     Returns {notes:[{time,dur,freq,gain,bright,index}], total}. Pure function: no audio needed. */
  function plan(points, opts) {
    opts = opts || {};
    var m = MODES[opts.mode] || MODES.pitch, speed = opts.speed > 0 ? opts.speed : 1, base = (opts.baseStep || 0.14) / speed;
    var ext = extent(points), freqs = scaleFreqs(opts.scale || 'pentatonic', opts.root == null ? 48 : opts.root, opts.octaves || 3);
    var mid = freqs[Math.floor(freqs.length / 2)], time = 0, notes = [];
    points.forEach(function (p, i) {
      var n = norm01(p.v, ext[0], ext[1]);
      var step = m.tempo ? base * (1.8 - 1.4 * n) : base; // higher value = faster
      notes.push({
        time: time, dur: Math.max(0.05, step * 0.9),
        freq: m.pitch ? pitchFor(n, freqs) : (m.tempo || m.vol || m.bright ? mid : mid),
        gain: m.vol ? 0.08 + 0.32 * n : 0.25,
        bright: m.bright ? 400 + 5200 * n * n : 2600,
        index: i
      });
      time += step;
    });
    return { notes: notes, total: time, extent: ext };
  }

  function fmt(x) { return Math.abs(x) >= 1000 ? Math.round(x).toLocaleString('en-US') : (Math.round(x * 100) / 100).toString(); }
  function dateStr(t) { return t > 1e11 ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : String(t); }

  /* Plain-language text alternative for a series. */
  function summarize(points, unit) {
    if (!points.length) return 'No numeric points.';
    var e = extent(points), first = points[0], last = points[points.length - 1], sum = 0, imax = 0, imin = 0;
    points.forEach(function (p, i) { sum += p.v; if (p.v > points[imax].v) imax = i; if (p.v < points[imin].v) imin = i; });
    var u = unit ? ' ' + unit : '', d = last.v - first.v, rel = first.v ? Math.abs(d / first.v) : 0;
    var trend = points.length < 2 ? 'a single point' : rel < 0.03 ? 'roughly flat overall' : (d > 0 ? 'rising overall' : 'falling overall');
    return points.length + ' points, ' + trend + '. Starts at ' + fmt(first.v) + u + ' (' + first.label + '), ends at ' + fmt(last.v) + u + ' (' + last.label + '). Lowest ' + fmt(e[0]) + u + ' at ' + points[imin].label + '; highest ' + fmt(e[1]) + u + ' at ' + points[imax].label + '; average ' + fmt(sum / points.length) + u + '. Higher values play as ' + 'higher/louder/faster sound depending on the chosen mapping.';
  }

  /* ---- parsing user data ---- */
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, delim = null;
    text = String(text).replace(/^\uFEFF/, '');
    var first = text.split(/\r?\n/)[0] || '';
    delim = [',', ';', '\t'].map(function (d) { return [d, first.split(d).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row); row = []; }
      else cur += c;
    }
    row.push(cur); if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row);
    if (!rows.length) return { columns: [], rows: [] };
    var numericFirst = rows[0].every(function (x) { return x.trim() !== '' && isFinite(parseFloat(x)) && /^[-+\d.,eE\s]+$/.test(x); });
    var cols = numericFirst ? rows[0].map(function (_, i) { return 'column ' + (i + 1); }) : rows.shift().map(function (h, i) { return h.trim() || 'column ' + (i + 1); });
    return { columns: cols, rows: rows };
  }
  /* Any JSON shape -> table {columns, rows}. */
  function tableFromJSON(data) {
    if (data && !Array.isArray(data) && typeof data === 'object') {
      var k = ['points', 'data', 'series', 'values', 'rows'].filter(function (x) { return Array.isArray(data[x]); })[0];
      if (k) data = data[k]; else {
        var any = Object.keys(data).filter(function (x) { return Array.isArray(data[x]); })[0];
        if (any) data = data[any]; else return { columns: [], rows: [] };
      }
    }
    if (!Array.isArray(data) || !data.length) return { columns: [], rows: [] };
    if (typeof data[0] !== 'object' || data[0] === null) return { columns: ['value'], rows: data.map(function (x) { return [x]; }) };
    if (Array.isArray(data[0])) return { columns: data[0].map(function (_, i) { return 'column ' + (i + 1); }), rows: data };
    var cols = Object.keys(data[0]);
    return { columns: cols, rows: data.map(function (o) { return cols.map(function (c) { return o[c]; }); }) };
  }
  function numericColumns(table) {
    return table.columns.map(function (c, i) { return i; }).filter(function (i) {
      var ok = 0, n = Math.min(table.rows.length, 50);
      for (var r = 0; r < n; r++) { var v = table.rows[r][i]; v = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : v; if (typeof v === 'number' && isFinite(v)) ok++; }
      return n && ok / n > 0.8;
    });
  }
  /* table + chosen columns -> normalized points. timeCol = -1 for row order. */
  function pointsFromTable(table, valueCol, timeCol) {
    var raw = table.rows.map(function (r) { return { t: timeCol >= 0 ? r[timeCol] : null, v: r[valueCol], label: timeCol >= 0 ? r[timeCol] : null }; });
    var pts = normalize(raw);
    if (timeCol < 0) pts.forEach(function (p, i) { p.t = i; p.label = '#' + (i + 1); });
    return pts;
  }

  /* ---- Web Audio player (browser only) ---- */
  function Player(onState) { this.ctx = null; this.state = 'stopped'; this.onState = onState || function () {}; this.plan = null; this.t0 = 0; }
  Player.prototype.play = function (plan, opts) {
    opts = opts || {};
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio is not supported in this browser.');
    this.stop();
    this.ctx = new AC(); this.plan = plan;
    var ctx = this.ctx, master = ctx.createGain(); master.gain.value = opts.volume == null ? 0.8 : opts.volume;
    master.connect(ctx.destination); this.master = master;
    var wave = opts.wave || 'triangle', start = ctx.currentTime + 0.1; this.t0 = start;
    plan.notes.forEach(function (n) {
      var osc = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      osc.type = wave; osc.frequency.value = n.freq; f.type = 'lowpass'; f.frequency.value = n.bright; f.Q.value = 1;
      var a = Math.min(0.015, n.dur / 3), t = start + n.time;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(n.gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
      osc.connect(f); f.connect(g); g.connect(master); osc.start(t); osc.stop(t + n.dur + 0.05);
    });
    this.state = 'playing'; this.onState(this.state);
    var self = this; this.endTimer = setTimeout(function () { if (self.ctx === ctx) { self.state = 'stopped'; self.onState('ended'); } }, (plan.total + 0.3) * 1000);
  };
  Player.prototype.position = function () { // seconds into the plan
    if (!this.ctx || !this.plan) return 0;
    return Math.max(0, Math.min(this.plan.total, this.ctx.currentTime - this.t0));
  };
  Player.prototype.pause = function () { if (this.ctx && this.state === 'playing') { this.ctx.suspend(); clearTimeout(this.endTimer); this.state = 'paused'; this.onState(this.state); this._rem = this.plan.total - this.position(); } };
  Player.prototype.resume = function () {
    if (this.ctx && this.state === 'paused') { this.ctx.resume(); this.state = 'playing'; this.onState(this.state); var self = this, c = this.ctx; this.endTimer = setTimeout(function () { if (self.ctx === c) { self.state = 'stopped'; self.onState('ended'); } }, (this._rem + 0.3) * 1000); }
  };
  Player.prototype.stop = function () {
    clearTimeout(this.endTimer);
    if (this.ctx) { try { this.ctx.close(); } catch (e) {} }
    this.ctx = null; this.state = 'stopped';
  };

  return { SCALES: SCALES, MODES: MODES, normalize: normalize, downsample: downsample, extent: extent, scaleFreqs: scaleFreqs, pitchFor: pitchFor, midiToHz: midiToHz,
    plan: plan, summarize: summarize, parseCSV: parseCSV, tableFromJSON: tableFromJSON, numericColumns: numericColumns, pointsFromTable: pointsFromTable,
    isTimeLike: isTimeLike, dateStr: dateStr, fmt: fmt, Player: Player };
});
