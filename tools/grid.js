// tools/grid.js
import { calculateColumnWidth, formatNumber } from '../utils/math.js';

export function render() {
  return `
    <div class="tool-grid">
      <div class="input-row">
        <div class="input-col">
          <label>Container Width (px)</label>
          <input type="number" id="grid-container" placeholder="1200" value="1200">
        </div>
      </div>

      <div class="input-row" style="margin-top: 10px;">
        <div class="input-col">
          <label>Columns</label>
          <input type="number" id="grid-cols" placeholder="12" value="12">
        </div>
        <div class="input-col">
          <label>Gap (px)</label>
          <input type="number" id="grid-gap" placeholder="24" value="24">
        </div>
      </div>

      <div class="output-box" style="margin-top: 20px;">
        <div class="output-label">Column Width</div>
        <div class="output-code" id="grid-result">78px</div>
        <button class="icon-btn" id="grid-copy" title="Copy value">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>

      <div class="info-table">
        <div class="info-row">
          <span>Total Gaps Width:</span>
          <span id="grid-total-gaps">264px</span>
        </div>
        <div class="info-row">
          <span>Total Columns Width:</span>
          <span id="grid-total-cols">936px</span>
        </div>
      </div>
      
      <div class="hint-box" style="margin-top:15px; font-size:11px; color:var(--text-muted);">
        <b>CSS Grid Tip:</b> grid-template-columns: repeat(<span id="grid-tip-cols">12</span>, 1fr);
      </div>
    </div>
  `;
}

export function init(container) {
  const inputs = {
    container: container.querySelector('#grid-container'),
    cols: container.querySelector('#grid-cols'),
    gap: container.querySelector('#grid-gap')
  };
  const outputs = {
    result: container.querySelector('#grid-result'),
    totalGaps: container.querySelector('#grid-total-gaps'),
    totalCols: container.querySelector('#grid-total-cols'),
    tipCols: container.querySelector('#grid-tip-cols')
  };

  function update() {
    const cw = parseFloat(inputs.container.value) || 0;
    const cols = parseInt(inputs.cols.value) || 0;
    const gap = parseFloat(inputs.gap.value) || 0;

    if (cols <= 0 || cw <= 0) {
      outputs.result.textContent = '—';
      outputs.totalGaps.textContent = '—';
      outputs.totalCols.textContent = '—';
      return;
    }

    const colW = calculateColumnWidth(cw, cols, gap);
    const tg = gap * (cols - 1);
    const tc = colW * cols;

    outputs.result.textContent = `${formatNumber(colW, 2)}px`;
    outputs.totalGaps.textContent = `${formatNumber(tg, 0)}px`;
    outputs.totalCols.textContent = `${formatNumber(tc, 0)}px`;
    outputs.tipCols.textContent = cols;
  }

  [inputs.container, inputs.cols, inputs.gap].forEach(el => {
    el.addEventListener('input', update);
  });

  container.querySelector('#grid-copy').addEventListener('click', () => {
    window.copyToClipboard(outputs.result.textContent.replace('px', ''));
  });

  update();
}
