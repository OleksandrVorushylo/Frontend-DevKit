// utils/storage.js

const DEFAULT_SETTINGS = {
  // Common
  rootFontSize: 16,
  lastTool: 'clamp',
  idleOpacity: 1,
  theme: 'dark',

  // History controls
  historyLimit: 15,
  historyAutoClearDays: 0,

  // Percent Calculator
  percentHistory: [],
  percentRows: [],

  // Clamp Generator
  minViewport: 640,
  maxViewport: 1440,
  useRem: false,
  minMaxFactor: 0.5,
  clampHistory: [],
  collapsedSections: []
};

const extensionApi = globalThis.chrome || globalThis.browser;
const storageArea = extensionApi?.storage?.sync || extensionApi?.storage?.local;

function isPromise(result) {
  return !!result && typeof result.then === 'function';
}

function normalizeHistorySettings(settings) {
  const limitRaw = parseInt(settings?.historyLimit, 10);
  const daysRaw = parseInt(settings?.historyAutoClearDays, 10);

  const historyLimit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 15;
  const historyAutoClearDays = Number.isFinite(daysRaw) ? Math.max(0, daysRaw) : 0;

  return { historyLimit, historyAutoClearDays };
}

function applyHistoryPolicyToList(list, settings) {
  const safeList = Array.isArray(list) ? list : [];
  const { historyLimit, historyAutoClearDays } = normalizeHistorySettings(settings);

  let result = safeList;

  if (historyAutoClearDays > 0) {
    const cutoff = Date.now() - (historyAutoClearDays * 24 * 60 * 60 * 1000);
    result = result.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      if (!item.date) return true;
      return item.date >= cutoff;
    });
  }

  if (result.length > historyLimit) {
    result = result.slice(0, historyLimit);
  }

  return result;
}

function getHistoryKeys(obj) {
  return Object.keys(obj || {}).filter((key) => key.endsWith('History'));
}

export async function getSettings() {
  if (!storageArea) return { ...DEFAULT_SETTINGS };

  const getter = storageArea.get;
  if (getter.length <= 1) {
    const result = await storageArea.get(DEFAULT_SETTINGS);
    return result || { ...DEFAULT_SETTINGS };
  }

  return new Promise((resolve, reject) => {
    const res = storageArea.get(DEFAULT_SETTINGS, (items) => {
      const err = extensionApi?.runtime?.lastError;
      if (err) return reject(err);
      resolve(items || { ...DEFAULT_SETTINGS });
    });
    if (isPromise(res)) {
      res.then((items) => resolve(items || { ...DEFAULT_SETTINGS })).catch(reject);
    }
  });
}

export async function saveSettings(settings) {
  if (!storageArea) return;

  const setter = storageArea.set;
  if (setter.length <= 1) {
    await storageArea.set(settings);
    return;
  }

  return new Promise((resolve, reject) => {
    const res = storageArea.set(settings, () => {
      const err = extensionApi?.runtime?.lastError;
      if (err) return reject(err);
      resolve();
    });
    if (isPromise(res)) {
      res.then(resolve).catch(reject);
    }
  });
}

export async function enforceHistoryPolicy() {
  const settings = await getSettings();
  const historyKeys = getHistoryKeys(settings);
  const updates = {};

  historyKeys.forEach((key) => {
    const original = Array.isArray(settings[key]) ? settings[key] : [];
    const next = applyHistoryPolicyToList(original, settings);
    if (next.length !== original.length) {
      updates[key] = next;
    }
  });

  if (Object.keys(updates).length > 0) {
    await saveSettings(updates);
  }
}

// History helpers
export async function addToHistory(toolKey, item) {
  const settings = await getSettings();
  const historyKey = `${toolKey}History`;
  const history = Array.isArray(settings[historyKey]) ? settings[historyKey] : [];

  history.unshift({
    ...item,
    id: Date.now().toString(),
    date: Date.now()
  });

  const nextHistory = applyHistoryPolicyToList(history, settings);
  await saveSettings({ [historyKey]: nextHistory });
}

export async function clearHistory(toolKey) {
  const historyKey = `${toolKey}History`;
  await saveSettings({ [historyKey]: [] });
}

export async function clearAllHistories() {
  const settings = await getSettings();
  const historyKeys = getHistoryKeys(settings);
  if (!historyKeys.length) return;

  const updates = {};
  historyKeys.forEach((key) => {
    updates[key] = [];
  });

  await saveSettings(updates);
}

