// tools/rem.js

import { getSettings, saveSettings } from '../utils/storage.js';
import { formatNumber } from '../utils/math.js';

export function render() {
  return `
    <div class="tool-grid">
      <div class="input-row">
        <div class="input-col">
          <label>Root Font Size (px)</label>
          <input type="number" id="rem-root" placeholder="16" value="16">
        </div>
      </div>

      <div class="input-row" style="margin-top: 10px;">
        <div class="input-col">
          <label>Pixels (px)</label>
          <input type="number" id="rem-px-input" placeholder="e.g. 24" autofocus>
        </div>
        <div style="display:flex;align-items:flex-end;padding-bottom:10px;color:var(--text-muted)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>
        <div class="input-col">
          <label>REM (rem)</label>
          <input type="number" id="rem-rm-input" placeholder="e.g. 1.5" step="0.1">
        </div>
      </div>

      <div class="quick-actions" id="rem-quick-actions" style="margin-top: 15px; display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="secondary-btn small" data-px="8">8px</button>
        <button class="secondary-btn small" data-px="16">16px</button>
        <button class="secondary-btn small" data-px="24">24px</button>
        <button class="secondary-btn small" data-px="32">32px</button>
        <button class="secondary-btn small" data-px="48">48px</button>
        <button class="secondary-btn small" data-px="64">64px</button>
      </div>

      <div class="output-box" style="margin-top: 20px;">
        <div class="output-code" id="rem-output">1.5rem</div>
        <button class="icon-btn" id="rem-copy" title="Copy Value">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      
      <div class="hint-box" style="font-size:11px; color:var(--text-muted); background:var(--bg-input); padding: 10px; border-radius:4px;">
        <b>Hint:</b> Conversion happens automatically as you type.
      </div>
    </div>
  `;
}

export async function init(container) {
  let settings;
  try {
      settings = await getSettings();
  } catch (e) {
      settings = { rootFontSize: 16 };
  }
  
  const els = {
    root: container.querySelector('#rem-root'),
    px: container.querySelector('#rem-px-input'),
    rem: container.querySelector('#rem-rm-input'),
    output: container.querySelector('#rem-output'),
    copyBtn: container.querySelector('#rem-copy')
  };

  if(!els.root || !els.px) return;

  els.root.value = settings.rootFontSize || 16;

  // Listeners
  els.root.addEventListener('input', () => {
    settings.rootFontSize = parseFloat(els.root.value) || 16;
    saveSettings({ rootFontSize: settings.rootFontSize });
    if (els.px.value) calcFromPx();
  });

  els.px.addEventListener('input', calcFromPx);
  els.rem.addEventListener('input', calcFromRem);
  
  const quickActions = container.querySelector('#rem-quick-actions');
  if (quickActions) {
    quickActions.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn && btn.dataset.px) {
        els.px.value = btn.dataset.px;
        calcFromPx();
      }
    });
  }

  els.copyBtn.addEventListener('click', () => window.copyToClipboard(els.output.textContent));

  function calcFromPx() {
    const px = parseFloat(els.px.value);
    if (isNaN(px)) return reset();
    
    const rem = formatNumber(px / settings.rootFontSize);
    els.rem.value = rem;
    els.output.textContent = rem + 'rem';
  }

  function calcFromRem() {
    const rem = parseFloat(els.rem.value);
    if (isNaN(rem)) return reset();
    
    const px = formatNumber(rem * settings.rootFontSize, 2);
    els.px.value = px;
    els.output.textContent = px + 'px';
  }
  
  function reset() {
    els.output.textContent = '...';
  }
}