// tools/grid-generator.js - Visual CSS Grid Generator with Areas
import { getSettings } from '../utils/storage.js';

let state = {
  cols: 12,
  rows: 4,
  gap: '16px',
  rowGap: null,
  colGap: null,
  separateGap: false,
  cells: [],
  areas: [],
  nextAreaId: 1,
  isDragging: false,
  dragStart: null,
  includeAreas: true,
  useMinmax: false
};

const CELL_SIZE = 28;
const GAP_PREVIEW = 2;

export function render() {
  return `
    <div class="tool-grid grid-generator">
      <!-- Controls -->
      <div class="gg-controls">
        <div class="gg-control-group">
          <label>Columns</label>
          <input type="number" id="gg-cols" min="1" max="24" value="12">
        </div>
        <div class="gg-control-group">
          <label>Rows</label>
          <input type="number" id="gg-rows" min="1" max="12" value="4">
        </div>
        <div class="gg-control-group">
          <label>Gap</label>
          <input type="text" id="gg-gap" value="16px" placeholder="16px">
        </div>
        <button id="gg-reset" class="gg-btn-secondary" title="Reset Grid">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>

      <!-- CSS Options -->
      <div class="gg-options">
        <label class="gg-option">
          <input type="checkbox" id="gg-include-areas" checked>
          <span>Include grid-template-areas</span>
        </label>
        <label class="gg-option">
          <input type="checkbox" id="gg-minmax">
          <span>Use minmax(0, 1fr)</span>
        </label>
        <label class="gg-option">
          <input type="checkbox" id="gg-separate-gap">
          <span>Separate row/column gap</span>
        </label>
      </div>

      <!-- Separate Gap Controls -->
      <div class="gg-gap-controls" id="gg-gap-controls" style="display: none;">
        <div class="gg-control-group">
          <label>Row Gap</label>
          <input type="text" id="gg-row-gap" value="16px" placeholder="16px">
        </div>
        <div class="gg-control-group">
          <label>Col Gap</label>
          <input type="text" id="gg-col-gap" value="16px" placeholder="16px">
        </div>
      </div>

      <!-- Presets -->
      <div class="gg-presets-wrapper">
        <div class="gg-presets">
          <button class="gg-preset" data-preset="12col">12 Col</button>
          <button class="gg-preset" data-preset="holy">Holy Grail</button>
          <button class="gg-preset" data-preset="dashboard">Dashboard</button>
          <button class="gg-preset" data-preset="sidebar">Sidebar</button>
          <button class="gg-preset" data-preset="bento">Bento Box</button>
          <button class="gg-preset" data-preset="masonry">Masonry</button>
          <button class="gg-preset" data-preset="magazine">Magazine</button>
          <button class="gg-preset" data-preset="gallery">Gallery</button>
          <button class="gg-preset" data-preset="pricing">Pricing</button>
          <button class="gg-preset" data-preset="landing">Landing</button>
        </div>
      </div>

      <!-- Grid Editor -->
      <div class="gg-editor-wrapper">
        <div id="gg-grid" class="gg-grid"></div>
      </div>

      <!-- Area Manager -->
      <div class="gg-area-manager">
        <div class="gg-area-input-row">
          <input type="text" id="gg-area-name" placeholder="Area name (e.g., header)" maxlength="20">
          <button id="gg-add-area" class="gg-btn-primary">Add Area</button>
        </div>
        <div id="gg-areas-list" class="gg-areas-list"></div>
      </div>

      <!-- CSS Output -->
      <div class="gg-output-tabs">
        <button class="gg-tab active" data-tab="full">Full CSS</button>
        <button class="gg-tab" data-tab="grid">Grid Only</button>
        <button class="gg-tab" data-tab="areas">Areas Only</button>
      </div>
      <div class="gg-output-box">
        <pre id="gg-css-output" class="gg-code"></pre>
        <button id="gg-copy" class="gg-btn-icon" title="Copy CSS">
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
  const gridEl = container.querySelector('#gg-grid');
  const colsInput = container.querySelector('#gg-cols');
  const rowsInput = container.querySelector('#gg-rows');
  const gapInput = container.querySelector('#gg-gap');
  const resetBtn = container.querySelector('#gg-reset');
  const areaNameInput = container.querySelector('#gg-area-name');
  const addAreaBtn = container.querySelector('#gg-add-area');
  const areasListEl = container.querySelector('#gg-areas-list');
  const cssOutputEl = container.querySelector('#gg-css-output');
  const copyBtn = container.querySelector('#gg-copy');
  const includeAreasCheckbox = container.querySelector('#gg-include-areas');
  const minmaxCheckbox = container.querySelector('#gg-minmax');
  const separateGapCheckbox = container.querySelector('#gg-separate-gap');
  const gapControls = container.querySelector('#gg-gap-controls');
  const rowGapInput = container.querySelector('#gg-row-gap');
  const colGapInput = container.querySelector('#gg-col-gap');
  const presetBtns = container.querySelectorAll('.gg-preset');
  const tabBtns = container.querySelectorAll('.gg-tab');

  let activeTab = 'full';
  let selectedCells = new Set();

  function initGrid() {
    state.cells = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        state.cells.push({
          row: r,
          col: c,
          areaName: null,
          selected: false,
          merged: false
        });
      }
    }
    selectedCells.clear();
  }

  function renderGrid() {
    gridEl.style.gridTemplateColumns = `repeat(${state.cols}, ${CELL_SIZE}px)`;
    gridEl.style.gridTemplateRows = `repeat(${state.rows}, ${CELL_SIZE}px)`;
    gridEl.style.gap = `${GAP_PREVIEW}px`;

    gridEl.innerHTML = '';

    state.cells.forEach((cell, idx) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'gg-cell';
      cellEl.dataset.idx = idx;
      cellEl.dataset.row = cell.row;
      cellEl.dataset.col = cell.col;

      if (cell.areaName) {
        cellEl.classList.add('gg-cell-area');
        cellEl.style.background = getAreaColor(cell.areaName);
        cellEl.textContent = getAreaShortName(cell.areaName);
      }

      if (selectedCells.has(idx)) {
        cellEl.classList.add('gg-cell-selected');
      }

      // Mouse events for selection
      cellEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.isDragging = true;
        state.dragStart = idx;
        toggleCellSelection(idx);
        renderGrid();
        updateCSS();
      });

      cellEl.addEventListener('mouseenter', () => {
        if (state.isDragging && state.dragStart !== null) {
          selectRange(state.dragStart, idx);
          renderGrid();
        }
      });

      gridEl.appendChild(cellEl);
    });
  }

  function toggleCellSelection(idx) {
    if (selectedCells.has(idx)) {
      selectedCells.delete(idx);
    } else {
      selectedCells.add(idx);
    }
  }

  function selectRange(startIdx, endIdx) {
    selectedCells.clear();
    const start = state.cells[startIdx];
    const end = state.cells[endIdx];

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    state.cells.forEach((cell, idx) => {
      if (cell.row >= minRow && cell.row <= maxRow && 
          cell.col >= minCol && cell.col <= maxCol) {
        selectedCells.add(idx);
      }
    });
  }

  function getAreaColor(name) {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  function getAreaShortName(name) {
    return name.length > 4 ? name.slice(0, 3) : name;
  }

  function generateAreaName() {
    // Find next available area number
    let num = 1;
    while (state.areas.find(a => a.name === `area-${num}`)) {
      num++;
    }
    return `area-${num}`;
  }

  function addArea() {
    let name = areaNameInput.value.trim().toLowerCase();
    
    // Auto-generate name if not provided
    if (!name) {
      name = generateAreaName();
    }
    
    if (selectedCells.size === 0) return;

    // Remove these cells from any existing area
    selectedCells.forEach(idx => {
      state.cells[idx].areaName = null;
    });

    // Assign to new area
    selectedCells.forEach(idx => {
      state.cells[idx].areaName = name;
    });

    // Update or add to areas list
    const existingIdx = state.areas.findIndex(a => a.name === name);
    const cellCoords = Array.from(selectedCells).map(idx => ({
      row: state.cells[idx].row,
      col: state.cells[idx].col
    }));

    if (existingIdx >= 0) {
      state.areas[existingIdx].cells = cellCoords;
    } else {
      state.areas.push({ name, cells: cellCoords });
    }

    areaNameInput.value = '';
    selectedCells.clear();
    renderAreasList();
    renderGrid();
    updateCSS();
  }

  function removeArea(name) {
    state.areas = state.areas.filter(a => a.name !== name);
    state.cells.forEach(cell => {
      if (cell.areaName === name) cell.areaName = null;
    });
    renderAreasList();
    renderGrid();
    updateCSS();
  }

  function renderAreasList() {
    areasListEl.innerHTML = '';
    state.areas.forEach(area => {
      const areaEl = document.createElement('div');
      areaEl.className = 'gg-area-item';
      areaEl.innerHTML = `
        <span class="gg-area-color" style="background:${getAreaColor(area.name)}"></span>
        <span class="gg-area-name">${area.name}</span>
        <span class="gg-area-cells">${area.cells.length}</span>
        <button class="gg-area-delete" data-area="${area.name}">×</button>
      `;
      areasListEl.appendChild(areaEl);
    });

    areasListEl.querySelectorAll('.gg-area-delete').forEach(btn => {
      btn.addEventListener('click', () => removeArea(btn.dataset.area));
    });
  }

  function generateGridTemplateAreas() {
    // Create a 2D array representing the grid
    const grid = Array(state.rows).fill(null).map(() => Array(state.cols).fill('.'));

    state.cells.forEach(cell => {
      if (cell.areaName) {
        grid[cell.row][cell.col] = cell.areaName;
      }
    });

    // Check for rectangular areas and merge representation
    const processed = new Set();
    grid.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        if (cell !== '.' && !processed.has(`${rIdx},${cIdx},${cell}`)) {
          // Find the extent of this area
          let maxRow = rIdx;
          let maxCol = cIdx;
          while (maxRow + 1 < state.rows && grid[maxRow + 1][cIdx] === cell) maxRow++;
          while (maxCol + 1 < state.cols && grid[rIdx][maxCol + 1] === cell) maxCol++;

          // Mark processed
          for (let r = rIdx; r <= maxRow; r++) {
            for (let c = cIdx; c <= maxCol; c++) {
              processed.add(`${r},${c},${cell}`);
              if (r === rIdx && c === cIdx) {
                grid[r][c] = cell;
              } else {
                grid[r][c] = '.'; // Will be merged
              }
            }
          }
        }
      });
    });

    return grid.map(row => `"${row.join(' ')}"`).join('\n  ');
  }

  function getColTemplate() {
    if (state.useMinmax) {
      return `repeat(${state.cols}, minmax(0, 1fr))`;
    }
    return `repeat(${state.cols}, 1fr)`;
  }

  function updateCSS() {
    const templateAreas = generateGridTemplateAreas();
    const hasAreas = state.areas.length > 0;
    const includeAreas = state.includeAreas && hasAreas;

    let css = '';

    if (activeTab === 'full' || activeTab === 'grid') {
      css += `.container {\n`;
      css += `  display: grid;\n`;
      css += `  grid-template-columns: ${getColTemplate()};\n`;
      css += `  grid-template-rows: repeat(${state.rows}, auto);\n`;
      
      if (state.separateGap && state.rowGap && state.colGap) {
        css += `  row-gap: ${state.rowGap};\n`;
        css += `  column-gap: ${state.colGap};\n`;
      } else {
        css += `  gap: ${state.gap};\n`;
      }
      
      if (includeAreas && activeTab === 'full') {
        css += `  grid-template-areas:\n    ${templateAreas};\n`;
      }
      css += `}\n`;
    }

    if ((activeTab === 'full' || activeTab === 'areas') && hasAreas) {
      if (activeTab === 'areas') {
        css += `/* Grid Areas */\n`;
      } else {
        css += `\n/* Grid Areas */\n`;
      }
      state.areas.forEach(area => {
        css += `.${area.name} { grid-area: ${area.name}; }\n`;
      });
    }

    cssOutputEl.textContent = css || '/* Select cells and add areas */';
  }

  function applyPreset(preset) {
    selectedCells.clear();
    state.areas = [];
    state.cells.forEach(c => c.areaName = null);

    switch(preset) {
      case '12col':
        state.cols = 12;
        state.rows = 1;
        state.gap = '16px';
        break;
      case 'holy':
        state.cols = 3;
        state.rows = 3;
        state.gap = '16px';
        // Header: row 0, all cols
        for (let c = 0; c < 3; c++) state.cells[c].areaName = 'header';
        // Sidebar: row 1, col 0
        state.cells[3].areaName = 'sidebar';
        // Content: row 1, cols 1-2
        state.cells[4].areaName = 'content';
        state.cells[5].areaName = 'content';
        // Footer: row 2, all cols
        for (let c = 6; c < 9; c++) state.cells[c].areaName = 'footer';
        state.areas = [
          { name: 'header', cells: [{row:0,col:0},{row:0,col:1},{row:0,col:2}] },
          { name: 'sidebar', cells: [{row:1,col:0}] },
          { name: 'content', cells: [{row:1,col:1},{row:1,col:2}] },
          { name: 'footer', cells: [{row:2,col:0},{row:2,col:1},{row:2,col:2}] }
        ];
        break;
      case 'dashboard':
        state.cols = 4;
        state.rows = 3;
        state.gap = '20px';
        // Wide header
        for (let c = 0; c < 4; c++) state.cells[c].areaName = 'header';
        // Sidebar left
        state.cells[4].areaName = 'sidebar';
        state.cells[8].areaName = 'sidebar';
        // Main + widgets
        state.cells[5].areaName = 'main';
        state.cells[6].areaName = 'widget1';
        state.cells[7].areaName = 'widget2';
        state.cells[9].areaName = 'main';
        state.cells[10].areaName = 'main';
        state.cells[11].areaName = 'footer';
        state.areas = [
          { name: 'header', cells: [{row:0,col:0},{row:0,col:1},{row:0,col:2},{row:0,col:3}] },
          { name: 'sidebar', cells: [{row:1,col:0},{row:2,col:0}] },
          { name: 'main', cells: [{row:1,col:1},{row:2,col:1},{row:2,col:2}] },
          { name: 'widget1', cells: [{row:1,col:2}] },
          { name: 'widget2', cells: [{row:1,col:3}] },
          { name: 'footer', cells: [{row:2,col:3}] }
        ];
        break;
      case 'sidebar':
        state.cols = 4;
        state.rows = 2;
        state.gap = '24px';
        state.cells[0].areaName = 'sidebar';
        state.cells[4].areaName = 'sidebar';
        state.cells[1].areaName = 'content';
        state.cells[2].areaName = 'content';
        state.cells[3].areaName = 'content';
        state.cells[5].areaName = 'content';
        state.cells[6].areaName = 'content';
        state.cells[7].areaName = 'content';
        state.areas = [
          { name: 'sidebar', cells: [{row:0,col:0},{row:1,col:0}] },
          { name: 'content', cells: [{row:0,col:1},{row:0,col:2},{row:0,col:3},{row:1,col:1},{row:1,col:2},{row:1,col:3}] }
        ];
        break;
      case 'bento':
        state.cols = 3;
        state.rows = 3;
        state.gap = '12px';
        // Large item top-left (2x2)
        state.cells[0].areaName = 'hero';
        state.cells[1].areaName = 'hero';
        state.cells[3].areaName = 'hero';
        state.cells[4].areaName = 'hero';
        // Small items
        state.cells[2].areaName = 'card1';
        state.cells[5].areaName = 'card2';
        state.cells[6].areaName = 'card3';
        state.cells[7].areaName = 'card4';
        state.cells[8].areaName = 'card5';
        state.areas = [
          { name: 'hero', cells: [{row:0,col:0},{row:0,col:1},{row:1,col:0},{row:1,col:1}] },
          { name: 'card1', cells: [{row:0,col:2}] },
          { name: 'card2', cells: [{row:1,col:2}] },
          { name: 'card3', cells: [{row:2,col:0}] },
          { name: 'card4', cells: [{row:2,col:1}] },
          { name: 'card5', cells: [{row:2,col:2}] }
        ];
        break;
      case 'masonry':
        state.cols = 4;
        state.rows = 3;
        state.gap = '16px';
        // Tall item left
        state.cells[0].areaName = 'tall';
        state.cells[4].areaName = 'tall';
        // Wide item top-middle
        state.cells[1].areaName = 'wide1';
        state.cells[2].areaName = 'wide1';
        state.cells[5].areaName = 'wide2';
        state.cells[6].areaName = 'wide2';
        // Small items
        state.cells[3].areaName = 'small1';
        state.cells[7].areaName = 'small2';
        state.cells[8].areaName = 'small3';
        state.cells[9].areaName = 'small4';
        state.cells[10].areaName = 'small5';
        state.cells[11].areaName = 'small6';
        state.areas = [
          { name: 'tall', cells: [{row:0,col:0},{row:1,col:0}] },
          { name: 'wide1', cells: [{row:0,col:1},{row:0,col:2}] },
          { name: 'wide2', cells: [{row:1,col:1},{row:1,col:2}] },
          { name: 'small1', cells: [{row:0,col:3}] },
          { name: 'small2', cells: [{row:1,col:3}] },
          { name: 'small3', cells: [{row:2,col:0}] },
          { name: 'small4', cells: [{row:2,col:1}] },
          { name: 'small5', cells: [{row:2,col:2}] },
          { name: 'small6', cells: [{row:2,col:3}] }
        ];
        break;
      case 'magazine':
        state.cols = 4;
        state.rows = 4;
        state.gap = '20px';
        // Cover story (2x2 top-left)
        state.cells[0].areaName = 'cover';
        state.cells[1].areaName = 'cover';
        state.cells[4].areaName = 'cover';
        state.cells[5].areaName = 'cover';
        // Headlines
        state.cells[2].areaName = 'headline1';
        state.cells[3].areaName = 'headline2';
        state.cells[6].areaName = 'headline3';
        state.cells[7].areaName = 'ad';
        // Article grid
        state.cells[8].areaName = 'article1';
        state.cells[9].areaName = 'article2';
        state.cells[10].areaName = 'article3';
        state.cells[11].areaName = 'article4';
        state.cells[12].areaName = 'article5';
        state.cells[13].areaName = 'article6';
        state.cells[14].areaName = 'article7';
        state.cells[15].areaName = 'article8';
        state.areas = [
          { name: 'cover', cells: [{row:0,col:0},{row:0,col:1},{row:1,col:0},{row:1,col:1}] },
          { name: 'headline1', cells: [{row:0,col:2}] },
          { name: 'headline2', cells: [{row:0,col:3}] },
          { name: 'headline3', cells: [{row:1,col:2}] },
          { name: 'ad', cells: [{row:1,col:3}] },
          { name: 'article1', cells: [{row:2,col:0}] },
          { name: 'article2', cells: [{row:2,col:1}] },
          { name: 'article3', cells: [{row:2,col:2}] },
          { name: 'article4', cells: [{row:2,col:3}] },
          { name: 'article5', cells: [{row:3,col:0}] },
          { name: 'article6', cells: [{row:3,col:1}] },
          { name: 'article7', cells: [{row:3,col:2}] },
          { name: 'article8', cells: [{row:3,col:3}] }
        ];
        break;
      case 'gallery':
        state.cols = 5;
        state.rows = 3;
        state.gap = '8px';
        // Featured image (3x2)
        state.cells[0].areaName = 'featured';
        state.cells[1].areaName = 'featured';
        state.cells[2].areaName = 'featured';
        state.cells[5].areaName = 'featured';
        state.cells[6].areaName = 'featured';
        state.cells[7].areaName = 'featured';
        // Thumbnails
        state.cells[3].areaName = 'thumb1';
        state.cells[4].areaName = 'thumb2';
        state.cells[8].areaName = 'thumb3';
        state.cells[9].areaName = 'thumb4';
        state.cells[10].areaName = 'thumb5';
        state.cells[11].areaName = 'thumb6';
        state.cells[12].areaName = 'thumb7';
        state.cells[13].areaName = 'thumb8';
        state.cells[14].areaName = 'thumb9';
        state.areas = [
          { name: 'featured', cells: [{row:0,col:0},{row:0,col:1},{row:0,col:2},{row:1,col:0},{row:1,col:1},{row:1,col:2}] },
          { name: 'thumb1', cells: [{row:0,col:3}] },
          { name: 'thumb2', cells: [{row:0,col:4}] },
          { name: 'thumb3', cells: [{row:1,col:3}] },
          { name: 'thumb4', cells: [{row:1,col:4}] },
          { name: 'thumb5', cells: [{row:2,col:0}] },
          { name: 'thumb6', cells: [{row:2,col:1}] },
          { name: 'thumb7', cells: [{row:2,col:2}] },
          { name: 'thumb8', cells: [{row:2,col:3}] },
          { name: 'thumb9', cells: [{row:2,col:4}] }
        ];
        break;
      case 'pricing':
        state.cols = 3;
        state.rows = 2;
        state.gap = '24px';
        // Header row
        state.cells[0].areaName = 'header';
        state.cells[1].areaName = 'header';
        state.cells[2].areaName = 'header';
        // Pricing cards
        state.cells[3].areaName = 'basic';
        state.cells[4].areaName = 'pro';
        state.cells[5].areaName = 'enterprise';
        state.areas = [
          { name: 'header', cells: [{row:0,col:0},{row:0,col:1},{row:0,col:2}] },
          { name: 'basic', cells: [{row:1,col:0}] },
          { name: 'pro', cells: [{row:1,col:1}] },
          { name: 'enterprise', cells: [{row:1,col:2}] }
        ];
        break;
      case 'landing':
        state.cols = 2;
        state.rows = 4;
        state.gap = '0';
        // Hero full width
        state.cells[0].areaName = 'hero';
        state.cells[1].areaName = 'hero';
        // Features
        state.cells[2].areaName = 'feature-img';
        state.cells[3].areaName = 'feature-text';
        // CTA
        state.cells[4].areaName = 'cta-img';
        state.cells[5].areaName = 'cta-text';
        // Footer
        state.cells[6].areaName = 'footer';
        state.cells[7].areaName = 'footer';
        state.areas = [
          { name: 'hero', cells: [{row:0,col:0},{row:0,col:1}] },
          { name: 'feature-img', cells: [{row:1,col:0}] },
          { name: 'feature-text', cells: [{row:1,col:1}] },
          { name: 'cta-img', cells: [{row:2,col:0}] },
          { name: 'cta-text', cells: [{row:2,col:1}] },
          { name: 'footer', cells: [{row:3,col:0},{row:3,col:1}] }
        ];
        break;
    }

    colsInput.value = state.cols;
    rowsInput.value = state.rows;
    gapInput.value = state.gap;

    initGrid();
    // Re-apply area names from preset
    if (preset !== '12col') {
      state.areas.forEach(area => {
        area.cells.forEach(({row, col}) => {
          const idx = row * state.cols + col;
          if (state.cells[idx]) state.cells[idx].areaName = area.name;
        });
      });
    }
    renderAreasList();
    renderGrid();
    updateCSS();
  }

  // Event listeners
  colsInput.addEventListener('input', () => {
    state.cols = parseInt(colsInput.value) || 12;
    initGrid();
    state.areas = [];
    renderAreasList();
    renderGrid();
    updateCSS();
  });

  rowsInput.addEventListener('input', () => {
    state.rows = parseInt(rowsInput.value) || 4;
    initGrid();
    state.areas = [];
    renderAreasList();
    renderGrid();
    updateCSS();
  });

  gapInput.addEventListener('input', () => {
    state.gap = gapInput.value || '16px';
    updateCSS();
  });

  // CSS Options
  includeAreasCheckbox.addEventListener('change', () => {
    state.includeAreas = includeAreasCheckbox.checked;
    updateCSS();
  });

  minmaxCheckbox.addEventListener('change', () => {
    state.useMinmax = minmaxCheckbox.checked;
    updateCSS();
  });

  // Separate Gap Controls
  separateGapCheckbox.addEventListener('change', () => {
    state.separateGap = separateGapCheckbox.checked;
    gapControls.style.display = state.separateGap ? 'flex' : 'none';
    gapInput.parentElement.style.display = state.separateGap ? 'none' : 'flex';
    if (state.separateGap) {
      state.rowGap = rowGapInput.value || '16px';
      state.colGap = colGapInput.value || '16px';
    }
    updateCSS();
  });

  rowGapInput.addEventListener('input', () => {
    state.rowGap = rowGapInput.value || '16px';
    updateCSS();
  });

  colGapInput.addEventListener('input', () => {
    state.colGap = colGapInput.value || '16px';
    updateCSS();
  });

  [rowGapInput, colGapInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
  });

  // FIX: Stop keyboard events from bubbling when input is focused
  areaNameInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      addArea();
    }
  });

  // Also stop for other inputs
  [colsInput, rowsInput, gapInput, rowGapInput, colGapInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
  });

  resetBtn.addEventListener('click', () => {
    state.cols = 12;
    state.rows = 4;
    state.gap = '16px';
    state.rowGap = '16px';
    state.colGap = '16px';
    state.separateGap = false;
    state.areas = [];
    colsInput.value = 12;
    rowsInput.value = 4;
    gapInput.value = '16px';
    rowGapInput.value = '16px';
    colGapInput.value = '16px';
    separateGapCheckbox.checked = false;
    gapControls.style.display = 'none';
    gapInput.parentElement.style.display = 'flex';
    initGrid();
    renderAreasList();
    renderGrid();
    updateCSS();
  });

  addAreaBtn.addEventListener('click', addArea);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      updateCSS();
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

  // Global mouse up to stop dragging
  const mouseUpHandler = () => {
    state.isDragging = false;
    state.dragStart = null;
  };
  document.addEventListener('mouseup', mouseUpHandler);

  // Keyboard shortcuts (only when not in input)
  container.addEventListener('keydown', (e) => {
    // Ignore if target is an input
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') {
      selectedCells.clear();
      renderGrid();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      selectedCells.forEach(idx => {
        const cell = state.cells[idx];
        if (cell.areaName) {
          // Remove from area
          const area = state.areas.find(a => a.name === cell.areaName);
          if (area) {
            area.cells = area.cells.filter(c => !(c.row === cell.row && c.col === cell.col));
            if (area.cells.length === 0) {
              state.areas = state.areas.filter(a => a.name !== cell.areaName);
            }
          }
          cell.areaName = null;
        }
      });
      selectedCells.clear();
      renderAreasList();
      renderGrid();
      updateCSS();
    }
  });

  // Initialize
  initGrid();
  renderGrid();
  renderAreasList();
  updateCSS();

  return {
    destroy() {
      document.removeEventListener('mouseup', mouseUpHandler);
    }
  };
}
