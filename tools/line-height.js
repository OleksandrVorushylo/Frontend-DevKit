// tools/line-height.js
import { calculateLineHeight, formatNumber } from '../utils/math.js';

export function render() {
  return `
    <div class="tool-grid">
      <div class="input-row">
        <div class="input-col">
          <label>Font Size (px)</label>
          <input type="number" id="lh-fs" placeholder="16" value="16">
        </div>
        <div class="input-col">
          <label>Line Height (px)</label>
          <input type="number" id="lh-lh" placeholder="24">
        </div>
      </div>

      <div class="output-box" style="margin-top: 20px;">
        <div class="output-label">Unitless line-height</div>
        <div class="output-code" id="lh-result">1.5</div>
        <button class="icon-btn" id="lh-copy" title="Copy value">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>

      <div class="divider"></div>

      <div class="result-stack">
        <div class="result-block">
          <div class="result-label">CSS Property</div>
          <div class="result-value" id="lh-css">line-height: 1.5;</div>
          <button class="icon-btn" id="lh-copy-css" title="Copy CSS">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </div>
      
      <div class="hint-box" style="margin-top:15px; font-size:11px; color:var(--text-muted);">
        <b>Tip:</b> Using unitless values for line-height is recommended for better accessibility and inheritance.
      </div>
    </div>
  `;
}

export function init(container) {
  const inputs = {
    fs: container.querySelector('#lh-fs'),
    lh: container.querySelector('#lh-lh')
  };
  const outputs = {
    result: container.querySelector('#lh-result'),
    css: container.querySelector('#lh-css')
  };

  function update() {
    const fs = parseFloat(inputs.fs.value) || 0;
    const lh = parseFloat(inputs.lh.value) || 0;

    if (!fs || !lh) {
      outputs.result.textContent = '—';
      outputs.css.textContent = 'line-height: —;';
      return;
    }

    const ratio = calculateLineHeight(lh, fs);
    const formatted = formatNumber(ratio, 3);
    
    outputs.result.textContent = formatted;
    outputs.css.textContent = `line-height: ${formatted};`;
  }

  inputs.fs.addEventListener('input', update);
  inputs.lh.addEventListener('input', update);

  container.querySelector('#lh-copy').addEventListener('click', () => {
    window.copyToClipboard(outputs.result.textContent);
  });
  container.querySelector('#lh-copy-css').addEventListener('click', () => {
    window.copyToClipboard(outputs.css.textContent);
  });
}
