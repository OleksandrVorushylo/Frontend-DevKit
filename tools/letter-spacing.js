// tools/letter-spacing.js
import { calculateLetterSpacing, formatNumber } from '../utils/math.js';

export function render() {
  return `
    <div class="tool-grid">
      <div class="input-row">
        <div class="input-col">
          <label>Font Size (px)</label>
          <input type="number" id="ls-fs" placeholder="16" value="16">
        </div>
        <div class="input-col">
          <label>Tracking (%) <small>(Figma)</small></label>
          <input type="number" id="ls-tracking" placeholder="2" step="0.1">
        </div>
      </div>

      <div class="output-box" style="margin-top: 20px;">
        <div class="output-label">Result in PX</div>
        <div class="output-code" id="ls-result-px">0.32px</div>
      </div>

      <div class="result-stack" style="margin-top: 15px;">
        <div class="result-block">
          <div class="result-label">EM Value</div>
          <div class="result-value" id="ls-em">0.02em</div>
          <button class="icon-btn" id="ls-copy-em" title="Copy EM">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
        <div class="result-block">
          <div class="result-label">CSS Property</div>
          <div class="result-value" id="ls-css">letter-spacing: 0.02em;</div>
          <button class="icon-btn" id="ls-copy-css" title="Copy CSS">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function init(container) {
  const inputs = {
    fs: container.querySelector('#ls-fs'),
    tracking: container.querySelector('#ls-tracking')
  };
  const outputs = {
    px: container.querySelector('#ls-result-px'),
    em: container.querySelector('#ls-em'),
    css: container.querySelector('#ls-css')
  };

  function update() {
    const fs = parseFloat(inputs.fs.value) || 0;
    const tracking = parseFloat(inputs.tracking.value) || 0;

    if (!fs) {
      outputs.px.textContent = '—';
      outputs.em.textContent = '—';
      outputs.css.textContent = 'letter-spacing: —;';
      return;
    }

    const px = calculateLetterSpacing(tracking, fs);
    const em = tracking / 100;

    outputs.px.textContent = `${formatNumber(px, 2)}px`;
    outputs.em.textContent = `${formatNumber(em, 3)}em`;
    outputs.css.textContent = `letter-spacing: ${formatNumber(em, 3)}em;`;
  }

  inputs.fs.addEventListener('input', update);
  inputs.tracking.addEventListener('input', update);

  container.querySelector('#ls-copy-em').addEventListener('click', () => {
    window.copyToClipboard(outputs.em.textContent);
  });
  container.querySelector('#ls-copy-css').addEventListener('click', () => {
    window.copyToClipboard(outputs.css.textContent);
  });
}
