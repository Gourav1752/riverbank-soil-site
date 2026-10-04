/* Before vs. after data sheet. Depends on soil-core.js */
(function () {
  'use strict';
  var C = window.SoilCore;
  if (!C) return;
  var PARAMS = C.PARAMS, ZONES = C.ZONES;

  var loaded = C.load();
  var state = loaded.state;

  var $ = function (id) { return document.getElementById(id); };
  var tbody = $('data-body');
  var statusEl = $('status');
  var MINUS = '−';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n, dp) {
    if (n == null) return '';
    var d = dp == null ? 3 : dp;
    var s = (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
    if (dp == null) s = s.replace(/\.?0+$/, '');
    if (s === '-0') s = '0';
    return s.replace('-', MINUS);
  }
  function signed(n, dp) {
    if (n == null) return '';
    var s = fmt(n, dp);
    return n > 0 ? '+' + s : s;
  }
  function zoneById(id) { return ZONES.filter(function (z) { return z.id === id; })[0]; }
  function paramById(id) { return PARAMS.filter(function (p) { return p.id === id; })[0]; }

  var saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { C.save(state); }, 250);
  }
  function say(msg, tone) {
    statusEl.textContent = msg;
    statusEl.className = 'status-line' + (tone ? ' ' + tone : '');
  }

  /* ---------- Example banner ---------- */
  function syncBanner() {
    var k = state.zones.A.k;
    $('example-banner').hidden = !(state.example && k.before === '150' && k.after === '120');
  }

  /* ---------- Table ---------- */
  function statusSelect(p, which, v, r) {
    var cur = which === 'sb' ? v.sb : v.sa;
    var autoVal = which === 'sb' ? r.autoB : r.autoA;
    var id = 'st-' + which + '-' + p.id;
    var label = (which === 'sb' ? 'Status before flood for ' : 'Status after flood for ') + p.name;
    var html = '<select id="' + id + '" data-f="' + which + '" aria-label="' + esc(label) + '">';
    html += '<option value="auto"' + (cur === 'auto' ? ' selected' : '') + '>' + autoText(autoVal) + '</option>';
    C.STATUS_OPTIONS[p.kind].forEach(function (o) {
      html += '<option value="' + o + '"' + (cur === o ? ' selected' : '') + '>' + C.STATUS_LABEL[o] + '</option>';
    });
    return html + '</select>';
  }
  function autoText(v) { return v ? 'Auto · ' + C.STATUS_LABEL[v] : 'Auto · not set'; }

  function renderTable() {
    var zone = state.zones[state.zone];
    var rows = PARAMS.map(function (p) {
      var v = zone[p.id];
      var r = C.compute(p, v, state.tolerance);
      var unitCell = p.kind === 'reaction'
        ? '<span class="mono muted">pH units</span>'
        : '<input class="in-unit" type="text" id="u-' + p.id + '" data-f="unit" value="' + esc(v.unit) + '" aria-label="Unit for ' + esc(p.name) + '">';
      var limitCell = (p.kind === 'reaction' || p.kind === 'ec')
        ? '<span class="muted">&mdash;</span>'
        : '<input type="number" step="any" inputmode="decimal" id="l-' + p.id + '" data-f="limit" value="' + esc(v.limit) + '" aria-label="Critical limit for ' + esc(p.name) + '">';
      var sbCell = (p.kind === 'reaction' || p.kind === 'ec') ? '<span class="muted">&mdash;</span>' : statusSelect(p, 'sb', v, r);
      return '<tr data-id="' + p.id + '">' +
        '<th scope="row"><span class="pname">' + esc(p.name) + '</span><span class="pgroup">' + esc(p.group) + '</span></th>' +
        '<td>' + unitCell + '</td>' +
        '<td class="num c-before"><input type="number" step="any" inputmode="decimal" id="b-' + p.id + '" data-f="before" value="' + esc(v.before) + '" aria-label="' + esc(p.name) + ' before flood"></td>' +
        '<td class="num c-after"><input type="number" step="any" inputmode="decimal" id="a-' + p.id + '" data-f="after" value="' + esc(v.after) + '" aria-label="' + esc(p.name) + ' after flood"></td>' +
        '<td class="num c-diff"></td>' +
        '<td class="num c-pct"></td>' +
        '<td class="c-dir"></td>' +
        '<td class="num">' + limitCell + '</td>' +
        '<td class="c-sb">' + sbCell + '</td>' +
        '<td class="c-sa">' + statusSelect(p, 'sa', v, r) + '</td>' +
        '<td class="c-note"></td>' +
        '</tr>';
    });
    tbody.innerHTML = rows.join('');
    PARAMS.forEach(function (p) { updateRow(p.id); });
    var z = zoneById(state.zone);
    $('table-title').textContent = 'Observation table · ' + z.label;
  }

  function dirPill(dir) {
    if (!dir) return '<span class="pill none">Not measured</span>';
    if (dir === 'up') return '<span class="pill up">↑ Increased</span>';
    if (dir === 'down') return '<span class="pill down">↓ Decreased</span>';
    return '<span class="pill stable">→ Stable</span>';
  }

  function updateRow(pid) {
    var tr = tbody.querySelector('tr[data-id="' + pid + '"]');
    if (!tr) return;
    var p = paramById(pid);
    var v = state.zones[state.zone][pid];
    var r = C.compute(p, v, state.tolerance);
    var unit = p.kind === 'reaction' ? '' : (v.unit ? ' ' + v.unit : '');
    tr.querySelector('.c-diff').textContent = r.diff == null ? '' : signed(r.diff) + unit;
    tr.querySelector('.c-pct').textContent = r.pct == null ? (r.diff != null ? 'n/a' : '') : signed(r.pct, 1) + '%';
    tr.querySelector('.c-dir').innerHTML = dirPill(r.dir);
    tr.querySelector('.c-note').textContent = r.note;
    var sb = tr.querySelector('select[data-f="sb"]');
    if (sb) sb.options[0].textContent = autoText(r.autoB);
    var sa = tr.querySelector('select[data-f="sa"]');
    if (sa) sa.options[0].textContent = autoText(r.autoA);
    tr.classList.toggle('row-def', C.isBad(r.sa));
  }

  tbody.addEventListener('input', onTableEdit);
  tbody.addEventListener('change', onTableEdit);
  function onTableEdit(e) {
    var f = e.target.getAttribute('data-f');
    if (!f) return;
    var tr = e.target.closest('tr');
    var pid = tr.getAttribute('data-id');
    var v = state.zones[state.zone][pid];
    if (v[f] === e.target.value) return;
    v[f] = e.target.value;
    if (state.zone === 'A' && pid === 'k' && (f === 'before' || f === 'after')) { state.example = false; syncBanner(); }
    updateRow(pid);
    renderDerived();
    persist();
  }

  /* ---------- Summary ---------- */
  function zoneResults(zid) {
    return PARAMS.map(function (p) { return { p: p, r: C.compute(p, state.zones[zid][p.id], state.tolerance) }; });
  }

  function renderSummary(res) {
    var measured = res.filter(function (x) { return x.r.dir; }).length;
    var up = res.filter(function (x) { return x.r.dir === 'up'; }).length;
    var down = res.filter(function (x) { return x.r.dir === 'down'; }).length;
    var stable = res.filter(function (x) { return x.r.dir === 'stable'; }).length;
    var defA = res.filter(function (x) { return C.isBad(x.r.sa); }).length;
    var newly = res.filter(function (x) { return C.isBad(x.r.sa) && x.r.sb && !C.isBad(x.r.sb); }).length;
    var tiles = [
      [measured + '<span class="muted" style="font-size:1rem"> / ' + PARAMS.length + '</span>', 'Parameters measured', 'var(--ink)'],
      [up, 'Increased', 'var(--river)'],
      [down, 'Decreased', 'var(--after)'],
      [stable, 'Stable (±' + fmt(state.tolerance) + '%)', 'var(--muted)'],
      [defA, 'Deficient / low after flood', 'var(--bad)'],
      [newly, 'Newly deficient', 'var(--bad)']
    ];
    $('summary').innerHTML = tiles.map(function (t) {
      return '<div class="stat" style="--tone:' + t[2] + '"><span class="stat-n">' + t[0] + '</span><span class="stat-l">' + t[1] + '</span></div>';
    }).join('');
  }

  /* ---------- Chart ---------- */
  function niceMax(v) {
    var steps = [10, 20, 25, 40, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000];
    for (var i = 0; i < steps.length; i++) if (v <= steps[i]) return steps[i];
    return Math.ceil(v / 1000) * 1000;
  }

  function renderChart(res) {
    var z = zoneById(state.zone);
    $('chart-title').textContent = 'Percentage change after flooding · ' + z.label;
    var rows = res.filter(function (x) { return x.r.pct != null; });
    var W = 680, labelW = 170, pad = 62;
    var x0 = labelW + pad, x1 = W - pad, mid = (x0 + x1) / 2;
    if (!rows.length) {
      $('chart').innerHTML = '<svg viewBox="0 0 ' + W + ' 90" role="img" aria-label="No measured parameters yet">' +
        '<rect class="ch-band" x="0" y="0" width="' + W + '" height="90" rx="6"/>' +
        '<text class="ch-empty" x="' + (W / 2) + '" y="42" text-anchor="middle">Enter before- and after-flood values to draw the chart.</text>' +
        '<text class="ch-empty" x="' + (W / 2) + '" y="62" text-anchor="middle">Each measured parameter appears as one bar.</text></svg>';
      return;
    }
    var maxAbs = rows.reduce(function (m, x) { return Math.max(m, Math.abs(x.r.pct)); }, 0);
    var M = niceMax(Math.max(maxAbs, state.tolerance * 1.5, 10));
    var half = (x1 - x0) / 2;
    var sx = function (v) { return mid + (Math.max(-M, Math.min(M, v)) / M) * half; };
    var top = 30, rowH = 28, H = top + rows.length * rowH + 10;
    var parts = [];
    parts.push('<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Percentage change by parameter for ' + esc(z.label) + '">');
    var tol = Math.min(state.tolerance, M);
    parts.push('<rect class="ch-band" x="' + sx(-tol) + '" y="' + (top - 6) + '" width="' + (sx(tol) - sx(-tol)) + '" height="' + (H - top) + '"/>');
    [-M, -M / 2, 0, M / 2, M].forEach(function (t) {
      var x = sx(t);
      parts.push('<line class="' + (t === 0 ? 'ch-zero' : 'ch-grid') + '" x1="' + x + '" x2="' + x + '" y1="' + (top - 6) + '" y2="' + (H - 4) + '"/>');
      parts.push('<text class="ch-tick" x="' + x + '" y="16" text-anchor="middle">' + signed(t, 0) + '%</text>');
    });
    rows.forEach(function (x, i) {
      var cy = top + i * rowH + rowH / 2;
      var v = x.r.pct;
      var xa = sx(0), xb = sx(v);
      var cls = x.r.dir === 'up' ? 'ch-up' : x.r.dir === 'down' ? 'ch-down' : 'ch-stable';
      var bw = Math.max(Math.abs(xb - xa), 2);
      var bx = v >= 0 ? xa : xa - bw;
      parts.push('<text class="ch-label" x="' + (labelW - 4) + '" y="' + (cy + 4) + '" text-anchor="end">' + esc(x.p.name) + '</text>');
      parts.push('<rect class="' + cls + '" x="' + bx.toFixed(1) + '" y="' + (cy - 8) + '" width="' + bw.toFixed(1) + '" height="16" rx="2"><title>' + esc(x.p.name) + ': ' + signed(v, 1) + '%</title></rect>');
      var clipped = Math.abs(v) > M;
      var lx = v >= 0 ? bx + bw + 6 : bx - 6;
      parts.push('<text class="ch-val" x="' + lx.toFixed(1) + '" y="' + (cy + 4) + '" text-anchor="' + (v >= 0 ? 'start' : 'end') + '">' + signed(v, 1) + '%' + (clipped ? ' ›' : '') + '</text>');
    });
    parts.push('</svg>');
    $('chart').innerHTML = parts.join('');
  }

  /* ---------- Findings ---------- */
  function chipList(items, tone) {
    if (!items.length) return null;
    return '<ul class="chips">' + items.map(function (x) {
      var extra = x.r.pct != null && tone !== 'plain' ? ' <span class="mono">' + signed(x.r.pct, 1) + '%</span>' : '';
      return '<li class="chip">' + esc(x.p.short) + extra + '</li>';
    }).join('') + '</ul>';
  }

  function renderFindings(res) {
    var z = zoneById(state.zone);
    $('findings-title').textContent = 'Findings · ' + z.label + ', ' + z.where;
    var anyLimits = res.some(function (x) { return x.r.sa || x.r.sb; });
    var defHint = '<p class="empty">' + (anyLimits ? 'None in this zone.' : 'Enter critical limits or set statuses in the table to identify deficiencies.') + '</p>';
    var groups = [
      { t: 'Deficient before flooding', items: res.filter(function (x) { return C.isBad(x.r.sb); }), tone: 'plain', empty: defHint },
      { t: 'Deficient after flooding', items: res.filter(function (x) { return C.isBad(x.r.sa); }), tone: 'plain', empty: defHint },
      { t: 'Newly deficient after flooding', items: res.filter(function (x) { return C.isBad(x.r.sa) && x.r.sb && !C.isBad(x.r.sb); }), tone: 'plain', empty: defHint },
      { t: 'Increased (possible deposition)', items: res.filter(function (x) { return x.r.dir === 'up'; }), empty: '<p class="empty">None recorded.</p>' },
      { t: 'Decreased (possible loss)', items: res.filter(function (x) { return x.r.dir === 'down'; }), empty: '<p class="empty">None recorded.</p>' },
      { t: 'Relatively stable', items: res.filter(function (x) { return x.r.dir === 'stable'; }), empty: '<p class="empty">None recorded.</p>' }
    ];
    $('findings').innerHTML = groups.map(function (g) {
      return '<div class="finding"><h4>' + g.t + '</h4>' + (chipList(g.items, g.tone) || g.empty) + '</div>';
    }).join('');
    $('to-crops').href = 'crops.html#zone-' + state.zone;
  }

  /* ---------- Zone matrix ---------- */
  function renderMatrix() {
    var all = {};
    ZONES.forEach(function (z) { all[z.id] = zoneResults(z.id); });
    $('matrix-body').innerHTML = PARAMS.map(function (p, i) {
      return '<tr><th scope="row">' + esc(p.name) + '</th>' + ZONES.map(function (z) {
        var r = all[z.id][i].r;
        if (!r.dir) return '<td><span class="cell none">&mdash;</span></td>';
        var txt = r.pct == null ? signed(r.diff) : signed(r.pct, 1) + '%';
        var arrow = r.dir === 'up' ? '↑ ' : r.dir === 'down' ? '↓ ' : '→ ';
        return '<td><span class="cell ' + r.dir + '">' + arrow + txt + '</span></td>';
      }).join('') + '</tr>';
    }).join('');
  }

  function renderDerived() {
    var res = zoneResults(state.zone);
    renderSummary(res);
    renderChart(res);
    renderFindings(res);
    renderMatrix();
  }

  function renderAll() {
    document.querySelectorAll('input[name="zone"]').forEach(function (r) { r.checked = r.value === state.zone; });
    $('tolerance').value = state.tolerance;
    document.querySelectorAll('[data-meta]').forEach(function (el) { el.value = state.meta[el.getAttribute('data-meta')] || ''; });
    syncBanner();
    renderTable();
    renderDerived();
  }

  /* ---------- Controls ---------- */
  document.querySelectorAll('input[name="zone"]').forEach(function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      state.zone = r.value;
      renderTable();
      renderDerived();
      persist();
    });
  });

  $('tolerance').addEventListener('input', function () {
    var t = parseFloat(this.value);
    if (!isFinite(t) || t < 0) return;
    state.tolerance = Math.min(t, 100);
    PARAMS.forEach(function (p) { updateRow(p.id); });
    renderDerived();
    persist();
  });

  document.querySelectorAll('[data-meta]').forEach(function (el) {
    el.addEventListener('input', function () { state.meta[el.getAttribute('data-meta')] = el.value; persist(); });
  });

  function armed(btn, run) {
    var original = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', original);
    if (btn.classList.contains('armed')) {
      clearTimeout(btn._t);
      btn.classList.remove('armed');
      btn.textContent = original;
      run();
      return;
    }
    btn.classList.add('armed', 'danger');
    btn.textContent = 'Click again to confirm';
    btn._t = setTimeout(function () {
      btn.classList.remove('armed');
      if (btn.id !== 'btn-reset') btn.classList.remove('danger');
      btn.textContent = original;
    }, 4000);
  }

  $('btn-clear').addEventListener('click', function () {
    var btn = this;
    armed(btn, function () {
      btn.classList.remove('danger');
      var fresh = C.blank().zones[state.zone];
      state.zones[state.zone] = fresh;
      if (state.zone === 'A') state.example = false;
      syncBanner(); renderTable(); renderDerived(); persist();
      say(zoneById(state.zone).label + ' cleared.', 'ok');
    });
  });

  $('btn-reset').addEventListener('click', function () {
    armed(this, function () {
      state = C.blank();
      renderAll(); persist();
      say('All zones and site details cleared.', 'ok');
    });
  });

  $('btn-example').addEventListener('click', function () {
    state.zones.A.k.before = '150';
    state.zones.A.k.after = '120';
    state.example = true;
    state.zone = 'A';
    renderAll(); persist();
    say('Worked example loaded into Sample A, potassium.', 'ok');
  });

  $('btn-dismiss-example').addEventListener('click', function () {
    state.zones.A.k.before = '';
    state.zones.A.k.after = '';
    state.example = false;
    renderAll(); persist();
    say('Example removed.', 'ok');
  });

  /* ---------- CSV ---------- */
  var META_LABELS = { site: 'study_site', river: 'river', pre: 'pre_flood_date', post: 'post_flood_date', depth: 'sampling_depth' };

  function csvCell(v) {
    var s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV() {
    var lines = ['# Riverbank Soil Study export'];
    Object.keys(META_LABELS).forEach(function (k) { lines.push('# ' + META_LABELS[k] + ': ' + (state.meta[k] || '')); });
    lines.push('# stable_tolerance_percent: ' + state.tolerance);
    lines.push(['zone', 'parameter_id', 'parameter', 'unit', 'before', 'after', 'change', 'percent_change', 'direction', 'critical_limit', 'status_before', 'status_after', 'interpretation'].join(','));
    ZONES.forEach(function (z) {
      PARAMS.forEach(function (p) {
        var v = state.zones[z.id][p.id];
        var r = C.compute(p, v, state.tolerance);
        var dir = r.dir === 'up' ? 'increased' : r.dir === 'down' ? 'decreased' : r.dir === 'stable' ? 'stable' : '';
        lines.push([z.id, p.id, p.name, p.kind === 'reaction' ? '' : v.unit, v.before, v.after,
          r.diff == null ? '' : Math.round(r.diff * 1000) / 1000,
          r.pct == null ? '' : Math.round(r.pct * 10) / 10,
          dir, v.limit, r.sb || '', r.sa || '', r.note].map(csvCell).join(','));
      });
    });
    return lines.join('\n') + '\n';
  }

  function parseLine(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) {
        if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }

  function fromCSV(text) {
    var next = C.blank();
    next.zone = state.zone;
    var lines = text.replace(/\r/g, '').split('\n');
    var header = null, count = 0;
    var metaKeys = {};
    Object.keys(META_LABELS).forEach(function (k) { metaKeys[META_LABELS[k]] = k; });
    lines.forEach(function (line) {
      if (!line.trim()) return;
      if (line.charAt(0) === '#') {
        var m = line.slice(1).split(':');
        var key = (m.shift() || '').trim();
        var val = m.join(':').trim();
        if (metaKeys[key]) next.meta[metaKeys[key]] = val;
        if (key === 'stable_tolerance_percent' && isFinite(parseFloat(val))) next.tolerance = parseFloat(val);
        return;
      }
      var cells = parseLine(line);
      if (!header) { header = cells.map(function (h) { return h.trim().toLowerCase(); }); return; }
      var row = {};
      header.forEach(function (h, i) { row[h] = (cells[i] || '').trim(); });
      var z = (row.zone || '').toUpperCase();
      var pid = (row.parameter_id || '').toLowerCase();
      if (!next.zones[z] || !next.zones[z][pid]) return;
      var d = next.zones[z][pid];
      d.before = row.before || '';
      d.after = row.after || '';
      d.limit = row.critical_limit || '';
      if (row.unit) d.unit = row.unit;
      var p = paramById(pid);
      var allowed = C.STATUS_OPTIONS[p.kind];
      if (!d.limit) {
        if (allowed.indexOf(row.status_before) > -1 && p.kind !== 'reaction' && p.kind !== 'ec') d.sb = row.status_before;
        if (allowed.indexOf(row.status_after) > -1 && p.kind !== 'reaction' && p.kind !== 'ec') d.sa = row.status_after;
      }
      count++;
    });
    if (!header) throw new Error('No header row found. The first non-comment line must list the column names.');
    if (!count) throw new Error('No rows matched. Each row needs a zone (A, B or C) and a parameter_id such as n, p or k.');
    return { state: next, count: count };
  }

  function fileName() {
    var site = (state.meta.site || 'soil-study').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'soil-study';
    return site + '-before-after-flood.csv';
  }

  $('btn-export').addEventListener('click', function () {
    try {
      var blob = new Blob([toCSV()], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      say('CSV downloaded as ' + fileName() + '.', 'ok');
    } catch (e) {
      say('The download could not start in this browser. Use Copy CSV and paste into a spreadsheet instead.', 'err');
    }
  });

  $('btn-copy').addEventListener('click', function () {
    var text = toCSV();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      say(ok ? 'CSV copied. Paste it into a spreadsheet or text file.' : 'Copy was blocked by the browser. Use Download CSV instead.', ok ? 'ok' : 'err');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        say('CSV copied. Paste it into a spreadsheet or text file.', 'ok');
      }, fallback);
    } else fallback();
  });

  $('file-import').addEventListener('change', function () {
    var file = this.files && this.files[0];
    var input = this;
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var res = fromCSV(String(reader.result));
        state = res.state;
        renderAll(); persist();
        say('Imported ' + res.count + ' rows from ' + file.name + '.', 'ok');
      } catch (e) {
        say('Import failed: ' + e.message, 'err');
      }
      input.value = '';
    };
    reader.onerror = function () { say('The file could not be read. Check that it is a plain-text CSV file.', 'err'); };
    reader.readAsText(file);
  });

  $('btn-print').addEventListener('click', function () { window.print(); });

  /* Deep link: data.html#zone-B */
  var m = /^#zone-([ABC])$/.exec(location.hash);
  if (m) state.zone = m[1];

  renderAll();
  if (!loaded.stored) C.save(state);
})();
