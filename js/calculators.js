/* ==========================================================================
   AGAC SCADA FIELD HANDBOOK - CALCULATORS, TOOLS & SAT MODULE (STABLE V13)
   ========================================================================== */

/* ---------- Haptic Feedback Engine ---------- */
function triggerHaptic(type = 'light') {
  if ('vibrate' in navigator) {
    if (type === 'light') navigator.vibrate(10);
    else if (type === 'success') navigator.vibrate([10, 30, 15]);
    else if (type === 'warning') navigator.vibrate([30, 50, 30]);
  } else if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    try {
      if (!window._hx) {
        window._hx = document.createElement('label');
        window._hx.setAttribute('aria-hidden', 'true');
        window._hx.style.display = 'none';
        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.setAttribute('switch', '');
        window._hx.appendChild(inp);
        document.body.appendChild(window._hx);
      }
      const c = window._hx.querySelector('input');
      if (c) c.checked = !c.checked;
    } catch (_) {}
  }
}

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const n = id => {
  const el = document.getElementById(id);
  return el ? parseFloat(el.value) || 0 : 0;
};

const clampSG = v => {
  let val = Math.abs(parseFloat(v));
  if (isNaN(val) || val <= 0) return 0.85;
  return Math.max(0.50, Math.min(2.00, val));
};

const clampAlpha = v => {
  let val = Math.abs(parseFloat(v));
  if (isNaN(val) || val <= 0) return 0.0008;
  return Math.max(0.0001, Math.min(0.0025, val));
};

const sgFromAPI = api => 141.5 / (Math.abs(parseFloat(api) || 10) + 131.5);

/* ---------- TAB 1: CALCULATORS ---------- */

function ne43(m) {
  if (isNaN(m)) return ['Enter a signal', 'warn', 'Type a milliamp value between 4 and 20 mA.'];
  if (m < 3.6) return ['Wire Break / Dead Loop', 'bad', '🚨 Broken cable, blown fuse, or lost DC power.'];
  if (m < 3.8) return ['Under-range (NE43)', 'warn', '⚠️ Sensor drift below 0% physical zero point.'];
  if (m <= 20.5) return ['Normal Running Condition', 'ok', '✅ Transmitter is calibrated and operating safely.'];
  if (m <= 21.0) return ['Over-range (NE43)', 'warn', '⚠️ Tank level or pressure is exceeding rated span.'];
  return ['Transmitter Electronics Fault', 'bad', '🚨 Hardware error: output current pegged above 21 mA.'];
}

function mAcalc() {
  const m = n('ma'), lo = n('lo'), hi = n('hi');
  const span = hi - lo;
  const pct = ((m - 4) / 16) * 100;
  const eu = lo + (pct / 100) * span;
  const [title, cls, desc] = ne43(m);

  const out = $('#maOut');
  if (!out) return;
  out.className = 'out ' + cls;
  if (cls === 'bad' && window._ne !== 'bad') triggerHaptic('warning');
  window._ne = cls;

  out.innerHTML = `
    <div style="font-weight:700;font-size:1.05rem">${title}</div>
    <div style="margin:4px 0"><b>Calculated Process Value:</b> ${eu.toFixed(2)} (${pct.toFixed(1)}% of span)</div>
    <small class="hint">${desc}</small>
  `;
}

const PRESETS = {
  diesel: { shape: 'cyl', dia: 20, thgt: 12, sg: 0.84, temp: 30, lvl: 7.5 },
  fuel: { shape: 'cyl', dia: 30, thgt: 14, sg: 0.88, temp: 35, lvl: 10.0 },
  water: { shape: 'cyl', dia: 15, thgt: 10, sg: 1.00, temp: 25, lvl: 6.0 },
  level: { lo: 0, hi: 15, ma: 12 },
  pressure: { lo: 0, hi: 10, ma: 16 }
};

function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  triggerHaptic('light');
  for (const id in p) {
    const el = $('#' + id);
    if (!el) continue;
    el.value = p[id];
  }
  volCalc();
  drawTank();
  mAcalc();
}

function volCalc() {
  const shapeEl = $('#shape');
  if (!shapeEl) return;
  const isCyl = shapeEl.value === 'cyl';
  const D = n('dia');
  const H = isCyl ? n('thgt') : D;
  let h = Math.max(0, Math.min(n('lvl'), H));
  const T = n('temp');
  const sgEl = $('#sg');
  const alphaEl = $('#alpha');
  const sg = clampSG(sgEl ? sgEl.value : 0.85);
  const a = clampAlpha(alphaEl ? alphaEl.value : 0.0008);

  let V_gross = 0;
  if (isCyl) {
    V_gross = (Math.PI / 4) * D * D * h;
  } else {
    const R = D / 2;
    V_gross = (Math.PI * h * h * (3 * R - h)) / 3;
  }

  const vcf = 1 - a * (T - 15);
  const density_obs = sg * 1000 * vcf;
  const V_std = V_gross * vcf;
  const mass_t = (V_gross * density_obs) / 1000;

  const pct = H > 0 ? (h / H) * 100 : 0;
  const al = { HH: n('aHH'), H: n('aH'), L: n('aL'), LL: n('aLL') };

  let st = 'Normal Safe Level', cls = 'ok', icon = '✅';
  if (pct >= al.HH) { st = 'HIGH-HIGH (HH) EMERGENCY OVERFILL TRIP'; cls = 'bad'; icon = '🚨'; }
  else if (pct >= al.H) { st = 'High (H) Warning Level'; cls = 'warn'; icon = '⚠️'; }
  else if (pct <= al.LL) { st = 'LOW-LOW (LL) SUCTION TRIP'; cls = 'bad'; icon = '🚨'; }
  else if (pct <= al.L) { st = 'Low (L) Suction Warning'; cls = 'warn'; icon = '⚠️'; }

  const dash = $('#tankDashboard');
  if (dash) {
    dash.className = 'out ' + cls;
    dash.innerHTML = `
      <div style="font-weight:700;font-size:1.05rem">${icon} ${st}</div>
      <div style="margin:4px 0"><b>Level:</b> ${h.toFixed(2)} m / ${H.toFixed(2)} m (<b>${pct.toFixed(1)}%</b> full)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;font-size:0.92rem">
        <div><b>Gross Volume:</b> ${V_gross.toFixed(1)} m³</div>
        <div><b>Std Vol (@15°C):</b> ${V_std.toFixed(1)} m³</div>
        <div><b>Observed Density:</b> ${density_obs.toFixed(1)} kg/m³</div>
        <div><b>Liquid Mass:</b> ${mass_t.toFixed(1)} Tonnes</div>
      </div>
      <small class="hint">Linear thermal expansion estimate. Use API MPMS 11.1 tables for custody transfer.</small>
    `;
  }
}

