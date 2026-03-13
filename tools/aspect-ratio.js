// tools/aspect-ratio.js
import { calculateAspectRatio, formatNumber } from '../utils/math.js';

export function render() {
  return `
    <div class="tool-grid">
      <div class="input-row">
        <div class="input-col">
          <label>Width (px)</label>
          <input type="number" id="ar-width" placeholder="1920">
        </div>
        <div class="input-col">
          <label>Height (px)</label>
          <input type="number" id="ar-height" placeholder="1080">
        </div>
      </div>

      <div class="output-box">
        <div class="output-label">Ratio</div>
        <div class="output-code" id="ar-ratio-result">16:9</div>
      </div>

      <div class="divider"></div>

      <div class="input-row">
        <div class="input-col">
          <label>Target Width (px)</label>
          <input type="number" id="ar-target-w" placeholder="1280">
        </div>
        <div class="input-col">
          <label>Calculated Height</label>
          <div class="output-sub-val" id="ar-target-h">720px</div>
        </div>
      </div>

      <div class="result-stack">
        <div class="result-block">
          <div class="result-label">Modern CSS</div>
          <div class="result-value" id="ar-css-modern">aspect-ratio: 16 / 9;</div>
          <button class="icon-btn" id="ar-copy-modern" title="Copy CSS">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
        <div class="result-block">
          <div class="result-label">Legacy Fallback</div>
          <div class="result-value" id="ar-css-fallback">padding-top: 56.25%;</div>
          <button class="icon-btn" id="ar-copy-fallback" title="Copy fallback">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function init(container) {
  const inputs = {
    w: container.querySelector('#ar-width'),
    h: container.querySelector('#ar-height'),
    targetW: container.querySelector('#ar-target-w')
  };
  const outputs = {
    ratio: container.querySelector('#ar-ratio-result'),
    targetH: container.querySelector('#ar-target-h'),
    modern: container.querySelector('#ar-css-modern'),
    fallback: container.querySelector('#ar-css-fallback')
  };

  function update() {
    const w = parseFloat(inputs.w.value) || 0;
    const h = parseFloat(inputs.h.value) || 0;
    const targetW = parseFloat(inputs.targetW.value) || 0;

    if (!w || !h) {
      outputs.ratio.textContent = '—';
      outputs.modern.textContent = 'aspect-ratio: —;';
      outputs.fallback.textContent = 'padding-top: —;';
      outputs.targetH.textContent = '—';
      return;
    }

    const { w: rw, h: rh, string } = calculateAspectRatio(w, h);
    outputs.ratio.textContent = string;
    outputs.modern.textContent = `aspect-ratio: ${rw} / ${rh};`;
    
    const percentage = (h / w) * 100;
    outputs.fallback.textContent = `padding-top: ${formatNumber(percentage, 2)}%;`;

    if (targetW) {
      const th = (h / w) * targetW;
      outputs.targetH.textContent = `${formatNumber(th, 0)}px`;
    } else {
      outputs.targetH.textContent = '—';
    }
  }

  inputs.w.addEventListener('input', update);
  inputs.h.addEventListener('input', update);
  inputs.targetW.addEventListener('input', update);

  container.querySelector('#ar-copy-modern').addEventListener('click', () => {
    window.copyToClipboard(outputs.modern.textContent);
  });
  container.querySelector('#ar-copy-fallback').addEventListener('click', () => {
    window.copyToClipboard(outputs.fallback.textContent);
  });
}
