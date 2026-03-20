// tools/clamp.js

import { calculateFluidClamp, generateAlternativeClamp } from '../utils/math.js';
import { getSettings, saveSettings, addToHistory } from '../utils/storage.js';

export function render() {
  return `
    <div class="tool-grid">
      <div class="input-row">
        <div class="input-col">
          <label>Min Size</label>
          <input type="number" id="clamp-min" placeholder="24">
        </div>
        <div class="input-col">
          <label>Max Size</label>
          <input type="number" id="clamp-max" placeholder="48">
        </div>
      </div>

      <div class="input-row">
        <div class="input-col">
          <label>Min Viewport</label>
          <input type="number" id="clamp-vp-min" placeholder="640">
        </div>
        <div class="input-col">
          <label>Max Viewport</label>
          <input type="number" id="clamp-vp-max" placeholder="1440">
        </div>
      </div>

      <div class="input-row" style="align-items: center; justify-content: space-between">
        <div class="toggle-group" id="clamp-units">
          <button data-unit="px" class="active">px</button>
          <button data-unit="rem">rem</button>
        </div>
        
        <button id="clamp-generate" class="primary-btn">Generate</button>
      </div>

      <div class="output-box">
        <div class="output-code" id="clamp-output">clamp(24px, 4vw, 48px)</div>
        <button class="icon-btn" id="clamp-copy" title="Copy Clamp">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      
      <div class="output-box" style="margin-top:-10px">
        <div class="output-code" id="clamp-ac-output" style="color: #a855f7">ac(48px, 24px, 640, 1440)</div>
        <button class="icon-btn" id="clamp-ac-copy" title="Copy AC()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      <details class="ac-accordion">
        <summary>AC (Auto Clamp) — guide</summary>
        <div class="ac-body">
          <div class="ac-desc">
            <strong>AC</strong> is a helper that returns CSS <code>clamp()</code> for fluid sizing in <strong>px</strong>.
            The size interpolates between <em>min</em> and <em>max</em> across a viewport range.
            The range is taken from <strong>Min Viewport</strong> and <strong>Max Viewport</strong> above.
          </div>

          <div class="ac-tabs">
            <button class="ac-tab active" type="button" data-ac-tab="scss">SCSS</button>
            <button class="ac-tab" type="button" data-ac-tab="pcss">PCSS</button>
          </div>

          <div class="ac-panel active" data-ac-panel="scss">
            <div class="ac-steps">
              <div class="ac-step">1. Paste the function into your SCSS helpers (e.g. <code>_mixins.scss</code>).</div>
              <div class="ac-step">2. Use <code class="ac-usage" id="ac-scss-usage"></code> in your styles.</div>
              <div class="ac-step">3. Adjust the breakpoints to control the range.</div>
            </div>
            <div class="ac-code-wrap">
              <pre class="ac-code" id="ac-scss-code"></pre>
              <button class="icon-btn ac-copy" type="button" data-ac-copy="scss" title="Copy SCSS">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>

          <div class="ac-panel" data-ac-panel="pcss">
            <div class="ac-steps">
              <div class="ac-step">1. Save the function in your PostCSS/JS helpers.</div>
              <div class="ac-step">2. Use <code class="ac-usage" id="ac-pcss-usage"></code> where you generate styles.</div>
              <div class="ac-step">3. Use px values only (function outputs px).</div>
            </div>
            <div class="ac-code-wrap">
              <pre class="ac-code" id="ac-pcss-code"></pre>
              <button class="icon-btn ac-copy" type="button" data-ac-copy="pcss" title="Copy PCSS">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </details>
      <div class="history-section">
        <label>Recent generated</label>
        <div class="history-list" id="clamp-history"></div>
      </div>
    </div>
  `;
}

