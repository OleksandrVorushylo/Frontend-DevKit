// background/background.js

const DEFAULT_SETTINGS = {
  rootFontSize: 16,
  minViewport: 320,
  maxViewport: 1440,
  useRem: false,
  minMaxFactor: 0.5
};

const extensionApi = globalThis.chrome || globalThis.browser;
const runtimeApi = extensionApi?.runtime;
const contextMenusApi = extensionApi?.contextMenus;
const scriptingApi = extensionApi?.scripting;
const tabsApi = extensionApi?.tabs;
const storageArea = extensionApi?.storage?.sync || extensionApi?.storage?.local;

function isPromise(result) {
  return !!result && typeof result.then === 'function';
}

async function getSettings() {
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

// ---- Context Menus ----
if (runtimeApi?.onInstalled) {
  runtimeApi.onInstalled.addListener(() => {
    contextMenusApi?.create({
      id: "frontend-toolbox",
      title: "Frontend Tools",
      contexts: ["selection"]
    });

    contextMenusApi?.create({
      id: "tool-convert-rem",
      parentId: "frontend-toolbox",
      title: "Convert to REM",
      contexts: ["selection"]
    });

    contextMenusApi?.create({
      id: "tool-generate-clamp",
      parentId: "frontend-toolbox",
      title: "Generate Clamp",
      contexts: ["selection"]
    });
  });
}

contextMenusApi?.onClicked?.addListener(async (info, tab) => {
  if (!tab) return;
  const selection = info.selectionText;
  
  const settings = await getSettings();

  // Chrome MV3: use scripting API, fallback to tabs.executeScript for Firefox MV3 legacy.
  if (scriptingApi?.executeScript) {
    scriptingApi.executeScript({
      target: { tabId: tab.id },
      func: handleContextMenuAction,
      args: [info.menuItemId, selection, settings]
    });
  } else if (tabsApi?.executeScript) {
    tabsApi.executeScript(tab.id, {
      code: `(${handleContextMenuAction.toString()})(${JSON.stringify(info.menuItemId)}, ${JSON.stringify(selection)}, ${JSON.stringify(settings)})`
    });
  }
});

// На странице выполняется этот код
function handleContextMenuAction(actionId, selectionText, settings) {
  const parseNumbers = (text) => {
    const numberRegex = /[\d\.]+/g;
    const matches = text.match(numberRegex);
    if (!matches) return [];
    return matches.map(n => parseFloat(n)).filter(n => !isNaN(n));
  };

  const copyAndToast = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`Frontend Tools Copied:\n${text}`);
    });
  };

  const nums = parseNumbers(selectionText);
  if (nums.length === 0) return alert('No numbers found in selection');

  if (actionId === 'tool-convert-rem') {
    const root = settings.rootFontSize || 16;
    const remValue = nums[0] / root;
    copyAndToast(`${Number.isInteger(remValue) ? remValue : remValue.toFixed(4)}rem`);
  } 
  else if (actionId === 'tool-generate-clamp') {
    let minRaw, maxRaw;
    if (nums.length === 1) {
      maxRaw = nums[0];
      minRaw = maxRaw * (settings.minMaxFactor || 0.5);
    } else {
      minRaw = Math.min(...nums);
      maxRaw = Math.max(...nums);
    }

    // slope logic equivalent hardcoded so context menus don't need imports
    const slope = (maxRaw - minRaw) / (settings.maxViewport - settings.minViewport);
    const yIntersection = -settings.minViewport * slope + minRaw;
    const slopeVw = slope * 100;
    
    let clampStr;
    const formatN = (num) => Number.isInteger(num) ? num : parseFloat(num.toFixed(4));
    
    if (settings.useRem) {
      const root = settings.rootFontSize;
      clampStr = `clamp(${formatN(minRaw/root)}rem, calc(${formatN(yIntersection/root)}rem + ${formatN(slopeVw)}vw), ${formatN(maxRaw/root)}rem)`;
    } else {
      clampStr = `clamp(${formatN(minRaw)}px, calc(${formatN(yIntersection)}px + ${formatN(slopeVw)}vw), ${formatN(maxRaw)}px)`;
    }
    
    copyAndToast(clampStr);
  }
}