function drawTank() {
  const box = $('#tankBox');
  const shapeEl = $('#shape');
  if (!box || !shapeEl) return;
  const sph = shapeEl.value === 'sph';
  const D = n('dia'), H = sph ? D : n('thgt');
  let h = Math.max(0, Math.min(n('lvl'), H));

  const pct = H > 0 ? (h / H) * 100 : 0;
  const al = { HH: n('aHH'), H: n('aH'), L: n('aL'), LL: n('aLL') };
  const top = 20, bot = 240;
  const y = p => bot - (bot - top) * (p / 100);
  const ty = 220 * (1 - pct / 100);

  const clip = sph ? '<circle cx="130" cy="130" r="110"/>' : '<rect x="62" y="20" width="136" height="220"/>';
  const frame = sph 
    ? '<circle cx="130" cy="130" r="110" fill="none" stroke="currentColor" stroke-width="3"/>' 
    : '<rect x="60" y="20" width="140" height="220" rx="6" fill="none" stroke="currentColor" stroke-width="3"/>';

  const lines = Object.entries(al)
    .filter(([_, v]) => v >= 0 && v <= 100)
    .map(([k, v]) => `<line class="al ${k.includes('HH') || k.includes('LL') ? 'crit' : 'warn'}" x1="${sph ? 20 : 60}" x2="246" y1="${y(v)}" y2="${y(v)}"/><text x="250" y="${y(v) + 4}" font-size="11" fill="currentColor">${k} ${v}%</text>`)
    .join('');

  box.innerHTML = `
    <svg class="tank2" viewBox="0 0 320 260" role="img" aria-label="Tank Level ${pct.toFixed(0)}%">
      <defs><clipPath id="tclip">${clip}</clipPath></defs>
      <g clip-path="url(#tclip)">
        <rect id="tliq" class="lvl" x="20" y="20" width="220" height="220" style="transform:translateY(${ty}px)"/>
      </g>
      ${frame}
      ${lines}
    </svg>
  `;
}

function overfill() {
  const D = n('odia'), fill = n('rate'), gap = n('gap'), resp = n('resp');
  const A = (Math.PI / 4) * D * D;
  const tmin = (gap * A) / (fill || 1) * 60;
  const margin = tmin - resp;

  const cls = margin < 0 ? 'bad' : margin < 5 ? 'warn' : 'ok';
  const out = $('#ofOut');
  if (!out) return;
  out.className = 'out ' + cls;
  out.innerHTML = `
    <div><b>Time from HH to Roof Overflow:</b> ${tmin.toFixed(1)} minutes</div>
    <div><b>Operator Response Window:</b> ${resp} minutes</div>
    <div style="margin-top:4px;font-size:1.02rem"><b>Safety Margin:</b> <b>${margin.toFixed(1)} min</b> ${margin < 0 ? '🚨 INSUFFICIENT: LOWER FILL RATE' : '✅ SAFE BUFFER'}</div>
  `;
}

let proofT = null, proofEnd = 0;
function proofTick() {
  const o = $('#ptOut');
  if (!o) return;
  const s = Math.max(0, Math.ceil((proofEnd - Date.now()) / 1000));
  o.textContent = `Running Proof Test: ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} remaining`;
  if (s <= 0) {
    clearInterval(proofT);
    proofT = null;
    o.textContent = '✅ Proof Test Elapsed: Record valve stroke and trip confirmation.';
    triggerHaptic('warning');
  }
}

function proof() {
  clearInterval(proofT);
  const m = n('pt');
  if (m <= 0) return;
  triggerHaptic('light');
  proofEnd = Date.now() + m * 60000;
  proofTick();
  proofT = setInterval(proofTick, 250);
}

