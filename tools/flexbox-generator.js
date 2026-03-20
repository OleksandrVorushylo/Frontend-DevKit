// tools/flexbox-generator.js - Visual Flexbox Generator
import { getSettings } from '../utils/storage.js';

let state = {
  direction: 'row',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  alignContent: 'stretch',
  wrap: 'nowrap',
  gap: '16px',
  rowGap: '16px',
  colGap: '16px',
  separateGap: false,
  items: 4
};

export function render() {
  return `
    <div class="tool-grid flexbox-generator">
      <!-- Controls -->
      <div class="flexbox-controls">
        <div class="flexbox-control-row">
          <div class="flexbox-control-group">
            <label>Flex Direction</label>
            <select id="flex-direction">
              <option value="row" selected>Row →</option>
              <option value="row-reverse">Row Reverse ←</option>
              <option value="column">Column ↓</option>
              <option value="column-reverse">Column Reverse ↑</option>
            </select>
          </div>
          <div class="flexbox-control-group">
            <label>Flex Wrap</label>
            <select id="flex-wrap">
              <option value="nowrap" selected>No Wrap</option>
              <option value="wrap">Wrap</option>
              <option value="wrap-reverse">Wrap Reverse</option>
            </select>
          </div>
        </div>

        <div class="flexbox-control-row">
          <div class="flexbox-control-group">
            <label>Justify Content</label>
            <select id="flex-justify">
              <option value="flex-start" selected>Flex Start</option>
              <option value="flex-end">Flex End</option>
              <option value="center">Center</option>
              <option value="space-between">Space Between</option>
              <option value="space-around">Space Around</option>
              <option value="space-evenly">Space Evenly</option>
            </select>
          </div>
          <div class="flexbox-control-group">
            <label>Align Items</label>
            <select id="flex-align-items">
              <option value="stretch" selected>Stretch</option>
              <option value="flex-start">Flex Start</option>
              <option value="flex-end">Flex End</option>
              <option value="center">Center</option>
              <option value="baseline">Baseline</option>
            </select>
          </div>
        </div>

        <div class="flexbox-control-row">
          <div class="flexbox-control-group">
            <label>Align Content</label>
            <select id="flex-align-content">
              <option value="stretch" selected>Stretch</option>
              <option value="flex-start">Flex Start</option>
              <option value="flex-end">Flex End</option>
              <option value="center">Center</option>
              <option value="space-between">Space Between</option>
              <option value="space-around">Space Around</option>
              <option value="space-evenly">Space Evenly</option>
            </select>
          </div>
          <div class="flexbox-control-group">
            <label>Gap (px)</label>
            <input type="number" id="flex-gap" value="16" placeholder="16" min="0">
          </div>
        </div>

        <!-- Separate Gap Controls -->
        <div class="flexbox-control-row">
          <div class="flexbox-control-group flexbox-checkbox-group">
            <label class="flexbox-checkbox-label">
              <input type="checkbox" id="flex-separate-gap">
              <span>Separate row/column gap</span>
            </label>
          </div>
        </div>
        <div class="flexbox-gap-controls" id="flex-gap-controls" style="display: none;">
          <div class="flexbox-control-group">
            <label>Row Gap (px)</label>
            <input type="number" id="flex-row-gap" value="16" placeholder="16" min="0">
          </div>
          <div class="flexbox-control-group">
            <label>Column Gap (px)</label>
            <input type="number" id="flex-col-gap" value="16" placeholder="16" min="0">
          </div>
        </div>

        <div class="flexbox-control-row">
          <div class="flexbox-control-group">
            <label>Items Count</label>
            <input type="range" id="flex-items-count" min="1" max="12" value="4">
            <span class="flexbox-range-value" id="flex-items-value">4</span>
          </div>
          <div class="flexbox-control-group">
            <label>Items Size</label>
            <select id="flex-item-size">
              <option value="auto" selected>Auto</option>
              <option value="grow">Flex Grow</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Live Preview -->
      <div class="flexbox-preview-wrapper">
        <div id="flexbox-preview" class="flexbox-preview">
          <div class="flexbox-item"></div>
          <div class="flexbox-item"></div>
          <div class="flexbox-item"></div>
          <div class="flexbox-item"></div>
        </div>
      </div>

      <!-- CSS Output -->
      <div class="flexbox-output-box">
        <pre id="flexbox-css-output" class="flexbox-code"></pre>
        <button id="flexbox-copy" class="gg-btn-icon" title="Copy CSS">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

export function init(container) {
  const previewEl = container.querySelector('#flexbox-preview');
  const wrapperEl = container.querySelector('.flexbox-preview-wrapper');
  const directionSelect = container.querySelector('#flex-direction');
  const wrapSelect = container.querySelector('#flex-wrap');
  const justifySelect = container.querySelector('#flex-justify');
  const alignItemsSelect = container.querySelector('#flex-align-items');
  const alignContentSelect = container.querySelector('#flex-align-content');
  const gapInput = container.querySelector('#flex-gap');
  const separateGapCheckbox = container.querySelector('#flex-separate-gap');
  const gapControls = container.querySelector('#flex-gap-controls');
  const rowGapInput = container.querySelector('#flex-row-gap');
  const colGapInput = container.querySelector('#flex-col-gap');
  const itemsCountInput = container.querySelector('#flex-items-count');
  const itemsValueSpan = container.querySelector('#flex-items-value');
  const itemSizeSelect = container.querySelector('#flex-item-size');
  const cssOutputEl = container.querySelector('#flexbox-css-output');
  const copyBtn = container.querySelector('#flexbox-copy');

  function setMaxWidth() {
    // Disabled - let CSS handle sizing
  }

  function updatePreview() {
    // Update container styles only, no max-width manipulation
    previewEl.style.display = 'flex';
    previewEl.style.flexDirection = state.direction;
    previewEl.style.flexWrap = state.wrap;
    previewEl.style.justifyContent = state.justifyContent;
    previewEl.style.alignItems = state.alignItems;
    previewEl.style.alignContent = state.alignContent;
    // Update gap (preview capped: half value, max 16px)
    const parseGapValue = (value) => {
      if (!value) return 0;
      const parsed = parseFloat(String(value).replace('px', ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const previewGapValue = (value) => {
      const numeric = parseGapValue(value);
      return Math.min(16, Math.max(0, numeric / 2));
    };

    if (state.separateGap && state.rowGap && state.colGap) {
      const rowGap = previewGapValue(state.rowGap);
      const colGap = previewGapValue(state.colGap);
      previewEl.style.rowGap = `${rowGap}px`;
      previewEl.style.columnGap = `${colGap}px`;
      previewEl.style.gap = '';
    } else {
      const gap = previewGapValue(state.gap);
      previewEl.style.gap = `${gap}px`;
      previewEl.style.rowGap = `${gap}px`;
      previewEl.style.columnGap = `${gap}px`;
    }

    // Update items
    const currentItems = previewEl.querySelectorAll('.flexbox-item');
    const currentCount = currentItems.length;
    const targetCount = state.items;

    // Add or remove items
    if (currentCount < targetCount) {
      for (let i = currentCount; i < targetCount; i++) {
        const item = document.createElement('div');
        item.className = 'flexbox-item';
        previewEl.appendChild(item);
      }
    } else if (currentCount > targetCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) {
        currentItems[i].remove();
      }
    }

    // Update item sizes
    const sizeMode = itemSizeSelect.value;
    previewEl.querySelectorAll('.flexbox-item').forEach(item => {
      // Reset styles
      item.style.flex = '';
      item.style.width = '';
      item.style.height = '';
      item.style.minWidth = '';
      
      if (sizeMode === 'grow') {
        item.style.flex = '1 1 auto';
      } else {
        // 'auto' mode - let CSS handle with flex: 1 1 0
        item.style.flex = '1 1 0';
        item.style.minWidth = '0';
      }
    });

    updateCSS();
  }

  function updateCSS() {
    let css = `.container {\n`;
    css += `  display: flex;\n`;
    css += `  flex-direction: ${state.direction};\n`;
    css += `  flex-wrap: ${state.wrap};\n`;
    css += `  justify-content: ${state.justifyContent};\n`;
    css += `  align-items: ${state.alignItems};\n`;
    
    if (state.wrap !== 'nowrap') {
      css += `  align-content: ${state.alignContent};\n`;
    }
    
    if (state.separateGap && state.rowGap && state.colGap) {
      css += `  row-gap: ${state.rowGap};\n`;
      css += `  column-gap: ${state.colGap};\n`;
    } else {
      css += `  gap: ${state.gap};\n`;
    }
    css += `}`;

    const sizeMode = itemSizeSelect.value;
    if (sizeMode === 'grow') {
      css += `\n\n.item {\n  flex: 1;\n}`;
    }

    cssOutputEl.textContent = css;
  }

  // Event listeners
  directionSelect.addEventListener('change', () => {
    state.direction = directionSelect.value;
    updatePreview();
  });

  wrapSelect.addEventListener('change', () => {
    state.wrap = wrapSelect.value;
    updatePreview();
  });

  justifySelect.addEventListener('change', () => {
    state.justifyContent = justifySelect.value;
    updatePreview();
  });

  alignItemsSelect.addEventListener('change', () => {
    state.alignItems = alignItemsSelect.value;
    updatePreview();
  });

  alignContentSelect.addEventListener('change', () => {
    state.alignContent = alignContentSelect.value;
    updatePreview();
  });

  gapInput.addEventListener('input', () => {
    state.gap = (gapInput.value || '16') + 'px';
    updatePreview();
  });

  itemsCountInput.addEventListener('input', () => {
    state.items = parseInt(itemsCountInput.value) || 4;
    itemsValueSpan.textContent = state.items;
    updatePreview();
  });

  itemSizeSelect.addEventListener('change', () => {
    updatePreview();
  });

  // Separate Gap Controls
  separateGapCheckbox.addEventListener('change', () => {
    state.separateGap = separateGapCheckbox.checked;
    gapControls.style.display = state.separateGap ? 'flex' : 'none';
    gapInput.parentElement.style.display = state.separateGap ? 'none' : 'flex';
    if (state.separateGap) {
      state.rowGap = (rowGapInput.value || '16') + 'px';
      state.colGap = (colGapInput.value || '16') + 'px';
    }
    updatePreview();
  });

  rowGapInput.addEventListener('input', () => {
    state.rowGap = (rowGapInput.value || '16') + 'px';
    updatePreview();
  });

  colGapInput.addEventListener('input', () => {
    state.colGap = (colGapInput.value || '16') + 'px';
    updatePreview();
  });

  [rowGapInput, colGapInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
  });

  // Keyboard shortcuts fix
  [gapInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
  });

  copyBtn.addEventListener('click', () => {
    const text = cssOutputEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
      }, 1500);
    });
  });

  // Initialize
  updatePreview();

  // Update max-width on resize
  const resizeHandler = () => {
    setMaxWidth();
    updatePreview();
  };
  window.addEventListener('resize', resizeHandler);

  return {
    destroy() {
      window.removeEventListener('resize', resizeHandler);
    }
  };
}


