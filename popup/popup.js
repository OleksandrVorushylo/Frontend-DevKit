// popup/popup.js
import { getSettings, saveSettings } from '../utils/storage.js';

const toolModules = {
  percent: '../tools/percent.js',
  clamp: '../tools/clamp.js',
  rem: '../tools/rem.js',
  color: '../tools/color.js'
};

const extensionApi = globalThis.chrome || globalThis.browser;
let currentToolInstance = null;
let currentToolKey = 'clamp';

function isPromise(result) {
  return !!result && typeof result.then === 'function';
}

function queryActiveTab(tabsApi) {
  return new Promise((resolve) => {
    const res = tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0]);
    });
    if (isPromise(res)) {
      res.then(tabs => resolve(tabs && tabs[0])).catch(() => resolve(null));
    }
  });
}

function toggleOverlayInPage(src, initialOpacity, iconUrl) {
  const existing = document.getElementById('fdt-overlay');
  if (existing) {
    existing.remove();
    return;
  }

  const styleId = 'fdt-overlay-style-v2';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '#fdt-overlay{position:fixed;top:80px;left:0;width:720px;height:560px;background:rgba(10,10,10,0.94);border:1px solid rgba(255,255,255,0.08);border-radius:10px;box-shadow:0 18px 40px rgba(0,0,0,0.45);z-index:2147483647;display:flex;flex-direction:column;min-height:0;overflow:hidden;opacity:1;transition:opacity 0.2s;}',
      '#fdt-overlay *{box-sizing:border-box;}',
      '#fdt-overlay .fdt-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:#0f0f0f;border-bottom:1px solid rgba(255,255,255,0.06);cursor:move;user-select:none;}',
      '#fdt-overlay .fdt-title{font-size:12px;color:#e5e5e5;font-family:system-ui, -apple-system, Segoe UI, sans-serif;white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis;}',
      '#fdt-overlay .fdt-icon{width:16px;height:16px;display:none;}',
      '#fdt-overlay .fdt-opacity{display:flex;align-items:center;gap:6px;font-size:10px;color:#b5b5b5;}',
      '#fdt-overlay .fdt-opacity input{width:90px;}',
      '#fdt-overlay .fdt-opacity-value{min-width:34px;text-align:right;color:#e5e5e5;}',
      '#fdt-overlay .fdt-actions{display:flex;gap:6px;flex:0 0 auto;}',
      '#fdt-overlay .fdt-btn{width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:#151515;color:#d4d4d4;display:grid;place-items:center;font-size:12px;cursor:pointer;}',
      '#fdt-overlay .fdt-btn:hover{border-color:rgba(255,255,255,0.28);}',
      '#fdt-overlay input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;}',
      '#fdt-overlay input[type=range]::-webkit-slider-runnable-track{height:4px;background:linear-gradient(90deg,#e5e7eb,#bfc7d2);border-radius:999px;}',
      '#fdt-overlay input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#f5f5f5;border:1px solid rgba(0,0,0,0.4);margin-top:-4px;}',
      '#fdt-overlay input[type=range]::-moz-range-track{height:4px;background:linear-gradient(90deg,#e5e7eb,#bfc7d2);border-radius:999px;}',
      '#fdt-overlay input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#f5f5f5;border:1px solid rgba(0,0,0,0.4);}',
      '#fdt-overlay.fdt-collapsed{width:150px;box-shadow:0 10px 24px rgba(0,0,0,0.45);}',
      '#fdt-overlay.fdt-collapsed .fdt-header{padding:6px 8px;gap:6px;justify-content:flex-end;}',
      '#fdt-overlay.fdt-collapsed .fdt-opacity{display:none !important;}',
      '#fdt-overlay.fdt-collapsed .fdt-title{display:none;}',
      '#fdt-overlay.fdt-collapsed .fdt-icon{display:block;margin-right:auto;}',
      '#fdt-overlay.fdt-collapsed .fdt-actions{gap:4px;}',
      '#fdt-overlay .fdt-body{flex:1;min-height:0;background:#111;}',
      '#fdt-overlay .fdt-body iframe{width:100%;height:100%;border:0;background:transparent;}',
      '#fdt-overlay.fdt-collapsed .fdt-body{display:none;}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.id = 'fdt-overlay';

  const header = document.createElement('div');
  header.className = 'fdt-header';

  const title = document.createElement('div');
  title.className = 'fdt-title';
  title.textContent = 'Frontend Box';

  const overlayIcon = document.createElement('img');
  overlayIcon.className = 'fdt-icon';
  overlayIcon.alt = 'Frontend Box';
  if (iconUrl) overlayIcon.src = iconUrl;

  const opacityWrap = document.createElement('div');
  opacityWrap.className = 'fdt-opacity';

  const opacityLabel = document.createElement('span');
  opacityLabel.textContent = 'IDLE';

  const opacityInput = document.createElement('input');
  opacityInput.type = 'range';
  opacityInput.min = '0.5';
  opacityInput.max = '1';
  opacityInput.step = '0.05';

  const opacityValue = document.createElement('span');
  opacityValue.className = 'fdt-opacity-value';

  opacityWrap.appendChild(opacityLabel);
  opacityWrap.appendChild(opacityInput);
  opacityWrap.appendChild(opacityValue);

  const actions = document.createElement('div');
  actions.className = 'fdt-actions';

  const iconMinimize = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  const iconRestore = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';

  const btnMin = document.createElement('button');
  btnMin.className = 'fdt-btn';
  btnMin.title = 'Minimize';
  btnMin.setAttribute('aria-label', 'Minimize');
  btnMin.innerHTML = iconMinimize;

  const btnClose = document.createElement('button');
  btnClose.className = 'fdt-btn';
  btnClose.title = 'Close';
  btnClose.textContent = '×';

  actions.appendChild(btnMin);
  actions.appendChild(btnClose);

  header.appendChild(overlayIcon);
  header.appendChild(title);
  header.appendChild(opacityWrap);
  header.appendChild(actions);

  const body = document.createElement('div');
  body.className = 'fdt-body';

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('title', 'Frontend Dev Toolbox');

  body.appendChild(iframe);
  overlay.appendChild(header);
  overlay.appendChild(body);

  const width = 720;
  const height = 560;
  const compactWidth = 150;
  const padding = 12;

  let left = window.innerWidth - width - 24;
  if (left < padding) left = padding;

  overlay.style.left = `${left}px`;
  overlay.style.top = '80px';
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;

  (document.body || document.documentElement).appendChild(overlay);

  let idleOpacityValue = typeof initialOpacity === 'number' ? initialOpacity : 1;
  let isHovering = false;
  let isAdjusting = false;

  function setOverlayOpacity(value) {
    const v = Math.min(1, Math.max(0.5, parseFloat(value) || 1));
    idleOpacityValue = v;
    opacityInput.value = String(v);
    opacityValue.textContent = `${Math.round(v * 100)}%`;
    overlay.style.opacity = (isHovering && !isAdjusting) ? '1' : String(v);
  }

  const applyHoverOn = () => {
    isHovering = true;
    if (!isAdjusting) overlay.style.opacity = '1';
  };

  const applyHoverOff = () => {
    isHovering = false;
    if (!isAdjusting) overlay.style.opacity = String(idleOpacityValue);
  };

  overlay.addEventListener('mouseenter', applyHoverOn);
  overlay.addEventListener('mouseleave', applyHoverOff);
  iframe.addEventListener('mouseenter', applyHoverOn);
  iframe.addEventListener('mouseleave', applyHoverOff);

  setOverlayOpacity(idleOpacityValue);

  opacityInput.addEventListener('input', () => {
    const v = parseFloat(opacityInput.value) || 1;
    isAdjusting = true;
    setOverlayOpacity(v);
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'fdt-set-opacity', value: v }, '*');
    }
  });

  const stopAdjusting = () => {
    if (!isAdjusting) return;
    isAdjusting = false;
    overlay.style.opacity = isHovering ? '1' : String(idleOpacityValue);
  };

  opacityInput.addEventListener('change', stopAdjusting);
  document.addEventListener('pointerup', stopAdjusting);

  let isCollapsed = false;

  function clampPosition(targetWidth) {
    const currentLeft = parseFloat(overlay.style.left) || left;
    const currentTop = parseFloat(overlay.style.top) || 80;
    const maxLeft = Math.max(padding, window.innerWidth - targetWidth - padding);
    const maxTop = Math.max(padding, window.innerHeight - overlay.offsetHeight - padding);
    overlay.style.left = `${Math.min(maxLeft, Math.max(padding, currentLeft))}px`;
    overlay.style.top = `${Math.min(maxTop, Math.max(padding, currentTop))}px`;
  }

  function applyCollapsed() {
    overlay.classList.toggle('fdt-collapsed', isCollapsed);
    btnMin.innerHTML = isCollapsed ? iconRestore : iconMinimize;
    btnMin.title = isCollapsed ? 'Restore' : 'Minimize';
    btnMin.setAttribute('aria-label', btnMin.title);
    overlay.style.width = isCollapsed ? `${compactWidth}px` : `${width}px`;
    overlay.style.height = isCollapsed ? 'auto' : `${height}px`;
    clampPosition(isCollapsed ? compactWidth : width);
  }

  btnMin.addEventListener('click', (e) => {
    e.stopPropagation();
    isCollapsed = !isCollapsed;
    applyCollapsed();
  });

  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
  });

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const startDrag = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.fdt-actions') || event.target.closest('.fdt-opacity')) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = overlay.offsetLeft;
    startTop = overlay.offsetTop;
    header.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const maxLeft = Math.max(padding, window.innerWidth - overlay.offsetWidth - padding);
    const maxTop = Math.max(padding, window.innerHeight - overlay.offsetHeight - padding);
    const nextLeft = Math.min(maxLeft, Math.max(padding, startLeft + dx));
    const nextTop = Math.min(maxTop, Math.max(padding, startTop + dy));
    overlay.style.left = `${nextLeft}px`;
    overlay.style.top = `${nextTop}px`;
  };

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    header.releasePointerCapture?.(event.pointerId);
  };

  header.addEventListener('pointerdown', startDrag);
  header.addEventListener('pointermove', moveDrag);
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', () => {
    clampPosition(isCollapsed ? compactWidth : width);
  });
}