function renderCalc() {
  const v = $('#view-calc');
  if (!v) return;

  v.innerHTML = `
    <h2>Interactive Field Calculators</h2>

    <!-- 4-20 mA Loop Card -->
    <div class="card">
      <div class="card-head">
        <h3>4–20 mA Sensor Loop (NAMUR NE43)</h3>
        <span class="badge-info">Analog Signal Verification</span>
      </div>
      <p class="card-desc">Converts instrument milliamp readings to scaled process engineering units (meters, bar, °C).</p>
      
      <div class="chips presets">
        <span class="chip-label">Quick Presets:</span>
        <button type="button" class="chip" data-preset="level">Level: 0–15m</button>
        <button type="button" class="chip" data-preset="pressure">Pressure: 0–10 bar</button>
      </div>

      <div class="grid">
        <div>
          <label>Measured Signal (mA)</label>
          <input id="ma" type="number" step="any" inputmode="decimal" value="12">
          <small class="hint">Standard signal (4.00 mA = 0%, 20.00 mA = 100%)</small>
        </div>
        <div>
          <label>Range Low (0%)</label>
          <input id="lo" type="number" step="any" inputmode="decimal" value="0">
        </div>
        <div>
          <label>Range High (100%)</label>
          <input id="hi" type="number" step="any" inputmode="decimal" value="20">
        </div>
      </div>
      <div id="maOut" class="out"></div>
    </div>

    <!-- Tank Volume & Graphic -->
    <div class="card">
      <div class="card-head">
        <h3>Tank Volume, Mass & Visual Gauge</h3>
        <span class="badge-info">Bulk Liquid Stock</span>
      </div>
      <p class="card-desc">Calculate storage capacity, gross volume, and temperature-adjusted metric tonnes.</p>

      <div class="chips presets">
        <span class="chip-label">Load Tank Type:</span>
        <button type="button" class="chip" data-preset="diesel">Diesel Tank (20m x 12m)</button>
        <button type="button" class="chip" data-preset="fuel">Fuel Oil Tank (30m x 14m)</button>
        <button type="button" class="chip" data-preset="water">Water Storage (15m x 10m)</button>
      </div>

      <div class="grid">
        <div>
          <label>Shape</label>
          <select id="shape">
            <option value="cyl">Vertical Cylinder</option>
            <option value="sph">Sphere (LPG/Gas)</option>
          </select>
        </div>
        <div>
          <label>Diameter (m)</label>
          <input id="dia" type="number" step="any" inputmode="decimal" value="30">
        </div>
        <div>
          <label>Liquid Level (m)</label>
          <input id="lvl" type="number" step="any" inputmode="decimal" value="10">
        </div>
        <div>
          <label>Temperature (°C)</label>
          <input id="temp" type="number" step="any" inputmode="decimal" value="35">
        </div>
        <div>
          <label>SG @15°C</label>
          <input id="sg" type="number" step="any" inputmode="decimal" min="0.5" max="2" value="0.85">
          <small class="hint">Specific gravity relative to water (Diesel: 0.84, Heavy Fuel: 0.92, Water: 1.0)</small>
        </div>
        <div>
          <label>Tank Shell Height (m)</label>
          <input id="thgt" type="number" step="any" inputmode="decimal" value="14">
        </div>
      </div>

      <!-- Integrated Gauge Display -->
      <div class="visual-tank-container">
        <div id="tankBox"></div>
        <div id="tankDashboard" class="out"></div>
      </div>

      <details class="alarmset">
        <summary>⚙️ Alarm Setpoints, Thermal Expansion & API Gravity</summary>
        <div class="grid" style="margin-top:10px">
          <div><label>LL Setpoint (%)</label><input id="aLL" type="number" step="any" value="5"></div>
          <div><label>L Setpoint (%)</label><input id="aL" type="number" step="any" value="10"></div>
          <div><label>H Setpoint (%)</label><input id="aH" type="number" step="any" value="85"></div>
          <div><label>HH Setpoint (%)</label><input id="aHH" type="number" step="any" value="92"></div>
          <div>
            <label>Thermal Expansion (1/°C)</label>
            <input id="alpha" type="number" step="any" value="0.0008">
            <small class="hint">Clamped between 0.0001 and 0.0025</small>
          </div>
          <div>
            <label>API Gravity (°API)</label>
            <div style="display:flex;gap:6px">
              <input id="api" type="number" step="any" value="35">
              <button type="button" id="apiBtn" style="white-space:nowrap">To SG</button>
            </div>
          </div>
        </div>
        <div id="apiOut" class="out" style="display:none;margin-top:8px"></div>
      </details>
    </div>

    <!-- API 2350 Overfill Window -->
    <div class="card">
      <div class="card-head">
        <h3>HH Overfill Response Time (API 2350)</h3>
        <span class="badge-info">Safety Margin</span>
      </div>
      <p class="card-desc">Calculates remaining response time before tank overflow occurs after tripping the High-High alarm.</p>

      <div class="grid">
        <div><label>Diameter (m)</label><input id="odia" type="number" step="any" value="30"></div>
        <div><label>Max Fill Rate (m³/h)</label><input id="rate" type="number" step="any" value="1500"></div>
        <div>
          <label>HH to Overflow Gap (m)</label>
          <input id="gap" type="number" step="any" value="0.6">
          <small class="hint">Safety distance between HH switch trip and tank roof lip</small>
        </div>
        <div>
          <label>Required Reaction Time (min)</label>
          <input id="resp" type="number" step="any" value="10">
          <small class="hint">API 2350 standard mandates 10 to 15 min minimum</small>
        </div>
      </div>
      <div id="ofOut" class="out"></div>
    </div>

    <!-- Proof-Test Timer -->
    <div class="card">
      <div class="card-head">
        <h3>Safety Proof-Test Countdown</h3>
        <span class="badge-info">Functional Safety Audit</span>
      </div>
      <div style="display:flex;gap:10px;align-items:flex-end">
        <div style="flex:1">
          <label>Test Duration (Minutes)</label>
          <input id="pt" type="number" step="any" value="15">
        </div>
        <button id="ptBtn" style="padding:10px 24px">Start Test</button>
      </div>
      <div id="ptOut" class="out" style="margin-top:10px">Status: Not started</div>
    </div>
  `;

  v.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'sg') e.target.value = e.target.value.replace(/-/g, '');
    if (['ma', 'lo', 'hi'].includes(id)) mAcalc();
    else if (['shape', 'dia', 'thgt', 'lvl', 'temp', 'sg', 'alpha', 'aLL', 'aL', 'aH', 'aHH'].includes(id)) {
      volCalc(); drawTank();
    } else if (['odia', 'rate', 'gap', 'resp'].includes(id)) {
      overfill();
    }
  });

  v.addEventListener('click', e => {
    const b = e.target.closest('[data-preset]');
    if (b) applyPreset(b.dataset.preset);
  });

  const apiBtn = $('#apiBtn');
  if (apiBtn) {
    apiBtn.onclick = () => {
      triggerHaptic('light');
      const sg = sgFromAPI(n('api'));
      const sgEl = $('#sg');
      if (sgEl) sgEl.value = clampSG(sg).toFixed(4);
      const apiOut = $('#apiOut');
      if (apiOut) {
        apiOut.style.display = 'block';
        apiOut.innerHTML = `Converted to SG: <b>${sg.toFixed(4)}</b> (Applied to Tank Calculator)`;
      }
      volCalc(); drawTank();
    };
  }

  const ptBtn = $('#ptBtn');
  if (ptBtn) ptBtn.onclick = proof;

  mAcalc();
  volCalc();
  drawTank();
  overfill();

  renderTools();
  renderSat();
  renderPt100();
  renderModbus();
  pRestore();
}

