// utils/storage.js

const DEFAULT_SETTINGS = {
  // Common
  rootFontSize: 16,
  lastTool: 'clamp',
  idleOpacity: 1,
  
  // Percent Calculator
  percentHistory: [],
  percentRows: [],
  
  // Clamp Generator
  minViewport: 320,
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

// Утилиты для работы с историей
export async function addToHistory(toolKey, item) {
  const settings = await getSettings();
  const historyKey = `${toolKey}History`;
  const history = settings[historyKey] || [];
  
  history.unshift({
    ...item,
    id: Date.now().toString(),
    date: Date.now()
  });
  
  // Keep only last 15 items
  if (history.length > 15) {
    history.pop();
  }
  
  await saveSettings({ [historyKey]: history });
}

export async function clearHistory(toolKey) {
  const historyKey = `${toolKey}History`;
  await saveSettings({ [historyKey]: [] });
}
