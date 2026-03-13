// tools/percent.js

import { percentMath, formatNumber } from '../utils/math.js';
import { getSettings, saveSettings, addToHistory } from '../utils/storage.js';

const CALC_TYPES = [
  {
    id: 'pctOf',
    title: 'What is X% of Y',
    suffix: '',
    sign: false,
    compute: (x, y) => percentMath.percentRatio(x, y),
    template: [
      { type: 'text', value: 'What is' },
      { type: 'input', key: 'x', placeholder: '40', width: '64px' },
      { type: 'text', value: '% of' },
      { type: 'input', key: 'y', placeholder: '1200', width: '90px' },
      { type: 'text', value: '?' }
    ]
  },
  {
    id: 'isWhatPercent',
    title: 'X is what % of Y',
    suffix: '%',
    sign: false,
    compute: (x, y) => percentMath.percentageOf(x, y),
    template: [
      { type: 'input', key: 'x', placeholder: '550', width: '80px' },
      { type: 'text', value: 'is what % of' },
      { type: 'input', key: 'y', placeholder: '1440', width: '90px' },
      { type: 'text', value: '?' }
    ]
  },
  {
    id: 'isPercentOfWhat',
    title: 'X is Y% of what',
    suffix: '',
    sign: false,
    compute: (x, y) => percentMath.isPercentageOf(x, y),
    template: [
      { type: 'input', key: 'x', placeholder: '25', width: '64px' },
      { type: 'text', value: 'is' },
      { type: 'input', key: 'y', placeholder: '20', width: '64px' },
      { type: 'text', value: '% of what?' }
    ]
  },
  {
    id: 'change',
    title: 'Change from X to Y',
    suffix: '%',
    sign: true,
    compute: (x, y) => percentMath.difference(x, y),
    template: [
      { type: 'text', value: 'Change from' },
      { type: 'input', key: 'x', placeholder: '100', width: '70px' },
      { type: 'text', value: 'to' },
      { type: 'input', key: 'y', placeholder: '150', width: '70px' }
    ]
  }
];

const typeMap = Object.fromEntries(CALC_TYPES.map(t => [t.id, t]));

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultRows() {
  return CALC_TYPES.map(t => ({
    id: makeId(),
    type: t.id,
    values: { x: '', y: '' }
  }));
}

export function render() {
  return `
    <div class="percent-tool">
      <div class="percent-header">
        <div>
          <div class="percent-title">Percentage calculators</div>
          <div class="percent-subtitle">Keep multiple variations side by side. Each line updates live.</div>
        </div>
        <button id="percent-reset" class="secondary-btn small">Reset</button>
      </div>

      <div id="percent-sections"></div>

      <div class="history-section">
        <label>Recent Calculations</label>
        <div class="history-list" id="pc-history"></div>
      </div>
    </div>
  `;
}