/* ---------- TAB 2: FIELD TOOLS ---------- */

const NUM = 'type="number" step="any" inputmode="decimal"';
const store = {
  get() { try { return JSON.parse(localStorage.getItem('calRecords') || '[]'); } catch (_) { return []; } },
  set(v) { try { localStorage.setItem('calRecords', JSON.stringify(v)); return true; } catch (_) { return false; } }
};
const PTS = [0, 25, 50, 75, 100];

function calRows() {
  const lo = n('clo'), hi = n('chi'), tol = n('ctol');
  return PTS.map((p, i) => {
    const exp = 4 + (16 * p) / 100;
    const inp = $('#m' + i);
    const m = inp ? Math.min(25, Math.max(0, parseFloat(inp.value))) : NaN;
    const err = isNaN(m) ? null : ((m - exp) / 16) * 100;
    const el = $('#e' + i);
    if (el) {
      el.textContent = err === null ? '-' : err.toFixed(3) + '%';
      el.style.fontWeight = '700';
      el.style.color = err !== null && Math.abs(err) > tol ? '#ef4444' : '#10b981';
    }
    return { p, eu: +(lo + (p / 100) * (hi - lo)).toFixed(3), exp: +exp.toFixed(3), meas: isNaN(m) ? null : m, err };
  });
}

function listRecords() {
  const r = store.get();
  const el = $('#calList');
  if (!el) return;
  el.innerHTML = r.length
    ? r.map((x, i) => ({ x, i })).reverse().map(({ x, i }) => `
        <div class="out rec ${x.pass ? '' : 'bad'}" style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          <div>
            <b>${x.tag || 'No tag'}</b> ${x.pass ? '✅ PASS' : '🚨 FAIL'}<br>
            <small style="opacity:0.7">${new Date(x.ts).toLocaleString()} | Max Error: ${x.maxErr.toFixed(3)}% (Tol: ${x.tol}%)</small>
          </div>
          <button class="del" data-i="${i}" style="background:none;border:none;color:#ef4444;font-size:1.2rem;cursor:pointer">✕</button>
        </div>
      `).join('')
    : '<div class="out">No saved calibration records</div>';
}

function saveCal() {
  const tagEl = $('#ctag');
  const tagV = tagEl ? tagEl.value.trim() : '';
  if (!tagV) {
    triggerHaptic('warning');
    alert('Please enter an Instrument Tag (e.g. LT-101) before saving.');
    return;
  }
  const rows = calRows();
  if (rows.some(r => r.meas === null)) {
    alert('Please enter all 5 measured mA values.');
    return;
  }
  const tol = n('ctol');
  const maxErr = Math.max(...rows.map(r => Math.abs(r.err)));
  const unitEl = $('#cunit');
  const rec = { ts: Date.now(), tag: tagV, lo: n('clo'), hi: n('chi'), unit: unitEl ? unitEl.value : 'm', tol, rows, maxErr, pass: maxErr <= tol };

  const all = store.get();
  all.push(rec);
  store.set(all);
  triggerHaptic(rec.pass ? 'success' : 'warning');
  listRecords();
}

let swT0 = null, swRaf = 0, swEl = 0;
function swTick() {
  swEl = performance.now() - swT0;
  const out = $('#swOut');
  if (out) out.textContent = (swEl / 1000).toFixed(3) + ' s';
  swRaf = requestAnimationFrame(swTick);
}

function swToggle() {
  const btn = $('#swBtn');
  const res = $('#swRes');
  if (swT0 === null) {
    triggerHaptic('light');
    swT0 = performance.now();
    if (btn) { btn.textContent = '⏹ Stop Valve'; btn.style.background = '#ef4444'; }
    if (res) { res.textContent = 'Valve in transit…'; res.className = 'out'; }
    swTick();
  } else {
    cancelAnimationFrame(swRaf);
    swEl = performance.now() - swT0;
    swT0 = null;
    if (btn) { btn.textContent = '▶ Start Stroke'; btn.style.background = ''; }
    const out = $('#swOut');
    if (out) out.textContent = (swEl / 1000).toFixed(3) + ' s';
    swCheck();
  }
}