export async function init(container) {
  let settings = await getSettings();
  
  const els = {
    min: container.querySelector('#clamp-min'),
    max: container.querySelector('#clamp-max'),
    vpMin: container.querySelector('#clamp-vp-min'),
    vpMax: container.querySelector('#clamp-vp-max'),
    units: container.querySelectorAll('#clamp-units button'),
    btnGenerate: container.querySelector('#clamp-generate'),
    output: container.querySelector('#clamp-output'),
    copyBtn: container.querySelector('#clamp-copy'),
    outputAc: container.querySelector('#clamp-ac-output'),
    copyAcBtn: container.querySelector('#clamp-ac-copy'),
    historyBox: container.querySelector('#clamp-history'),
    acTabs: container.querySelectorAll('.ac-tab'),
    acPanels: container.querySelectorAll('.ac-panel'),
    acScssCode: container.querySelector('#ac-scss-code'),
    acPcssCode: container.querySelector('#ac-pcss-code'),
    acScssUsage: container.querySelector('#ac-scss-usage'),
    acPcssUsage: container.querySelector('#ac-pcss-usage'),
    acCopyBtns: container.querySelectorAll('.ac-copy')
  };

  // Pre-fill settings
  els.vpMin.value = settings.minViewport || 640;
  els.vpMax.value = settings.maxViewport || 1440;
  
  els.units.forEach(u => {
    if (u.dataset.unit === 'rem' && settings.useRem) u.classList.add('active');
    else if (u.dataset.unit === 'px' && !settings.useRem) u.classList.add('active');
    else u.classList.remove('active');
  });

  renderHistory(settings.clampHistory || []);
  function normalizeNumber(value, fallback) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function getAcValues() {
    const minVal = normalizeNumber(els.min.value, 24);
    const maxVal = normalizeNumber(els.max.value, 48);
    const minVp = Math.max(0, normalizeNumber(els.vpMin.value, 640));
    const maxVp = Math.max(minVp + 1, normalizeNumber(els.vpMax.value, 1440));

    const minSize = Math.min(minVal, maxVal);
    const maxSize = Math.max(minVal, maxVal);

    return { minSize, maxSize, minVp, maxVp };
  }

  function buildAcUsage(isScss) {
    const { minSize, maxSize, minVp, maxVp } = getAcValues();
    if (isScss) {
      return `ac(${maxSize}px, ${minSize}px, ${minVp}, ${maxVp})`;
    }
    return `ac(${maxSize}, ${minSize}, ${minVp}, ${maxVp})`;
  }

  function buildAcScssSnippet() {
    const { minVp, maxVp } = getAcValues();
    return `@use 'sass:meta';\n@use 'sass:math';\n\n@function strip-unit($number) {\n  @if meta.type-of($number) == 'number' and not math.is-unitless($number) {\n    @return math.div($number, ($number * 0 + 1));\n  }\n  @return $number;\n}\n\n@function ac($startSize, $minSize, $minBreakpoint: ${minVp}, $maxBreakpoint: ${maxVp}) {\n  $difference: $startSize - $minSize;\n  $addSize: strip-unit($difference);\n\n  @if $difference > 0 {\n    @return clamp(\n      $minSize,\n      calc(\n        #{$minSize} + #{$addSize} *\n          ((100vw - #{$minBreakpoint}px) / #{$maxBreakpoint - $minBreakpoint})\n      ),\n      $startSize\n    );\n  } @else {\n    @return clamp(\n      $startSize,\n      calc(\n        #{$minSize} + #{$addSize} *\n          ((100vw - #{$minBreakpoint}px) / #{$maxBreakpoint - $minBreakpoint})\n      ),\n      $minSize\n    );\n  }\n}`;
  }

  function buildAcPcssSnippet() {
    const { minVp, maxVp } = getAcValues();
    return [
      `export function ac(startSize, endSize, minBreakpoint = ${minVp}, maxBreakpoint = ${maxVp}) {`,
      "  const start = Number(String(startSize).replace('px', ''));",
      "  const end = Number(String(endSize).replace('px', ''));",
      "  const diff = start - end;",
      "  const diffFixed = diff.toFixed(2);",
      "",
      "  const formula = 'calc(' + end + 'px + ' + diffFixed + ' * ((100vw - ' + minBreakpoint + 'px) / ' + (maxBreakpoint - minBreakpoint) + '))';",
      "",
      "  if (diff > 0) {",
      "    return 'clamp(' + end + 'px, ' + formula + ', ' + start + 'px)';",
      "  }",
      "",
      "  return 'clamp(' + start + 'px, ' + formula + ', ' + end + 'px)';",
      "}"
    ].join("\n");
  }

  function updateAcSnippets() {
    if (els.acScssCode) els.acScssCode.textContent = buildAcScssSnippet();
    if (els.acPcssCode) els.acPcssCode.textContent = buildAcPcssSnippet();
    if (els.acScssUsage) els.acScssUsage.textContent = buildAcUsage(true);
    if (els.acPcssUsage) els.acPcssUsage.textContent = buildAcUsage(false);
  }

  function setupAcTabs() {
    if (!els.acTabs || !els.acTabs.length) return;
    els.acTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.acTab;
        els.acTabs.forEach(b => b.classList.toggle('active', b === btn));
        els.acPanels.forEach(panel => {
          panel.classList.toggle('active', panel.dataset.acPanel === tab);
        });
      });
    });
  }

  setupAcTabs();
  updateAcSnippets();

  // Listeners
  els.units.forEach(u => u.addEventListener('click', (e) => {
    els.units.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    settings.useRem = e.target.dataset.unit === 'rem';
    saveSettings({ useRem: settings.useRem });
    if (els.max.value) generate(); // Only auto-generate if there's a value
  }));

  els.btnGenerate.addEventListener('click', generate);

  // Auto generate on Enter
  [els.min, els.max, els.vpMin, els.vpMax].forEach(el => {
    el.addEventListener('keydown', (e) => { if(e.key === 'Enter') generate(); });
    el.addEventListener('input', updateAcSnippets);
    // Save viewport changes implicitly
    if (el.id.includes('vp')) {
      el.addEventListener('change', () => {
        settings.minViewport = parseFloat(els.vpMin.value) || 640;
        settings.maxViewport = parseFloat(els.vpMax.value) || 1440;
        saveSettings({ minViewport: settings.minViewport, maxViewport: settings.maxViewport });
      });
    }
  });

  els.copyBtn.addEventListener('click', () => window.copyToClipboard(els.output.textContent, 'Clamp Copied!'));
  els.copyAcBtn.addEventListener('click', () => window.copyToClipboard(els.outputAc.textContent, 'AC Function Copied!'));

  if (els.acCopyBtns && els.acCopyBtns.length) {
    els.acCopyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.acCopy;
        const text = target === 'pcss' ? els.acPcssCode?.textContent : els.acScssCode?.textContent;
        if (text) window.copyToClipboard(text, 'AC helper copied');
      });
    });
  }

  async function generate() {
    let min = parseFloat(els.min.value);
    let max = parseFloat(els.max.value);
    let vpMin = parseFloat(els.vpMin.value) || 640;
    let vpMax = parseFloat(els.vpMax.value) || 1440;
    
    if (isNaN(max)) return window.showToast('Enter Max Size');
    if (isNaN(min)) {
      min = max * (settings.minMaxFactor || 0.5);
      els.min.value = min;
    }

    const params = {
      min: Math.min(min, max),
      max: Math.max(min, max),
      minViewport: vpMin,
      maxViewport: vpMax,
      useRem: settings.useRem,
      rootFontSize: settings.rootFontSize || 16
    };

    const clampStr = calculateFluidClamp(params);
    const acStr = generateAlternativeClamp(params);
    
    els.output.textContent = clampStr;
    els.outputAc.textContent = acStr;
    updateAcSnippets();

    await addToHistory('clamp', { title: `${params.min} → ${params.max}`, code: clampStr });
    
    settings = await getSettings(); // refresh
    renderHistory(settings.clampHistory);
  }

  function renderHistory(history) {
    if(!history.length) {
      els.historyBox.innerHTML = '<div style="opacity:0.5; font-size:11px">No history yet</div>';
      return;
    }
    els.historyBox.innerHTML = history.slice(0, 5).map(h => `
      <div class="history-item">
        <div class="history-main">${h.code}</div>
        <div class="history-sub">${h.title}</div>
      </div>
    `).join('');

    els.historyBox.querySelectorAll('.history-item').forEach((item, index) => {
      item.addEventListener('click', () => window.copyToClipboard(history[index].code));
    });
  }
}















