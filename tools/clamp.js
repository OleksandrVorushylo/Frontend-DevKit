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
          <input type="number" id="clamp-vp-min" placeholder="320">
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
        <div class="output-code" id="clamp-ac-output" style="color: #a855f7">ac(48px, 24px, 1440)</div>
        <button class="icon-btn" id="clamp-ac-copy" title="Copy AC()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>

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
    historyBox: container.querySelector('#clamp-history')
  };

  // Pre-fill settings
  els.vpMin.value = settings.minViewport || 320;
  els.vpMax.value = settings.maxViewport || 1440;
  
  els.units.forEach(u => {
    if (u.dataset.unit === 'rem' && settings.useRem) u.classList.add('active');
    else if (u.dataset.unit === 'px' && !settings.useRem) u.classList.add('active');
    else u.classList.remove('active');
  });

  renderHistory(settings.clampHistory || []);

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
    // Save viewport changes implicitly
    if (el.id.includes('vp')) {
      el.addEventListener('change', () => {
        settings.minViewport = parseFloat(els.vpMin.value) || 320;
        settings.maxViewport = parseFloat(els.vpMax.value) || 1440;
        saveSettings({ minViewport: settings.minViewport, maxViewport: settings.maxViewport });
      });
    }
  });

  els.copyBtn.addEventListener('click', () => window.copyToClipboard(els.output.textContent, 'Clamp Copied!'));
  els.copyAcBtn.addEventListener('click', () => window.copyToClipboard(els.outputAc.textContent, 'AC Function Copied!'));

  async function generate() {
    let min = parseFloat(els.min.value);
    let max = parseFloat(els.max.value);
    let vpMin = parseFloat(els.vpMin.value) || 320;
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