function swCheck() {
  const tg = n('swTarget') * 1000;
  if (isNaN(tg) || !swEl) return;
  const ok = swEl <= tg;
  triggerHaptic(ok ? 'success' : 'warning');
  const res = $('#swRes');
  if (res) {
    res.className = 'out ' + (ok ? '' : 'bad');
    res.innerHTML = `<b>${ok ? '✅ PASS' : '🚨 FAIL'}</b>: ${(swEl / 1000).toFixed(3)}s stroke time vs ${n('swTarget')}s target limit.`;
  }
}

function swReset() {
  cancelAnimationFrame(swRaf);
  swT0 = null;
  swEl = 0;
  const btn = $('#swBtn');
  if (btn) { btn.textContent = '▶ Start Stroke'; btn.style.background = ''; }
  const out = $('#swOut');
  if (out) out.textContent = '0.000 s';
  const res = $('#swRes');
  if (res) { res.className = 'out'; res.textContent = 'Ready'; }
}

function reg(id) {
  const el = $('#' + id);
  if (!el) return NaN;
  let v = el.value.trim();
  const rfmtEl = $('#rfmt');
  const f = rfmtEl ? rfmtEl.value : 'hex';
  if (!v) return NaN;
  const x = f === 'hex'
    ? (/^(0x)?[0-9a-f]{1,4}$/i.test(v) ? parseInt(v.replace(/^0x/i, ''), 16) : NaN)
    : (/^\d{1,5}$/.test(v) ? parseInt(v, 10) : NaN);
  return x >= 0 && x <= 65535 ? x : NaN;
}

function toFloat(a, b, bs, ws) {
  let w = ws ? [b, a] : [a, b];
  if (bs) w = w.map(x => ((x & 255) << 8) | (x >> 8));
  const dv = new DataView(new ArrayBuffer(4));
  dv.setUint16(0, w[0]);
  dv.setUint16(2, w[1]);
  return { f: dv.getFloat32(0), hex: '0x' + w.map(x => x.toString(16).padStart(4, '0')).join('').toUpperCase() };
}

function fpCalc() {
  const a = reg('r1'), b = reg('r2'), o = $('#fpOut');
  if (!o) return;
  if (isNaN(a) || isNaN(b)) {
    o.className = 'out bad';
    o.textContent = 'Enter two valid 16-bit values (0–65535 or 0000–FFFF)';
    const all = $('#fpAll');
    if (all) all.innerHTML = '';
    return;
  }
  const bsEl = $('#bs'), wsEl = $('#ws');
  const bs = bsEl ? bsEl.checked : false;
  const ws = wsEl ? wsEl.checked : false;
  const r = toFloat(a, b, bs, ws);
  o.className = 'out';
  o.innerHTML = `<b>Decoded Value: ${Number.isFinite(r.f) ? r.f.toPrecision(7) : r.f}</b><br><small class="hint">Assembled Registers: ${r.hex}</small>`;
  const all = $('#fpAll');
  if (all) {
    all.innerHTML = '<table class="cal" style="margin-top:8px"><tr><th>Byte Order</th><th>Decoded Float</th></tr>' +
      [['ABCD (Big Endian)', 0, 0], ['CDAB (Word Swap)', 0, 1], ['BADC (Byte Swap)', 1, 0], ['DCBA (Double Swap)', 1, 1]]
        .map(([l, x, y]) => `<tr><td>${l}</td><td><b>${toFloat(a, b, !!x, !!y).f.toPrecision(6)}</b></td></tr>`).join('') + '</table>';
  }
}

