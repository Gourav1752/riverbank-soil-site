/* Post-flood crop finder (Sections 14-16). Depends on soil-core.js */
(function () {
  'use strict';
  var C = window.SoilCore;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('advisor-form');
  if (!form) return;

  var NUTRIENT_LABEL = { N: 'N', P: 'P', K: 'K', S: 'S', CaMg: 'Ca/Mg', micro: 'Micronutrients', OM: 'Organic matter' };

  /* Season tags are general agronomic practice in India; the report itself fixes only wheat to the rabi season. */
  var CROPS = [
    { id: 'rice', name: 'Rice / paddy', type: 'Cereal', cond: 'wet', seasons: ['kharif', 'rabi'], suit: 'Suitable for areas where wet conditions persist.', needs: ['N', 'P', 'K'], fert: 'Urea + DAP/SSP + MOP' },
    { id: 'maize', name: 'Maize', type: 'Cereal', cond: 'drained', seasons: ['kharif', 'rabi'], suit: 'Suitable after excess water has drained. Needs nitrogen in particular.', needs: ['N', 'P', 'K'], fert: 'Urea + DAP + MOP' },
    { id: 'wheat', name: 'Wheat', type: 'Cereal', cond: 'drained', seasons: ['rabi'], suit: 'Suitable during the post-monsoon (rabi) season after drainage.', needs: ['N', 'P', 'K'], fert: 'Urea + DAP/SSP + MOP' },
    { id: 'mustard', name: 'Mustard', type: 'Oilseed', cond: 'drained', seasons: ['rabi'], suit: 'Suitable in adequately drained soil.', needs: ['N', 'P', 'S'], fert: 'Urea + SSP + MOP + sulfur source' },
    { id: 'chickpea', name: 'Chickpea', type: 'Pulse', legume: true, cond: 'drained', seasons: ['rabi'], suit: 'Suitable where soil has adequate drainage.', needs: ['P'], fert: 'SSP/DAP + MOP; generally low starter N' },
    { id: 'lentil', name: 'Lentil', type: 'Pulse', legume: true, cond: 'drained', seasons: ['rabi'], suit: 'Suitable after sufficient drainage.', needs: ['P'], fert: 'SSP + MOP; generally low starter N' },
    { id: 'greengram', name: 'Green gram', type: 'Pulse', legume: true, cond: 'drained', seasons: ['kharif', 'rabi'], suit: 'Short-duration option after flood recession.', needs: ['P', 'K', 'micro'], fert: 'SSP/DAP + MOP' },
    { id: 'blackgram', name: 'Black gram', type: 'Pulse', legume: true, cond: 'drained', seasons: ['kharif', 'rabi'], suit: 'Suitable where adequate drainage exists.', needs: ['P', 'K', 'micro'], fert: 'SSP/DAP + MOP' },
    { id: 'veg', name: 'Vegetables', type: 'Vegetables', cond: 'drained', seasons: ['kharif', 'rabi'], suit: 'Can be cultivated once the soil becomes suitable.', needs: ['OM'], fert: 'Compost/FYM + crop-specific fertilizers according to soil test' }
  ];

  var SOURCES = {
    N: { what: 'Urea, ammonium sulfate or other locally recommended nitrogen fertilizer.', note: 'Apply after excess water has drained, not while the soil is heavily waterlogged.' },
    P: { what: 'Single Super Phosphate (SSP) or Diammonium Phosphate (DAP).', note: 'DAP also supplies nitrogen; count it in the total nitrogen.' },
    K: { what: 'Muriate of Potash (MOP, potassium chloride).', note: 'Supports water regulation, stress tolerance and plant strength.' },
    S: { what: 'Gypsum, ammonium sulfate or SSP.', note: 'Particularly important for mustard.' },
    CaMg: { what: 'The report does not name a source.', note: 'Follow the soil-testing laboratory’s recommendation.' },
    micro: { what: 'The report does not name a source.', note: 'Follow the soil-testing laboratory’s recommendation for Fe, Zn, Cu, Mn, B or Mo.' },
    OM: { what: 'Farmyard manure (FYM), well-decomposed compost, vermicompost or green manure.', note: 'Restores soil structure, moisture management and microbial activity.' }
  };

  var PARAM_TO_BOX = { n: 'N', p: 'P', k: 'K', s: 'S', ca: 'CaMg', mg: 'CaMg', fe: 'micro', zn: 'micro', cu: 'micro', mn: 'micro', b: 'micro', mo: 'micro', om: 'OM' };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function val(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function deficiencies() {
    return Array.prototype.slice.call(form.querySelectorAll('#def-list input:checked')).map(function (b) { return b.value; });
  }

  function loadZone(zid) {
    var note = $('loaded-note');
    if (!zid || !C) { note.textContent = ''; return; }
    var data = C.load();
    if (!data.stored || !C.hasAnyData(data.state, zid)) {
      note.innerHTML = 'No results saved for this zone yet. <a href="data.html#zone-' + zid + '">Enter them on the data sheet</a>.';
      return;
    }
    var ids = C.deficientAfter(data.state, zid);
    var boxes = {};
    ids.forEach(function (id) { if (PARAM_TO_BOX[id]) boxes[PARAM_TO_BOX[id]] = true; });
    form.querySelectorAll('#def-list input').forEach(function (b) { b.checked = !!boxes[b.value]; });
    if (ids.length) {
      var names = ids.map(function (id) { return C.PARAMS.filter(function (p) { return p.id === id; })[0].short; });
      note.textContent = 'Loaded from the data sheet: ' + names.join(', ') + ' deficient or low after the flood.';
    } else {
      note.innerHTML = 'No deficiencies flagged for this zone. Add critical limits on the <a href="data.html#zone-' + zid + '">data sheet</a> to flag them.';
    }
  }

  function render() {
    var cond = val('cond'), season = val('season'), def = deficiencies();
    var has = function (k) { return def.indexOf(k) > -1; };

    /* Sources */
    if (!def.length) {
      $('sources').innerHTML = '<p class="muted">No deficiencies selected. Apply fertilizer only according to soil-test results: fertilizer applied without knowing the soil&rsquo;s nutrient status wastes money, is lost from the soil and can pollute nearby water.</p>';
    } else {
      $('sources').innerHTML = def.map(function (k) {
        var s = SOURCES[k];
        return '<div class="source-row"><span class="sr-k">' + esc(NUTRIENT_LABEL[k]) + '</span><span>' + esc(s.what) + ' <span class="muted">' + esc(s.note) + '</span></span></div>';
      }).join('');
    }

    /* Crops */
    var suitable = [], excluded = [];
    CROPS.forEach(function (c) {
      if (c.cond !== cond) {
        excluded.push({ c: c, why: cond === 'wet' ? 'needs drained soil' : 'suited to fields where wet conditions persist' });
      } else if (season !== 'any' && c.seasons.indexOf(season) === -1) {
        excluded.push({ c: c, why: 'usually grown in the ' + (c.seasons[0] === 'rabi' ? 'rabi (post-monsoon)' : 'kharif') + ' season' });
      } else suitable.push(c);
    });
    if (has('N')) suitable.sort(function (a, b) { return (b.legume ? 1 : 0) - (a.legume ? 1 : 0); });

    $('crop-count').textContent = suitable.length + ' suitable crop' + (suitable.length === 1 ? '' : 's') + ' for a ' + (cond === 'wet' ? 'still-wet' : 'drained') + ' field';

    $('crop-cards').innerHTML = suitable.map(function (c) {
      var notes = [];
      if (c.legume) notes.push(has('N')
        ? 'Legume: fixes nitrogen with soil bacteria and helps restore the depleted nitrogen. Use only low starter N; phosphorus is still needed.'
        : 'Legume: generally low starter N. Phosphorus and other nutrients are still needed.');
      else if (has('N')) notes.push('Nitrogen is deficient: apply urea or ammonium sulfate after excess water has drained.');
      if (has('P')) notes.push('Phosphorus is deficient: SSP or DAP supports root development and early establishment.');
      if (has('K') && c.needs.indexOf('K') > -1) notes.push('Potassium is deficient: include MOP.');
      if (has('S') && c.id === 'mustard') notes.push('Sulfur is deficient and especially important for mustard: add gypsum, ammonium sulfate or SSP.');
      else if (has('S')) notes.push('Sulfur is deficient: gypsum, ammonium sulfate or SSP can supply it.');
      if (has('micro') && c.needs.indexOf('micro') > -1) notes.push('Micronutrients are flagged and this crop needs them: follow the laboratory’s recommendation.');
      if (has('OM')) notes.push('Organic matter is low: add FYM, compost or vermicompost.');
      if (c.id === 'wheat' && season === 'any') notes.push('Sow in the rabi (post-monsoon) season.');

      var needChips = c.needs.map(function (n) {
        return '<li class="chip el' + (has(n) ? ' hit' : '') + '">' + esc(NUTRIENT_LABEL[n]) + (has(n) ? ' &middot; deficient' : '') + '</li>';
      }).join('');
      return '<article class="crop-card">' +
        '<header><h3>' + esc(c.name) + '</h3><span class="cc-tag">' + esc(c.type) + '</span></header>' +
        '<p class="cc-suit">' + esc(c.suit) + '</p>' +
        '<div class="stack" style="--gap:.3rem"><span class="eyebrow" style="font-size:.7rem">Major nutrient needs</span><ul class="chips">' + needChips + '</ul></div>' +
        '<p class="cc-fert">' + esc(c.fert) + '</p>' +
        (notes.length ? '<ul class="cc-notes">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
        '</article>';
    }).join('');

    $('excluded').innerHTML = excluded.length
      ? '<strong>Not suggested for these conditions</strong><ul>' + excluded.map(function (x) {
          return '<li>' + esc(x.c.name) + ': ' + esc(x.why) + '</li>';
        }).join('') + '</ul>'
      : '';
  }

  form.addEventListener('change', function (e) {
    if (e.target.id === 'from-zone') loadZone(e.target.value);
    render();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  var m = /^#zone-([ABC])$/.exec(location.hash);
  if (m) { $('from-zone').value = m[1]; loadZone(m[1]); }
  render();
})();
