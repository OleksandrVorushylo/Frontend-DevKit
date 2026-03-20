// tools/settings.js - App Settings
// NOTE FOR FUTURE AI: Keep "Appearance" section first; add new settings sections below.

import {
  getSettings,
  saveSettings,
  clearAllHistories,
  enforceHistoryPolicy
} from '../utils/storage.js';

export function render() {
  return `
    <div class="tool-grid settings-tool">
      <section class="settings-card">
        <div class="settings-card-head">
          <div class="settings-card-title">Appearance</div>
          <div class="settings-card-sub">Choose how the toolbox theme should look.</div>
        </div>

        <div class="settings-row">
          <div class="settings-field">
            <label for="app-theme-mode">Theme mode</label>
            <select id="app-theme-mode" class="settings-select">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <div class="settings-card-head">
          <div class="settings-card-title">History Controls</div>
          <div class="settings-card-sub">Manage limits, auto-cleanup, and reset all history records.</div>
        </div>

        <div class="settings-row">
          <div class="settings-field">
            <label for="history-limit">Max records per history</label>
            <input id="history-limit" type="number" min="1" max="200" step="1" />
          </div>
          <div class="settings-field">
            <label for="history-auto-clear-days">Auto clear older than (days)</label>
            <input id="history-auto-clear-days" type="number" min="0" step="1" />
          </div>
        </div>

        <div class="settings-actions">
          <button id="save-history-controls" class="secondary-btn">Save History Settings</button>
          <button id="clear-all-histories" class="secondary-btn settings-danger">Clear All Histories</button>
        </div>
      </section>
    </div>
  `;
}

export async function init(container) {
  const themeSelect = container.querySelector('#app-theme-mode');
  const historyLimitInput = container.querySelector('#history-limit');
  const historyAutoClearInput = container.querySelector('#history-auto-clear-days');
  const saveHistoryBtn = container.querySelector('#save-history-controls');
  const clearAllBtn = container.querySelector('#clear-all-histories');

  const themeApi = window.fdtThemeAPI;
  const currentMode = themeApi?.getThemeMode?.() || 'dark';
  if (themeSelect) {
    themeSelect.value = currentMode;
    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value;
      window.dispatchEvent(new CustomEvent('fdt-theme-change', {
        detail: { theme }
      }));
    });
  }

  const settings = await getSettings();
  if (historyLimitInput) {
    historyLimitInput.value = String(settings.historyLimit ?? 15);
  }
  if (historyAutoClearInput) {
    historyAutoClearInput.value = String(settings.historyAutoClearDays ?? 0);
  }

  saveHistoryBtn?.addEventListener('click', async () => {
    const limit = Math.min(200, Math.max(1, parseInt(historyLimitInput?.value || '15', 10) || 15));
    const autoClearDays = Math.max(0, parseInt(historyAutoClearInput?.value || '0', 10) || 0);

    if (historyLimitInput) historyLimitInput.value = String(limit);
    if (historyAutoClearInput) historyAutoClearInput.value = String(autoClearDays);

    await saveSettings({
      historyLimit: limit,
      historyAutoClearDays: autoClearDays
    });
    await enforceHistoryPolicy();

    if (window.showToast) window.showToast('History settings saved');
  });

  clearAllBtn?.addEventListener('click', async () => {
    await clearAllHistories();
    if (window.showToast) window.showToast('All histories cleared');
  });
}