function renderTools() {
  const v = $('#view-tools');
  if (!v) return;

  v.innerHTML = `
    <h2>Field Instrumentation Tools</h2>

    <!-- Loop Calibrator -->
    <div class="card">
      <div class="card-head">
        <h3>5-Point Loop Calibrator (0–100%)</h3>
        <span class="badge-info">ISO / SAT Verification</span>
      </div>
      <p class="card-desc">Tests sensor accuracy by comparing expected mA values against field meter readings.</p>

      <div class="grid">
        <div><label>Instrument Tag</label><input id="ctag" type="text" placeholder="e.g. LT-101"></div>
        <div><label>Physical Unit</label><input id="cunit" type="text" value="m"></div>
        <div><label>Range Low (0%)</label><input id="clo" ${NUM} value="0"></div>
        <div><label>Range High (100%)</label><input id="chi" ${NUM} value="20"></div>
      </div>
      
      <div style="display:flex;gap:10px;align-items:center;margin:8px 0">
        <label style="margin:0">Tolerance (% of span):</label>
        <input id="ctol" ${NUM} value="0.25" style="width:80px">
        <button type="button" class="chip" id="calFill" style="margin-left:auto">💡 Test Demo (Ideal Pass)</button>
      </div>

      <table class="cal">
        <tr><th>% Span</th><th>Physical Target (EU)</th><th>Exp mA</th><th>Measured mA</th><th>Error</th></tr>
        ${PTS.map((p, i) => `<tr><td><b>${p}%</b></td><td id="u${i}">-</td><td>${(4 + (16 * p) / 100).toFixed(2)}</td><td><input id="m${i}" class="cm" ${NUM} min="0" max="25" placeholder="mA"></td><td id="e${i}">-</td></tr>`).join('')}
      </table>
      <div class="legend">
        <small class="hint"><b>EU</b>: Engineering Units (meters, bar, °C) | <b>Exp mA</b>: Standard theoretical current.</small>
      </div>
      <div class="row" style="margin-top:10px">
        <button id="calSave">💾 Save Record</button>
        <button id="calClear">Clear Log</button>
        <button id="calCsv">📊 Export CSV</button>
      </div>
      <div id="calList"></div>
    </div>

    <!-- ESD Stopwatch -->
    <div class="card">
      <div class="card-head">
        <h3>Emergency Valve Stroke Stopwatch</h3>
        <span class="badge-info">API 2350 Audit</span>
      </div>
      <p class="card-desc">Measures motorized/fail-safe valve travel time against safety limits.</p>
      
      <div class="big" id="swOut" style="font-size:2.8rem;text-align:center;font-weight:800;font-family:monospace;margin:12px 0">0.000 s</div>
      
      <div style="display:flex;gap:10px;align-items:center;justify-content:center">
        <label style="margin:0">Datasheet Target Limit (s):</label>
        <input id="swTarget" ${NUM} value="15" style="width:90px">
      </div>
      <div class="row" style="margin-top:12px;justify-content:center">
        <button id="swBtn" style="padding:10px 24px">▶ Start Stroke</button>
        <button id="swReset">Reset</button>
      </div>
      <div id="swRes" class="out" style="text-align:center">Ready</div>
    </div>

    <!-- Modbus IEEE 754 Float Decoder -->
    <div class="card">
      <div class="card-head">
        <h3>Modbus 32-Bit Float Decoder (IEEE 754)</h3>
        <span class="badge-info">PLC Fieldbus Diagnostics</span>
      </div>
      <p class="card-desc">Decodes two 16-bit Modbus registers into engineering floating-point numbers.</p>

      <div class="chips presets">
        <span class="chip-label">Try Examples:</span>
        <button type="button" class="chip" id="mb-ex1">Demo: 25.0 °C Level</button>
        <button type="button" class="chip" id="mb-ex2">Demo: 100.5 bar Pressure</button>
      </div>

      <label>Input format</label>
      <select id="rfmt">
        <option value="hex">Hex</option>
        <option value="dec">Decimal</option>
      </select>

      <div class="grid" style="margin-top:6px">
        <div><label>Register 1 (High Word)</label><input id="r1" type="text" autocapitalize="characters" value="41C8"></div>
        <div><label>Register 2 (Low Word)</label><input id="r2" type="text" autocapitalize="characters" value="0000"></div>
      </div>
      <div style="display:flex;gap:16px;margin:8px 0">
        <label class="chk"><input id="bs" type="checkbox"> Byte swap</label>
        <label class="chk"><input id="ws" type="checkbox"> Word swap</label>
      </div>
      <div id="fpOut" class="out"></div>
      <div id="fpAll"></div>
    </div>
  `;

  const ux = () => {
    const lo = n('clo'), hi = n('chi');
    const unitEl = $('#cunit');
    const unit = unitEl ? unitEl.value : '';
    PTS.forEach((p, i) => {
      const el = $('#u' + i);
      if (el) el.textContent = (lo + (p / 100) * (hi - lo)).toFixed(2) + ' ' + unit;
    });
  };

  v.addEventListener('input', e => {
    const id = e.target.id;
    if (e.target.classList.contains('cm') || ['clo', 'chi', 'ctol', 'cunit'].includes(id)) {
      ux(); calRows();
    }
    if (['r1', 'r2', 'bs', 'ws'].includes(id)) fpCalc();
  });

  const rfmtEl = $('#rfmt');
  if (rfmtEl) {
    rfmtEl.onchange = () => {
      const hex = rfmtEl.value === 'hex';
      ['r1', 'r2'].forEach(id => {
        const el = $('#' + id);
        if (!el) return;
        const x = parseInt(el.value, hex ? 10 : 16);
        if (!isNaN(x)) el.value = hex ? x.toString(16).toUpperCase().padStart(4, '0') : parseInt(el.value, 16);
      });
      fpCalc();
    };
  }

  const fillBtn = $('#calFill');
  if (fillBtn) {
    fillBtn.onclick = () => {
      PTS.forEach((p, i) => {
        const el = $('#m' + i);
        if (el) el.value = (4 + (16 * p) / 100).toFixed(2);
      });
      calRows();
      triggerHaptic('success');
    };
  }

  const saveBtn = $('#calSave');
  if (saveBtn) saveBtn.onclick = saveCal;

  const clearBtn = $('#calClear');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm('Delete all saved calibration records?')) {
        store.set([]); listRecords();
      }
    };
  }

  const csvBtn = $('#calCsv');
  if (csvBtn) {
    csvBtn.onclick = () => {
      const r = store.get();
      if (!r.length) { alert('No calibration records to export.'); return; }
      let csv = 'Tag,Status,Max_Error_Pct,Tolerance_Pct,Timestamp\n';
      r.forEach(x => {
        csv += `"${x.tag}","${x.pass ? 'PASS' : 'FAIL'}",${x.maxErr.toFixed(3)},${x.tol},"${new Date(x.ts).toISOString()}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u; a.download = 'Loop_Calibration_Log.csv'; a.click();
    };
  }

  const swB = $('#swBtn'), swR = $('#swReset');
  if (swB) swB.onclick = swToggle;
  if (swR) swR.onclick = swReset;

  const ex1 = $('#mb-ex1'), ex2 = $('#mb-ex2');
  if (ex1) ex1.onclick = () => { const r1 = $('#r1'), r2 = $('#r2'); if (r1) r1.value = '41C8'; if (r2) r2.value = '0000'; fpCalc(); };
  if (ex2) ex2.onclick = () => { const r1 = $('#r1'), r2 = $('#r2'); if (r1) r1.value = '42C9'; if (r2) r2.value = '0000'; fpCalc(); };

  ux();
  listRecords();
  fpCalc();
}

/* ---------- RTD & MODBUS EXCEPTION EXTENSIONS ---------- */

function rtdT(R, R0) {
  const A = 3.9083e-3, B = -5.775e-7;
  return (-A + Math.sqrt(A * A - 4 * B * (1 - R / R0))) / (2 * B);
}

function rtdCalc() {
  const R = n('rtdR'), R0 = n('rtdR0'), o = $('#rtdOut');
  if (!o) return;
  if (!(R > 0) || !(R0 > 0)) { o.textContent = 'Enter positive resistance'; return; }
  const t = rtdT(R, R0), f = t * 1.8 + 32;
  o.className = 'out' + (t < -200 || t > 850 ? ' bad' : '');
  o.innerHTML = `<b>${t.toFixed(2)} °C</b> (${f.toFixed(2)} °F)`;
}

function renderPt100() {
  const vt = $('#view-tools');
  if (!vt) return;
  vt.insertAdjacentHTML('beforeend', `
    <div class="card">
      <div class="card-head">
        <h3>Pt100 RTD Resistance to Temperature</h3>
        <span class="badge-info">IEC 60751 Standard</span>
      </div>
      <p class="card-desc">Measures platinum RTD resistance: 100.00 Ω = 0.0 °C (ice point), 138.51 Ω = 100.0 °C (boiling point).</p>
      <div class="grid">
        <div><label>Measured Resistance (Ω)</label><input id="rtdR" ${NUM} value="138.51"></div>
        <div><label>Base Resistance R0 (Ω)</label><input id="rtdR0" ${NUM} value="100"></div>
      </div>
      <div id="rtdOut" class="out"></div>
    </div>
  `);
  vt.addEventListener('input', e => {
    if (e.target.id === 'rtdR' || e.target.id === 'rtdR0') rtdCalc();
  });
  rtdCalc();
}

const MBX = {
  '01': ['Illegal Function', 'The slave does not support this function code (e.g. attempting FC04 on a holding-only register map).', 'Check vendor documentation for supported function codes.'],
  '02': ['Illegal Data Address', 'The requested register address does not exist on the device.', 'Verify 0-based vs 1-based addressing offset (add or subtract 1 from register).'],
  '03': ['Illegal Data Value', 'The data quantity is invalid (e.g. requesting more than 125 registers at once).', 'Reduce the requested register count.'],
  '04': ['Slave Device Failure', 'An unrecoverable error occurred inside the field transmitter.', 'Cycle power to the field instrument and verify diagnostic LEDs.']
};

function renderModbus() {
  const vt = $('#view-tools');
  if (!vt) return;
  vt.insertAdjacentHTML('beforeend', `
    <div class="card">
      <div class="card-head">
        <h3>Modbus Exception Code Decoder</h3>
        <span class="badge-info">Fieldbus Troubleshooting</span>
      </div>
      <label>Modbus Exception Code</label>
      <select id="mbx">
        ${Object.keys(MBX).map(k => `<option value="${k}">${k} - ${MBX[k][0]}</option>`).join('')}
      </select>
      <div id="mbxOut" class="out"></div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>RS-485 Serial Communication Checklist</h3>
        <span class="badge-info">Field Wiring Best Practices</span>
      </div>
      <ul style="padding-left:18px;margin:8px 0;font-size:0.9rem">
        <li><b>Polarity Check:</b> Swap A/B (D+/D-) lines if the master receives timeout errors.</li>
        <li><b>Termination:</b> Ensure exactly 120 Ω resistors are installed at the two physical ends of the trunk.</li>
        <li><b>Baud Rate:</b> Confirm baud rate, data bits, and parity match all devices on the daisy chain (e.g., 9600 8-E-1).</li>
      </ul>
    </div>
  `);

  const show = () => {
    const mbxEl = $('#mbx');
    if (!mbxEl) return;
    const x = MBX[mbxEl.value];
    const out = $('#mbxOut');
    if (out && x) {
      out.className = 'out warn';
      out.innerHTML = `<b>${x[0]}</b><br>${x[1]}<br><small class="hint">Remedy: ${x[2]}</small>`;
    }
  };
  const mbxEl = $('#mbx');
  if (mbxEl) mbxEl.onchange = show;
  show();
}

/* ---------- TAB 3: SAT PROTOCOL ---------- */

const SAT_ITEMS = [
  ['Cold Loop Checks', [
    'Tag, range, engineering units, and loop sheet match the as-built P&ID',
    'Cable continuity, insulation meggering resistance, and shield single-point earthing verified',
    'Intrinsically Safe (IS) blue terminal partitions and 50mm segregation confirmed',
    'Loop power supply voltage (24 VDC) and total loop resistance within device operating envelope',
    'HART digital communication and vendor device parameters verified'
  ]],
  ['Hot Loop 5-Point Calibration', [
    'Inject 4.00 mA (0%) and confirm zero reading on SCADA graphic and local transmitter display',
    'Inject 8.00 mA (25%) and confirm scale linearity within tolerance',
    'Inject 12.00 mA (50%) and confirm midpoint reading',
    'Inject 16.00 mA (75%) and confirm linearity',
    'Inject 20.00 mA (100%) and verify full-scale process calibration'
  ]],
  ['Safety Interlocks & ESD Verification', [
    'Manually trip LSHH float switch and confirm audible alarm and SCADA Priority 1 banner',
    'Verify emergency inlet ESD valve full fail-safe closure within specified stroke time',
    'Confirm jetty/pipeline booster feed pump hardwired interlock shutdown executes',
    'Confirm maintenance bypass switch is key-locked, alarmed, and logged in audit trail',
    'Verify valve fail-safe position upon total loss of instrument air or control power'
  ]],
  ['ATG Tank Dip Sounding & Gauge Calibration', [
    'Perform manual hand-dip sounding tape measurement at reference datum plate',
    'Compare radar/servo gauge level against dip tape and verify strap table offset',
    'Confirm multi-spot Pt100 temperature element average matches laboratory thermometer',
    'Verify Nitrogen blanketing pressure regulator (PCV) setpoint and vapor recovery path',
    'Conduct final client SAT punchlist walkdown and sign off calibration sheet'
  ]]
];

const satGet = () => { try { return JSON.parse(localStorage.getItem('satState_v2') || '{}'); } catch (_) { return {}; } };
const satSet = o => { try { localStorage.setItem('satState_v2', JSON.stringify(o)); } catch (_) {} };

function satProgress() {
  const t = document.querySelectorAll('.satchk').length;
  const c = document.querySelectorAll('.satchk:checked').length;
  const el = $('#satProg');
  if (el) {
    el.className = 'out ' + (c === t && t > 0 ? 'ok' : '');
    el.innerHTML = `<b>SAT Progress: ${c} of ${t} steps completed (${t > 0 ? Math.round((c / t) * 100) : 0}%)</b>`;
  }
}

function renderSat() {
  const sv = $('#view-sat');
  if (!sv) return;
  const s = satGet();
  let idx = 0;

  const body = SAT_ITEMS.map(([grp, items]) => `
    <h3 style="margin-top:14px;color:var(--accent-amber)">${grp}</h3>
    ${items.map(txt => {
      const id = 'sat_' + (idx++);
      return `
        <label class="chk" style="margin:6px 0">
          <input type="checkbox" class="satchk" id="${id}" ${s[id] ? 'checked' : ''}>
          <span>${txt}</span>
        </label>
      `;
    }).join('')}
  `).join('');

  sv.innerHTML = `
    <h2>Commissioning & SAT Checklist</h2>
    <div class="card">
      <div class="card-head">
        <h3>Site Acceptance Test Protocol (20 Steps)</h3>
        <span class="badge-info">ISO / SAT Verification</span>
      </div>
      <div class="grid" style="margin:8px 0">
        <div><label>Tank / Loop Tag</label><input id="satRef" type="text" placeholder="e.g. TK-101 / LT-101"></div>
        <div><label>Lead Commissioning Engineer</label><input id="satEng" type="text" placeholder="Engineer Name"></div>
      </div>
      <div id="satProg" class="out"></div>
      ${body}
      <div class="row" style="margin-top:14px">
        <button id="satReset">Reset Checklist</button>
        <button id="satExp">Export SAT Summary</button>
      </div>
    </div>
  `;

  sv.addEventListener('change', e => {
    if (!e.target.classList.contains('satchk')) return;
    const o = satGet();
    if (e.target.checked) o[e.target.id] = 1; else delete o[e.target.id];
    satSet(o);
    satProgress();
    triggerHaptic(document.querySelectorAll('.satchk').length === document.querySelectorAll('.satchk:checked').length ? 'success' : 'light');
  });

  const rBtn = $('#satReset');
  if (rBtn) {
    rBtn.onclick = () => {
      if (confirm('Reset all 20 commissioning steps?')) {
        satSet({});
        document.querySelectorAll('.satchk').forEach(c => c.checked = false);
        satProgress();
        triggerHaptic('warning');
      }
    };
  }

  const expBtn = $('#satExp');
  if (expBtn) {
    expBtn.onclick = () => {
      const refEl = $('#satRef'), engEl = $('#satEng');
      const ref = refEl ? refEl.value || 'TK-UNSPECIFIED' : 'TK-UNSPECIFIED';
      const eng = engEl ? engEl.value || 'Unassigned' : 'Unassigned';
      const c = document.querySelectorAll('.satchk:checked').length;
      const t = document.querySelectorAll('.satchk').length;
      alert(`AGAC SAT SUMMARY REPORT\nTarget: ${ref}\nLead Engineer: ${eng}\nProgress: ${c}/${t} verified steps.\nTimestamp: ${new Date().toLocaleString()}`);
    };
  }

  satProgress();
}

/* ---------- INPUT PERSISTENCE ---------- */

const pGet = () => { try { return JSON.parse(localStorage.getItem('inputState') || '{}'); } catch (_) { return {}; } };
const pSet = o => { try { localStorage.setItem('inputState', JSON.stringify(o)); } catch (_) {} };

function pSave(e) {
  const t = e.target;
  if (!t.id || t.classList.contains('satchk') || t.classList.contains('cm')) return;
  const o = pGet();
  o[t.id] = t.value;
  pSet(o);
}

function pRestore() {
  const o = pGet();
  for (const k in o) {
    const el = document.getElementById(k);
    if (el) el.value = o[k];
  }
}

document.addEventListener('input', pSave);
document.addEventListener('change', pSave);