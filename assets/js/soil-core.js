/* Shared soil-data model used by the data sheet and the crop finder. */
(function () {
  'use strict';
  var KEY = 'soilStudy.data.v1';

  /* kind: nutrient | om (organic matter) | reaction (pH) | ec */
  var PARAMS = [
    { id: 'ph', name: 'pH', short: 'pH', unit: '', kind: 'reaction', group: 'Soil reaction' },
    { id: 'n',  name: 'Nitrogen (N)', short: 'N', unit: 'mg/kg', kind: 'nutrient', group: 'Primary nutrient' },
    { id: 'p',  name: 'Phosphorus (P)', short: 'P', unit: 'mg/kg', kind: 'nutrient', group: 'Primary nutrient' },
    { id: 'k',  name: 'Potassium (K)', short: 'K', unit: 'mg/kg', kind: 'nutrient', group: 'Primary nutrient' },
    { id: 'ca', name: 'Calcium (Ca)', short: 'Ca', unit: 'mg/kg', kind: 'nutrient', group: 'Secondary nutrient' },
    { id: 'mg', name: 'Magnesium (Mg)', short: 'Mg', unit: 'mg/kg', kind: 'nutrient', group: 'Secondary nutrient' },
    { id: 's',  name: 'Sulfur (S)', short: 'S', unit: 'mg/kg', kind: 'nutrient', group: 'Secondary nutrient' },
    { id: 'fe', name: 'Iron (Fe)', short: 'Fe', unit: 'mg/kg', kind: 'nutrient', group: 'Micronutrient' },
    { id: 'zn', name: 'Zinc (Zn)', short: 'Zn', unit: 'mg/kg', kind: 'nutrient', group: 'Micronutrient' },
    { id: 'cu', name: 'Copper (Cu)', short: 'Cu', unit: 'mg/kg', kind: 'nutrient', group: 'Micronutrient' },
    { id: 'mn', name: 'Manganese (Mn)', short: 'Mn', unit: 'mg/kg', kind: 'nutrient', group: 'Micronutrient' },
    { id: 'b',  name: 'Boron (B)', short: 'B', unit: 'mg/kg', kind: 'nutrient', group: 'Micronutrient · optional' },
    { id: 'mo', name: 'Molybdenum (Mo)', short: 'Mo', unit: 'mg/kg', kind: 'nutrient', group: 'Micronutrient · optional' },
    { id: 'om', name: 'Organic matter / carbon', short: 'OM', unit: '%', kind: 'om', group: 'Fertility indicator' },
    { id: 'ec', name: 'Electrical conductivity', short: 'EC', unit: 'dS/m', kind: 'ec', group: 'Salinity' }
  ];

  var ZONES = [
    { id: 'A', label: 'Sample A', where: 'close to the riverbank' },
    { id: 'B', label: 'Sample B', where: 'medium distance from the river' },
    { id: 'C', label: 'Sample C', where: 'farther from the river (reference)' }
  ];

  var STATUS_OPTIONS = {
    nutrient: ['deficient', 'normal'],
    om: ['low', 'normal'],
    reaction: ['normal', 'changed'],
    ec: ['normal', 'changed']
  };
  var STATUS_LABEL = { deficient: 'Deficient', normal: 'Normal', low: 'Low', changed: 'Changed' };

  function blank() {
    var zones = {};
    ZONES.forEach(function (z) {
      zones[z.id] = {};
      PARAMS.forEach(function (p) {
        zones[z.id][p.id] = { before: '', after: '', limit: '', unit: p.unit, sb: 'auto', sa: 'auto' };
      });
    });
    return { version: 1, zone: 'A', tolerance: 5, example: false, meta: { site: '', river: '', pre: '', post: '', depth: '' }, zones: zones };
  }

  function withExample(s) {
    s.zones.A.k.before = '150';
    s.zones.A.k.after = '120';
    s.example = true;
    return s;
  }

  function normalize(src) {
    var b = blank();
    if (!src || typeof src !== 'object') return b;
    if (ZONES.some(function (z) { return z.id === src.zone; })) b.zone = src.zone;
    var t = parseFloat(src.tolerance);
    if (isFinite(t) && t >= 0) b.tolerance = t;
    b.example = !!src.example;
    if (src.meta) Object.keys(b.meta).forEach(function (k) { if (typeof src.meta[k] === 'string') b.meta[k] = src.meta[k]; });
    ZONES.forEach(function (z) {
      PARAMS.forEach(function (p) {
        var v = src.zones && src.zones[z.id] && src.zones[z.id][p.id];
        if (!v) return;
        var d = b.zones[z.id][p.id];
        ['before', 'after', 'limit', 'unit', 'sb', 'sa'].forEach(function (f) { if (v[f] != null) d[f] = String(v[f]); });
      });
    });
    return b;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return { state: normalize(JSON.parse(raw)), stored: true };
    } catch (e) { /* storage unavailable or corrupt */ }
    return { state: withExample(blank()), stored: false };
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  function num(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).trim();
    if (s === '') return null;
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function autoStatus(p, v, x, dir, which) {
    if (p.kind === 'reaction' || p.kind === 'ec') {
      if (which === 'before') return null;
      return dir == null ? null : (dir === 'stable' ? 'normal' : 'changed');
    }
    var lim = num(v.limit);
    if (lim == null || x == null) return null;
    if (p.kind === 'om') return x < lim ? 'low' : 'normal';
    return x < lim ? 'deficient' : 'normal';
  }

  function interpret(p, r) {
    if (!r.dir) return '';
    if (r.dir === 'stable') return 'Remained relatively stable';
    var up = r.dir === 'up';
    switch (p.id) {
      case 'ph': return 'Possible alteration of soil chemical conditions';
      case 'ec': return up ? 'Possible salt / mineral accumulation' : 'Possible leaching or removal of soluble salts by floodwater';
      case 'om': return up ? 'Possible deposition of organic-rich sediments' : 'Possible erosion or removal of topsoil';
      case 'n': return up ? 'Possible sediment or organic-matter deposition' : 'Possible leaching or denitrification';
      case 'k': return up ? 'Possible sediment deposition or mineral accumulation' : 'Possible mobility and removal through floodwater';
      case 'p': return up ? 'Possible temporary increase in availability, or sediment deposition' : 'Possible transport away with eroded sediment';
      case 'ca':
      case 'mg': return up ? 'Possible deposition of sediments containing these minerals' : 'Possible leaching or erosion';
      case 'fe':
      case 'mn': return 'Waterlogging changes redox conditions and the chemical form of Fe and Mn, which affects availability';
      default: return up ? 'Possible sediment deposition or mineral accumulation' : 'Possible leaching, runoff, erosion or plant uptake';
    }
  }

  function compute(p, v, tolerance) {
    var b = num(v.before), a = num(v.after);
    var r = { b: b, a: a, diff: null, pct: null, dir: null };
    if (b != null && a != null) {
      r.diff = a - b;
      r.pct = b !== 0 ? (r.diff / b) * 100 : null;
      if (r.pct != null) r.dir = Math.abs(r.pct) <= tolerance ? 'stable' : (r.diff > 0 ? 'up' : 'down');
      else r.dir = r.diff === 0 ? 'stable' : (r.diff > 0 ? 'up' : 'down');
    }
    r.autoB = autoStatus(p, v, b, r.dir, 'before');
    r.autoA = autoStatus(p, v, a, r.dir, 'after');
    var noBefore = p.kind === 'reaction' || p.kind === 'ec';
    r.sb = noBefore ? null : (v.sb && v.sb !== 'auto' ? v.sb : r.autoB);
    r.sa = v.sa && v.sa !== 'auto' ? v.sa : r.autoA;
    r.note = interpret(p, r);
    return r;
  }

  function isBad(status) { return status === 'deficient' || status === 'low'; }

  /* Deficient-after list for one zone: returns array of param ids */
  function deficientAfter(state, zoneId) {
    var out = [];
    PARAMS.forEach(function (p) {
      var r = compute(p, state.zones[zoneId][p.id], state.tolerance);
      if (isBad(r.sa)) out.push(p.id);
    });
    return out;
  }

  function hasAnyData(state, zoneId) {
    return PARAMS.some(function (p) {
      var v = state.zones[zoneId][p.id];
      return num(v.before) != null || num(v.after) != null;
    });
  }

  window.SoilCore = {
    KEY: KEY, PARAMS: PARAMS, ZONES: ZONES, STATUS_OPTIONS: STATUS_OPTIONS, STATUS_LABEL: STATUS_LABEL,
    blank: blank, withExample: withExample, normalize: normalize, load: load, save: save,
    num: num, compute: compute, isBad: isBad, deficientAfter: deficientAfter, hasAnyData: hasAnyData
  };
})();