export async function init(container) {
  let settings;
  try {
    settings = await getSettings();
  } catch (e) {
    settings = { percentHistory: [], percentRows: [] };
  }

  let rows = Array.isArray(settings.percentRows) && settings.percentRows.length
    ? settings.percentRows
    : defaultRows();

  const sectionsEl = container.querySelector('#percent-sections');
  const historyBox = container.querySelector('#pc-history');
  const resetBtn = container.querySelector('#percent-reset');
  let saveTimer = null;

  renderSections();
  renderHistory(settings.percentHistory || []);
  updateAllAnswers();

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveSettings({ percentRows: rows });
    }, 150);
  }

  function renderSections() {
    const sectionsHtml = CALC_TYPES.map(type => {
      const rowsOfType = rows.filter(r => r.type === type.id);
      const rowsHtml = rowsOfType.map(r => renderRow(r, type)).join('');

      return `
        <section class="pct-section" data-type="${type.id}">
          <div class="pct-head">
            <div class="pct-head-title">${type.title}</div>
            <button class="pct-add" data-action="add" data-type="${type.id}" title="Add another">Add</button>
          </div>
          <div class="pct-list">${rowsHtml}</div>
        </section>
      `;
    }).join('');

    sectionsEl.innerHTML = sectionsHtml;
  }

  function renderRow(row, type) {
    const segments = type.template.map(seg => {
      if (seg.type === 'text') {
        return `<span class="pct-text">${seg.value}</span>`;
      }
      const value = row.values?.[seg.key] ?? '';
      return `
        <input
          class="pct-input"
          type="number"
          data-row-id="${row.id}"
          data-key="${seg.key}"
          placeholder="${seg.placeholder}"
          value="${escapeHtml(value)}"
          style="width:${seg.width}" />
      `;
    }).join('');

    return `
      <div class="pct-item" data-row-id="${row.id}">
        <div class="pct-row">
          <div class="pct-formula">${segments}</div>
          <div class="pct-answer">
            <div class="pct-answer-label">Answer</div>
            <div class="pct-answer-value" data-answer="${row.id}">—</div>
          </div>
        </div>
        <div class="pct-actions">
          <button class="pct-icon-btn" data-action="commit" title="Save to history" aria-label="Save">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"></path></svg>
          </button>
          <button class="pct-icon-btn" data-action="copy" title="Copy answer" aria-label="Copy">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="pct-icon-btn" data-action="duplicate" title="Duplicate" aria-label="Duplicate">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="12" height="12" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="pct-icon-btn danger" data-action="remove" title="Remove" aria-label="Remove">
            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }

  function computeValue(row) {
    const type = typeMap[row.type];
    if (!type) return null;

    const x = parseFloat(row.values?.x);
    const y = parseFloat(row.values?.y);

    const needsY = type.template.some(t => t.type === 'input' && t.key === 'y');
    if (isNaN(x) || (needsY && isNaN(y))) return null;

    if (type.id === 'change' && x === 0) return null;

    return type.compute(x, y);
  }

  function formatValue(row, value) {
    const type = typeMap[row.type];
    if (value === null || value === undefined || !type) return '—';

    const numeric = formatNumber(value, 2);
    const sign = type.sign && numeric > 0 ? '+' : '';
    return `${sign}${numeric}${type.suffix}`;
  }

  function updateRowAnswer(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const value = computeValue(row);
    const formatted = formatValue(row, value);
    const answerEl = sectionsEl.querySelector(`[data-answer="${rowId}"]`);
    if (answerEl) answerEl.textContent = formatted;
  }

  function updateAllAnswers() {
    rows.forEach(r => updateRowAnswer(r.id));
  }

  function commitHistory(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const value = computeValue(row);
    const formatted = formatValue(row, value);
    if (formatted === '—') return;

    const type = typeMap[row.type];
    const x = row.values?.x || '';
    const y = row.values?.y || '';
    const title = type.title.replace('X', x).replace('Y', y);

    addToHistory('percent', { title, code: formatted }).then(async () => {
      const s = await getSettings();
      renderHistory(s.percentHistory || []);
    });
  }

  // Events
  sectionsEl.addEventListener('input', (e) => {
    const input = e.target;
    if (!input.classList.contains('pct-input')) return;

    const rowId = input.dataset.rowId;
    const key = input.dataset.key;
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    row.values = { ...row.values, [key]: input.value };
    updateRowAnswer(rowId);
    scheduleSave();
  });

  sectionsEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target;
    if (!input.classList.contains('pct-input')) return;
    const rowId = input.dataset.rowId;
    commitHistory(rowId);
  });

  sectionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'add') {
      const type = btn.dataset.type;
      if (!typeMap[type]) return;
      rows = [...rows, { id: makeId(), type, values: { x: '', y: '' } }];
      renderSections();
      updateAllAnswers();
      scheduleSave();
      return;
    }

    const item = btn.closest('.pct-item');
    if (!item) return;
    const rowId = item.dataset.rowId;
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    if (action === 'duplicate') {
      rows = [...rows, { id: makeId(), type: row.type, values: { ...row.values } }];
      renderSections();
      updateAllAnswers();
      scheduleSave();
      return;
    }

    if (action === 'remove') {
      const sameType = rows.filter(r => r.type === row.type);
      if (sameType.length <= 1) return;
      rows = rows.filter(r => r.id !== rowId);
      renderSections();
      updateAllAnswers();
      scheduleSave();
      return;
    }

    if (action === 'copy') {
      const value = computeValue(row);
      const formatted = formatValue(row, value);
      if (formatted === '—') return;
      window.copyToClipboard(formatted, 'Answer copied');
      return;
    }

    if (action === 'commit') {
      commitHistory(rowId);
      return;
    }
  });

  resetBtn.addEventListener('click', () => {
    rows = defaultRows();
    renderSections();
    updateAllAnswers();
    saveSettings({ percentRows: rows });
  });

  function renderHistory(history) {
    if(!historyBox) return;
    if(!history || !history.length) {
      historyBox.innerHTML = '<div style="opacity:0.5; font-size:11px">No history yet</div>';
      return;
    }
    historyBox.innerHTML = history.slice(0, 6).map(h => `
      <div class="history-item">
        <div class="history-main">${h.code}</div>
        <div class="history-sub">${h.title}</div>
      </div>
    `).join('');

    historyBox.querySelectorAll('.history-item').forEach((item, index) => {
      item.addEventListener('click', () => window.copyToClipboard(history[index].code));
    });
  }
}