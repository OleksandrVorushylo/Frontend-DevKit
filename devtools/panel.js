// devtools/panel.js
import { getSettings } from '../utils/storage.js';
import { calculateFluidClamp } from '../utils/math.js';

const PROPS = ['font-size', 'line-height', 'margin', 'padding', 'gap', 'border-radius'];

const inspector = document.getElementById('inspector-content');
const noSelection = document.getElementById('no-selection');
const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.style.opacity = 1;
  setTimeout(() => toast.style.opacity = 0, 2000);
}

function copyText(text) {
  // Execute via inspectedWindow since clipboard API in devtools panels can be tricky
  chrome.devtools.inspectedWindow.eval(`
    navigator.clipboard.writeText(\`${text}\`);
  `, (result, isException) => {
    showToast('Copied: ' + text);
  });
}

function renderProps(styles) {
  inspector.innerHTML = '';
  
  if (!styles || Object.keys(styles).length === 0) {
    inspector.style.display = 'none';
    noSelection.style.display = 'block';
    return;
  }

  noSelection.style.display = 'none';
  inspector.style.display = 'block';

  PROPS.forEach(prop => {
    let val = styles[prop];
    if (!val || val === 'none' || val === '0px') return; // Skip empty

    // Parse main number if it's simple
    const numMatch = val.match(/^([\d\.]+)px/);
    const hasSinglePx = !!numMatch;

    let actionsHtml = `<button class="btn action-copy" data-val="${prop}: ${val};">Copy</button>`;
    
    if (hasSinglePx) {
      actionsHtml += `
        <button class="btn action-rem" data-px="${numMatch[1]}">REM</button>
        <button class="btn action-clamp" data-px="${numMatch[1]}">Clamp</button>
      `;
    }

    const row = document.createElement('div');
    row.className = 'prop-row';
    row.innerHTML = `
      <div class="prop-name">${prop}</div>
      <div class="prop-val">${val}</div>
      <div class="actions">${actionsHtml}</div>
    `;

    // Attach events
    const copyBtn = row.querySelector('.action-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => copyText(copyBtn.dataset.val));

    const remBtn = row.querySelector('.action-rem');
    if (remBtn) remBtn.addEventListener('click', async () => {
      const px = parseFloat(remBtn.dataset.px);
      const s = await getSettings();
      const rem = px / (s.rootFontSize || 16);
      copyText(`${prop}: ${rem}rem;`);
    });

    const clampBtn = row.querySelector('.action-clamp');
    if (clampBtn) clampBtn.addEventListener('click', async () => {
      const maxRaw = parseFloat(clampBtn.dataset.px);
      const s = await getSettings();
      const minRaw = maxRaw * (s.minMaxFactor || 0.5);
      
      const clampStr = calculateFluidClamp({
        min: minRaw, max: maxRaw,
        minViewport: s.minViewport || 320,
        maxViewport: s.maxViewport || 1440,
        useRem: s.useRem, 
        rootFontSize: s.rootFontSize || 16
      });
      
      copyText(`${prop}: ${clampStr};`);
    });

    inspector.appendChild(row);
  });
}

// Function to inject into inspected page
function getSelectedStyles(propsArray) {
  if (!window.$0) return null;
  const computed = window.getComputedStyle($0);
  const result = {};
  propsArray.forEach(p => result[p] = computed.getPropertyValue(p));
  return result;
}

function updateSelection() {
  chrome.devtools.inspectedWindow.eval(
    `(${getSelectedStyles.toString()})(${JSON.stringify(PROPS)})`,
    function(result, isException) {
      if (isException || !result) {
        renderProps(null);
      } else {
        renderProps(result);
      }
    }
  );
}

// Initial check
updateSelection();

// Listen for selection changes in Elements panel
chrome.devtools.panels.elements.onSelectionChanged.addListener(updateSelection);