async function initPopup() {
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.get('mode') === 'embedded';
  const root = document.documentElement;
  const body = document.body;

  if (isEmbedded) body.classList.add('embedded');

  const toolTitle = document.getElementById('tool-title');
  const toolContainer = document.getElementById('tool-container');
  const navButtons = Array.from(document.querySelectorAll('.nav-btn[data-tool]'));
  const toast = document.getElementById('toast');
  const opacityInput = document.getElementById('idle-opacity');
  const opacityValue = document.getElementById('idle-opacity-value');
  const pinBtn = document.getElementById('pin-popup');

  let toastTimer = null;
  let idleOpacity = 1;

  function showToast(message = 'Done') {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 1600);
  }

  async function copyToClipboard(text, toastMessage = 'Copied') {
    const value = String(text ?? '');
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      showToast(toastMessage);
      return;
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast(toastMessage);
      } finally {
        textarea.remove();
      }
    }
  }

  window.showToast = showToast;
  window.copyToClipboard = copyToClipboard;

  function setIdleOpacity(value, shouldPersist = false) {
    const v = Math.min(1, Math.max(0.5, parseFloat(value) || 1));
    idleOpacity = v;
    root.style.setProperty('--popup-idle-opacity', String(v));
    if (opacityInput) opacityInput.value = String(v);
    if (opacityValue) opacityValue.textContent = `${Math.round(v * 100)}%`;
    if (shouldPersist) saveSettings({ idleOpacity: v });
  }

  try {
    const settings = await getSettings();
    if (settings?.idleOpacity) setIdleOpacity(settings.idleOpacity);
  } catch (e) {
    setIdleOpacity(1);
  }

  if (opacityInput) {
    opacityInput.addEventListener('input', () => {
      setIdleOpacity(opacityInput.value, true);
    });
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type !== 'fdt-set-opacity') return;
    setIdleOpacity(data.value, true);
  });

  async function loadTool(toolKey, title) {
    const modulePath = toolModules[toolKey];
    if (!modulePath || !toolContainer) return;

    currentToolKey = toolKey;
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolKey);
    });

    if (toolTitle) toolTitle.textContent = title;

    if (currentToolInstance?.destroy) {
      try { currentToolInstance.destroy(); } catch (e) { /* ignore */ }
    }

    const module = await import(modulePath);
    toolContainer.innerHTML = module.render();
    if (module.init) await module.init(toolContainer);
    currentToolInstance = module;

    saveSettings({ lastTool: toolKey });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const toolKey = btn.dataset.tool;
      if (!toolKey) return;
      loadTool(toolKey, btn.textContent.trim());
    });
  });

  if (pinBtn) {
    pinBtn.addEventListener('click', async () => {
      const tabsApi = extensionApi?.tabs;
      const scriptingApi = extensionApi?.scripting;
      if (!tabsApi) return;

      const tab = await queryActiveTab(tabsApi);
      if (!tab?.id) {
        showToast('No active tab');
        return;
      }

      const url = extensionApi?.runtime?.getURL(`popup/popup.html?mode=embedded&tool=${encodeURIComponent(currentToolKey)}`);
      const iconUrl = extensionApi?.runtime?.getURL('icons/icon48.png');
      if (!url) {
        showToast('Failed to resolve popup URL');
        return;
      }

      if (scriptingApi?.executeScript) {
        scriptingApi.executeScript({
          target: { tabId: tab.id },
          func: toggleOverlayInPage,
          args: [url, idleOpacity, iconUrl]
        });
      } else if (tabsApi.executeScript) {
        const code = `(${toggleOverlayInPage.toString()})(${JSON.stringify(url)}, ${JSON.stringify(idleOpacity)}, ${JSON.stringify(iconUrl)});`;
        tabsApi.executeScript(tab.id, { code });
      }

      if (!isEmbedded) {
        setTimeout(() => window.close(), 0);
      }
    });
  }

  let initialTool = 'clamp';
  try {
    const settings = await getSettings();
    const paramTool = urlParams.get('tool');

    if (paramTool && toolModules[paramTool]) {
      initialTool = paramTool;
    } else if (settings?.lastTool && toolModules[settings.lastTool]) {
      initialTool = settings.lastTool;
    }
  } catch (e) {
    // ignore and fallback
  }

  const initialBtn = document.querySelector(`.nav-btn[data-tool="${initialTool}"]`);
  const initialName = initialBtn ? initialBtn.textContent.trim() : 'Clamp Generator';
  loadTool(initialTool, initialName);
}

initPopup();


