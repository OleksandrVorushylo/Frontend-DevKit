// tools/vw.js
import { calculateVw, calculatePxFromVw, formatNumber } from '../utils/math.js';
import { getSettings, saveSettings } from '../utils/storage.js';

export function render() {
  return `
    <div class="tool-grid">
      <div class="input-row">
        <div class="input-col">
          <label>Viewport Width (px)</label>
          <input type="number" id="vw-viewport" placeholder="1440" value="1440">
        </div>
      </div>

      <div class="input-row" style="margin-top: 15px;">
        <div class="input-col">
          <label>Pixels (px)</label>
          <input type="number" id="vw-px-input" placeholder="48">
        </div>
        <div style="display:flex;align-items:flex-end;padding-bottom:10px;color:var(--text-muted)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>
        <div class="input-col">
          <label>Viewport Width (vw)</label>
          <input type="number" id="vw-vw-input" placeholder="3.33" step="0.01">
        </div>
      </div>

      <div class="output-box" style="margin-top: 25px;">
        <div class="output-code" id="vw-output">3.3333vw</div>
        <button class="icon-btn" id="vw-copy" title="Copy value">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>

      <div class="hint-box" style="margin-top:10px; font-size:11px; color:var(--text-muted);">
        <b>Formula:</b> (px / viewport) * 100
      </div>
    </div>
  `;
}

export async function init(container) {
  let settings;
  try {
    settings = await getSettings();
  } catch (e) {
    settings = { viewportWidth: 1440 };
  }

  const els = {
    viewport: container.querySelector('#vw-viewport'),
    px: container.querySelector('#vw-px-input'),
    vw: container.querySelector('#vw-vw-input'),
    output: container.querySelector('#vw-output'),
    copy: container.querySelector('#vw-copy')
  };

  els.viewport.value = settings.viewportWidth || 1440;

  function updateVw() {
    const px = parseFloat(els.px.value);
    const vw = parseFloat(els.viewport.value);
    if (isNaN(px) || !vw) return (els.output.textContent = '...');
    
    const result = calculateVw(px, vw);
    els.vw.value = formatNumber(result, 2);
    els.output.textContent = `${formatNumber(result, 4)}vw`;
  }

  function updatePx() {
    const vw = parseFloat(els.vw.value);
    const viewW = parseFloat(els.viewport.value);
    if (isNaN(vw) || !viewW) return (els.output.textContent = '...');

    const result = calculatePxFromVw(vw, viewW);
    els.px.value = formatNumber(result, 0);
    els.output.textContent = `${formatNumber(result, 2)}px`;
  }

  els.viewport.addEventListener('input', () => {
    saveSettings({ viewportWidth: parseFloat(els.viewport.value) || 1440 });
    updateVw();
  });

  els.px.addEventListener('input', updateVw);
  els.vw.addEventListener('input', updatePx);

  els.copy.addEventListener('click', () => {
    window.copyToClipboard(els.output.textContent);
  });
}
