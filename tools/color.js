// tools/color.js

import {
  clampNumber,
  hexToRgba,
  rgbaToHex,
  rgbString,
  rgbaString,
  hslToRgb,
  parseColor,
  TAILWIND_COLORS,
  TAILWIND_ORDER
} from '../utils/color.js';

const CLIPBOARD_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

export function render() {
  return `
    <div class="color-tool">
      <section class="color-card" data-tool="hex-rgb">
        <div class="color-card-head">
          <div>
            <div class="color-card-title">HEX → RGB</div>
            <div class="color-card-sub">Supports #ffffff, ffffff, #ffffffff.</div>
          </div>
        </div>
        <div class="color-card-body">
          <div class="input-row">
            <div class="input-col">
              <label>HEX</label>
              <div class="color-input-wrapper">
                <div class="color-picker-swatch" title="Choose color">
                  <div class="swatch-bg"></div>
                  <div class="swatch-color" id="hex-swatch-display" style="background-color: #67e8f9;"></div>
                  <input type="color" id="native-color-picker" value="#67e8f9">
                </div>
                <input type="text" id="hex-input" placeholder="#67e8f9">
                <button type="button" class="icon-btn-field" id="hex-input-copy" title="Copy HEX">
                  ${CLIPBOARD_ICON}
                </button>
                <button type="button" class="eyedropper-btn" id="hex-eyedropper-btn" title="Pick color from screen">
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
              <div class="input-error" id="hex-error">Invalid hex format</div>
            </div>
            <div class="color-preview" id="hex-preview"></div>
            <div class="result-block">
              <div class="result-label">rgb</div>
              <div class="result-value" id="hex-rgb-value">rgb(0, 0, 0)</div>
              <button class="icon-btn" id="hex-rgb-copy" title="Copy rgb">${CLIPBOARD_ICON}</button>
            </div>
            <div class="result-block" id="hex-rgba-row">
              <div class="result-label">rgba</div>
              <div class="result-value" id="hex-rgba-value">rgba(0, 0, 0, 1)</div>
              <button class="icon-btn" id="hex-rgba-copy" title="Copy rgba">${CLIPBOARD_ICON}</button>
            </div>
          </div>
        </div>
      </section>

      <section class="color-card" data-tool="rgb-hex">
        <div class="color-card-head">
          <div>
            <div class="color-card-title">RGB → HEX</div>
            <div class="color-card-sub">Live conversion with sliders.</div>
          </div>
          <div class="color-input-wrapper compact-wrapper">
            <div class="color-picker-swatch" title="Choose color">
              <div class="swatch-bg"></div>
              <div class="swatch-color" id="rgb-swatch-display" style="background-color: #000000;"></div>
              <input type="color" id="rgb-native-picker" value="#000000">
            </div>
            <input type="text" id="rgb-sync-input" class="hidden-text-input" value="#000000" readonly>
            <button type="button" class="icon-btn-field" id="rgb-sync-copy" title="Copy HEX">
              ${CLIPBOARD_ICON}
            </button>
            <button type="button" class="eyedropper-btn" id="rgb-eyedropper-btn" title="Pick color from screen">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>
        <div class="color-card-body">
          <div class="color-grid-3">
            <div class="input-col">
              <label>R</label>
              <input type="number" min="0" max="255" id="rgb-r" placeholder="0">
              <input type="range" min="0" max="255" id="rgb-r-range">
            </div>
            <div class="input-col">
              <label>G</label>
              <input type="number" min="0" max="255" id="rgb-g" placeholder="0">
              <input type="range" min="0" max="255" id="rgb-g-range">
            </div>
            <div class="input-col">
              <label>B</label>
              <input type="number" min="0" max="255" id="rgb-b" placeholder="0">
              <input type="range" min="0" max="255" id="rgb-b-range">
            </div>
          </div>
          <div class="result-block wide">
            <div class="result-label">HEX</div>
            <div class="result-value" id="rgb-hex-value">#000000</div>
            <button class="icon-btn" id="rgb-hex-copy" title="Copy hex">${CLIPBOARD_ICON}</button>
          </div>
          <div class="color-preview" id="rgb-preview"></div>
        </div>
      </section>

      <section class="color-card" data-tool="hsl-hex">
        <div class="color-card-head">
          <div>
            <div class="color-card-title">HSL → HEX</div>
            <div class="color-card-sub">H: 0–360, S/L: 0–100.</div>
          </div>
          <div class="color-input-wrapper compact-wrapper">
            <div class="color-picker-swatch" title="Choose color">
              <div class="swatch-bg"></div>
              <div class="swatch-color" id="hsl-swatch-display" style="background-color: #3b82f6;"></div>
              <input type="color" id="hsl-native-picker" value="#3b82f6">
            </div>
            <input type="text" id="hsl-sync-input" class="hidden-text-input" value="#3b82f6" readonly>
            <button type="button" class="icon-btn-field" id="hsl-sync-copy" title="Copy HEX">
              ${CLIPBOARD_ICON}
            </button>
            <button type="button" class="eyedropper-btn" id="hsl-eyedropper-btn" title="Pick color from screen">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>
        <div class="color-card-body">
          <div class="color-grid-3">
            <div class="input-col">
              <label>H</label>
              <input type="number" min="0" max="360" id="hsl-h" placeholder="210">
            </div>
            <div class="input-col">
              <label>S%</label>
              <input type="number" min="0" max="100" id="hsl-s" placeholder="60">
            </div>
            <div class="input-col">
              <label>L%</label>
              <input type="number" min="0" max="100" id="hsl-l" placeholder="50">
            </div>
          </div>
          <div class="result-block wide">
            <div class="result-label">HEX</div>
            <div class="result-value" id="hsl-hex-value">#3b82f6</div>
            <button class="icon-btn" id="hsl-hex-copy" title="Copy hex">${CLIPBOARD_ICON}</button>
          </div>
          <div class="color-preview" id="hsl-preview"></div>
        </div>
      </section>

      <section class="color-card" data-tool="opacity">
        <div class="color-card-head">
          <div>
            <div class="color-card-title">Opacity Generator</div>
            <div class="color-card-sub">HEX or RGB input, live alpha output.</div>
          </div>
        </div>
        <div class="color-card-body">
          <div class="input-row">
            <div class="input-col">
              <label>Base color</label>
              <div class="color-input-wrapper">
                <div class="color-picker-swatch" title="Choose color">
                  <div class="swatch-bg"></div>
                  <div class="swatch-color" id="opacity-swatch-display" style="background-color: #0ea5e9;"></div>
                  <input type="color" id="opacity-native-picker" value="#0ea5e9">
                </div>
                <input type="text" id="opacity-base" placeholder="#0ea5e9">
                <button type="button" class="icon-btn-field" id="opacity-base-copy" title="Copy Base Color">
                  ${CLIPBOARD_ICON}
                </button>
                <button type="button" class="eyedropper-btn" id="opacity-eyedropper-btn" title="Pick color from screen">
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
              <div class="input-error" id="opacity-error">Invalid color input</div>
            </div>
            <div class="input-col">
              <label>Opacity %</label>
              <div class="opacity-inputs">
                <input type="number" min="0" max="100" id="opacity-value" placeholder="80">
                <input type="range" min="0" max="100" id="opacity-range">
              </div>
              <div class="hint">Tip: 0% = transparent, 100% = solid</div>
            </div>
          </div>
          <div class="color-swatch" id="opacity-swatch"></div>
          <div class="result-stack">
            <div class="result-block">
              <div class="result-label">rgba</div>
              <div class="result-value" id="opacity-rgba">rgba(0, 0, 0, 1)</div>
              <button class="icon-btn" id="opacity-rgba-copy" title="Copy rgba">${CLIPBOARD_ICON}</button>
            </div>
            <div class="result-block">
              <div class="result-label">hex 8</div>
              <div class="result-value" id="opacity-hex8">#000000ff</div>
              <button class="icon-btn" id="opacity-hex8-copy" title="Copy hex8">${CLIPBOARD_ICON}</button>
            </div>
            <div class="result-block">
              <div class="result-label">css var</div>
              <div class="result-value" id="opacity-css">--color-primary: rgba(0, 0, 0, 1);</div>
              <button class="icon-btn" id="opacity-css-copy" title="Copy css var">${CLIPBOARD_ICON}</button>
            </div>
          </div>
        </div>
      </section>

      <section class="color-card" data-tool="tailwind">
        <div class="color-card-head">
          <div>
            <div class="color-card-title">Tailwind Color Preview</div>
            <div class="color-card-sub">Click a swatch to copy HEX + class.</div>
          </div>
          <div class="tw-controls">
            <input type="text" id="tw-search" class="tw-search" placeholder="Search color (red, slate...)">
            <button type="button" class="accordion-toggle" id="tw-toggle">Collapse</button>
          </div>
        </div>
        <div class="color-card-body" id="tw-container"></div>
      </section>
    </div>
  `;
}

export function init(container) {
  // 1. DOM Selections
  const hexInput = container.querySelector('#hex-input');
  const hexError = container.querySelector('#hex-error');
  const hexRgbValue = container.querySelector('#hex-rgb-value');
  const hexRgbaRow = container.querySelector('#hex-rgba-row');
  const hexRgbaValue = container.querySelector('#hex-rgba-value');
  const hexRgbCopy = container.querySelector('#hex-rgb-copy');
  const hexRgbaCopy = container.querySelector('#hex-rgba-copy');
  const hexPreview = container.querySelector('#hex-preview');

  const rgbSyncInput = container.querySelector('#rgb-sync-input');
  const hslSyncInput = container.querySelector('#hsl-sync-input');

  const rgbInputs = {
    r: container.querySelector('#rgb-r'),
    g: container.querySelector('#rgb-g'),
    b: container.querySelector('#rgb-b')
  };
  const rgbRanges = {
    r: container.querySelector('#rgb-r-range'),
    g: container.querySelector('#rgb-g-range'),
    b: container.querySelector('#rgb-b-range')
  };
  const rgbHexValue = container.querySelector('#rgb-hex-value');
  const rgbHexCopy = container.querySelector('#rgb-hex-copy');
  const rgbPreview = container.querySelector('#rgb-preview');

  const hslInputs = {
    h: container.querySelector('#hsl-h'),
    s: container.querySelector('#hsl-s'),
    l: container.querySelector('#hsl-l')
  };
  const hslHexValue = container.querySelector('#hsl-hex-value');
  const hslHexCopy = container.querySelector('#hsl-hex-copy');
  const hslPreview = container.querySelector('#hsl-preview');

  const opacityBase = container.querySelector('#opacity-base');
  const opacityError = container.querySelector('#opacity-error');
  const opacityValue = container.querySelector('#opacity-value');
  const opacityRange = container.querySelector('#opacity-range');
  const opacitySwatch = container.querySelector('#opacity-swatch');
  const opacityRgba = container.querySelector('#opacity-rgba');
  const opacityHex8 = container.querySelector('#opacity-hex8');
  const opacityCss = container.querySelector('#opacity-css');
  const opacityRgbaCopy = container.querySelector('#opacity-rgba-copy');
  const opacityHex8Copy = container.querySelector('#opacity-hex8-copy');
  const opacityCssCopy = container.querySelector('#opacity-css-copy');

  const twSearch = container.querySelector('#tw-search');
  const twContainer = container.querySelector('#tw-container');
  const twSection = container.querySelector('.color-card[data-tool="tailwind"]');
  const twToggle = container.querySelector('#tw-toggle');

  // 2. Helper Functions
  function setError(el, message) {
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  function updateHexToRgb() {
    if (!hexInput) return;
    const value = hexInput.value.trim();
    if (!value) {
      setError(hexError, '');
      hexRgbValue.textContent = 'rgb(0, 0, 0)';
      hexRgbaValue.textContent = 'rgba(0, 0, 0, 1)';
      hexRgbaRow.style.display = 'none';
      if (hexPreview) hexPreview.style.background = 'transparent';
      return;
    }

    const rgba = hexToRgba(value);
    if (!rgba) {
      setError(hexError, 'Invalid hex format');
      hexInput.classList.add('input-invalid');
      if (hexPreview) hexPreview.style.background = 'transparent';
      return;
    }

    hexInput.classList.remove('input-invalid');
    setError(hexError, '');
    hexRgbValue.textContent = rgbString(rgba);

    const rgbaText = rgbaString(rgba);
    if (rgba.a < 1) {
      hexRgbaRow.style.display = 'flex';
      hexRgbaValue.textContent = rgbaText;
    } else {
      hexRgbaRow.style.display = 'none';
      hexRgbaValue.textContent = rgbaText;
    }
    if (hexPreview) hexPreview.style.background = rgbaText;
  }

  function syncRgbInputs(sourceKey, value) {
    const clamped = clampNumber(value, 0, 255);
    if (rgbInputs[sourceKey]) rgbInputs[sourceKey].value = clamped;
    if (rgbRanges[sourceKey]) rgbRanges[sourceKey].value = clamped;
  }

  function updateRgbToHex() {
    if (!rgbInputs.r) return;
    const r = clampNumber(rgbInputs.r.value || 0, 0, 255);
    const g = clampNumber(rgbInputs.g.value || 0, 0, 255);
    const b = clampNumber(rgbInputs.b.value || 0, 0, 255);
    syncRgbInputs('r', r);
    syncRgbInputs('g', g);
    syncRgbInputs('b', b);
    const hex = rgbaToHex({ r, g, b });
    if (rgbHexValue) rgbHexValue.textContent = hex;
    if (rgbPreview) rgbPreview.style.background = rgbString({ r, g, b });

    if (rgbSyncInput) {
      rgbSyncInput.value = hex;
      const swatch = container.querySelector('#rgb-swatch-display');
      if (swatch) swatch.style.backgroundColor = hex;
      const picker = container.querySelector('#rgb-native-picker');
      if (picker) picker.value = hex;
    }
  }

  function updateHslToHex() {
    if (!hslInputs.h) return;
    const h = clampNumber(hslInputs.h.value || 0, 0, 360);
    const s = clampNumber(hslInputs.s.value || 0, 0, 100);
    const l = clampNumber(hslInputs.l.value || 0, 0, 100);
    hslInputs.h.value = h;
    hslInputs.s.value = s;
    hslInputs.l.value = l;
    const rgb = hslToRgb(h, s, l);
    const hex = rgbaToHex(rgb);
    if (hslHexValue) hslHexValue.textContent = hex;
    if (hslPreview) hslPreview.style.background = hex;

    if (hslSyncInput) {
      hslSyncInput.value = hex;
      const swatch = container.querySelector('#hsl-swatch-display');
      if (swatch) swatch.style.backgroundColor = hex;
      const picker = container.querySelector('#hsl-native-picker');
      if (picker) picker.value = hex;
    }
  }

  function updateOpacity() {
    if (!opacityBase) return;
    const baseValue = opacityBase.value.trim();
    if (!baseValue) {
      opacityBase.classList.remove('input-invalid');
      setError(opacityError, '');
      opacitySwatch.style.background = 'transparent';
      opacityRgba.textContent = 'rgba(0, 0, 0, 1)';
      opacityHex8.textContent = '#000000ff';
      opacityCss.textContent = '--color-primary: rgba(0, 0, 0, 1);';
      return;
    }
    const rgba = parseColor(baseValue);
    if (!rgba) {
      opacityBase.classList.add('input-invalid');
      setError(opacityError, 'Invalid color input');
      if (opacitySwatch) opacitySwatch.style.background = 'transparent';
      return;
    }

    opacityBase.classList.remove('input-invalid');
    setError(opacityError, '');

    const opacity = clampNumber(opacityValue.value || opacityRange.value || 100, 0, 100);
    opacityValue.value = opacity;
    opacityRange.value = opacity;

    const alpha = Math.round((opacity / 100) * 1000) / 1000;
    const value = { ...rgba, a: alpha };
    const rgbaText = rgbaString(value);
    if (opacityRgba) opacityRgba.textContent = rgbaText;
    if (opacityHex8) opacityHex8.textContent = rgbaToHex(value);
    if (opacityCss) opacityCss.textContent = `--color-primary: ${rgbaText};`;
    if (opacitySwatch) opacitySwatch.style.background = rgbaText;

    const opacityPicker = container.querySelector('#opacity-native-picker');
    const opacitySwatchDisp = container.querySelector('#opacity-swatch-display');
    if (opacityPicker) {
      const hex = rgbaToHex(rgba).slice(0, 7);
      opacityPicker.value = hex;
      if (opacitySwatchDisp) opacitySwatchDisp.style.backgroundColor = hex;
    }
  }

  function renderTailwind() {
    if (!twContainer) return;
    const query = (twSearch?.value || '').trim().toLowerCase();
    const filtered = TAILWIND_ORDER.filter(name => name.includes(query));

    twContainer.innerHTML = filtered.map(name => {
      const palette = TAILWIND_COLORS[name];
      const swatches = Object.entries(palette).map(([shade, hex]) => {
        const rgba = hexToRgba(hex);
        const rgbText = rgba ? rgbString(rgba) : '';
        return `
          <button type="button" class="tw-swatch" data-color="${name}" data-shade="${shade}" data-hex="${hex}">
            <span class="tw-chip" style="background:${hex}"></span>
            <span class="tw-meta">${shade}</span>
            <span class="tw-hex">${hex}</span>
            <span class="tw-rgb">${rgbText}</span>
          </button>
        `;
      }).join('');

      return `
        <div class="tw-section" data-name="${name}">
          <div class="tw-title">${name}</div>
          <div class="tw-grid">${swatches}</div>
        </div>
      `;
    }).join('');
  }

  // 3. EyeDropper & Advanced Color Input Logic
  const colorWrappers = container.querySelectorAll('.color-input-wrapper');
  colorWrappers.forEach(wrapper => {
    const textInput = wrapper.querySelector('input[type="text"]');
    const nativePicker = wrapper.querySelector('input[type="color"]');
    const swatchDisplay = wrapper.querySelector('.swatch-color');
    const eyedropperBtn = wrapper.querySelector('.eyedropper-btn');

    if (!textInput || !nativePicker) return;

    // Trigger internal input event to notify tool-specific logic
    const triggerInputEvent = () => {
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // Text Input -> Picker & Swatch
    textInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const rgba = parseColor(val);
      if (rgba) {
        const hex = rgbaToHex(rgba).slice(0, 7);
        nativePicker.value = hex;
        if (swatchDisplay) swatchDisplay.style.backgroundColor = val;
      } else {
        if (swatchDisplay) swatchDisplay.style.backgroundColor = 'transparent';
      }
    });

    // Native Picker -> Text Input & Swatch
    nativePicker.addEventListener('input', (e) => {
      textInput.value = e.target.value;
      if (swatchDisplay) swatchDisplay.style.backgroundColor = e.target.value;
      triggerInputEvent();
    });

    // EyeDropper API logic
    const pickColor = async () => {
      if (!window.EyeDropper) return;
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          textInput.value = result.sRGBHex;
          nativePicker.value = result.sRGBHex;
          if (swatchDisplay) swatchDisplay.style.backgroundColor = result.sRGBHex;
          triggerInputEvent();
        }
      } catch (err) { console.log('EyeDropper closed/error'); }
    };

    // Intercept Picker Click for EyeDropper
    // MUST BE SYNCHRONOUS to call preventDefault correctly
    nativePicker.addEventListener('click', (e) => {
      if (window.EyeDropper) {
        e.preventDefault();
        e.stopPropagation();
        pickColor();
      }
      // In Firefox, EyeDropper is not avail, so default dialog opens (and closes popup)
    });

    // EyeDropper Button
    if (eyedropperBtn) {
      if (window.EyeDropper) {
        eyedropperBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          pickColor();
        });
      } else {
        eyedropperBtn.style.display = 'none';
      }
    }

    // Initial Sync (without triggering events)
    if (textInput.value) {
      const rgba = parseColor(textInput.value);
      if (rgba) {
        const hex = rgbaToHex(rgba).slice(0, 7);
        nativePicker.value = hex;
        if (swatchDisplay) swatchDisplay.style.backgroundColor = textInput.value;
      }
    }
  });

  // 4. Connect Specific Tools
  if (rgbSyncInput) {
    rgbSyncInput.addEventListener('input', () => {
      const rgba = hexToRgba(rgbSyncInput.value);
      if (rgba) {
        if (rgbInputs.r) rgbInputs.r.value = rgba.r;
        if (rgbInputs.g) rgbInputs.g.value = rgba.g;
        if (rgbInputs.b) rgbInputs.b.value = rgba.b;
        if (rgbRanges.r) rgbRanges.r.value = rgba.r;
        if (rgbRanges.g) rgbRanges.g.value = rgba.g;
        if (rgbRanges.b) rgbRanges.b.value = rgba.b;
        updateRgbToHex();
      }
    });
  }

  if (hslSyncInput) {
    hslSyncInput.addEventListener('input', () => {
      const rgba = hexToRgba(hslSyncInput.value);
      if (rgba) {
        const r = rgba.r / 255, g = rgba.g / 255, b = rgba.b / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        if (hslInputs.h) hslInputs.h.value = Math.round(h * 360);
        if (hslInputs.s) hslInputs.s.value = Math.round(s * 100);
        if (hslInputs.l) hslInputs.l.value = Math.round(l * 100);
        updateHslToHex();
      }
    });
  }

  // 5. Global Listeners for Sub-Tools
  if (hexInput) hexInput.addEventListener('input', updateHexToRgb);
  if (hexRgbCopy) hexRgbCopy.addEventListener('click', () => window.copyToClipboard(hexRgbValue.textContent, 'RGB copied'));
  if (hexRgbaCopy) hexRgbaCopy.addEventListener('click', () => window.copyToClipboard(hexRgbaValue.textContent, 'RGBA copied'));

  // New Copy Field Buttons
  const hexInputCopy = container.querySelector('#hex-input-copy');
  if (hexInputCopy) hexInputCopy.addEventListener('click', () => window.copyToClipboard(hexInput.value, 'HEX copied'));

  const rgbSyncCopy = container.querySelector('#rgb-sync-copy');
  if (rgbSyncCopy) rgbSyncCopy.addEventListener('click', () => window.copyToClipboard(rgbSyncInput.value, 'HEX copied'));

  const hslSyncCopy = container.querySelector('#hsl-sync-copy');
  if (hslSyncCopy) hslSyncCopy.addEventListener('click', () => window.copyToClipboard(hslSyncInput.value, 'HEX copied'));

  const opacityBaseCopy = container.querySelector('#opacity-base-copy');
  if (opacityBaseCopy) opacityBaseCopy.addEventListener('click', () => window.copyToClipboard(opacityBase.value, 'Color copied'));

  Object.keys(rgbInputs).forEach((key) => {
    if (rgbInputs[key]) {
      rgbInputs[key].addEventListener('input', (e) => { syncRgbInputs(key, e.target.value); updateRgbToHex(); });
    }
    if (rgbRanges[key]) {
      rgbRanges[key].addEventListener('input', (e) => { syncRgbInputs(key, e.target.value); updateRgbToHex(); });
    }
  });

  if (hslInputs.h) {
    hslInputs.h.addEventListener('input', updateHslToHex);
    hslInputs.s.addEventListener('input', updateHslToHex);
    hslInputs.l.addEventListener('input', updateHslToHex);
  }

  if (hslHexCopy) hslHexCopy.addEventListener('click', () => window.copyToClipboard(hslHexValue.textContent, 'HEX copied'));
  if (rgbHexCopy) rgbHexCopy.addEventListener('click', () => window.copyToClipboard(rgbHexValue.textContent, 'HEX copied'));

  if (opacityBase) {
    opacityBase.addEventListener('input', updateOpacity);
    opacityValue.addEventListener('input', updateOpacity);
    opacityRange.addEventListener('input', updateOpacity);
  }

  if (opacityRgbaCopy) opacityRgbaCopy.addEventListener('click', () => window.copyToClipboard(opacityRgba.textContent, 'RGBA copied'));
  if (opacityHex8Copy) opacityHex8Copy.addEventListener('click', () => window.copyToClipboard(opacityHex8.textContent, 'HEX8 copied'));
  if (opacityCssCopy) opacityCssCopy.addEventListener('click', () => window.copyToClipboard(opacityCss.textContent, 'CSS variable copied'));

  if (twSearch) twSearch.addEventListener('input', renderTailwind);
  if (twToggle && twSection) {
    twToggle.addEventListener('click', () => {
      const collapsed = twSection.classList.toggle('is-collapsed');
      twToggle.textContent = collapsed ? 'Expand' : 'Collapse';
    });
  }

  if (twContainer) {
    twContainer.addEventListener('click', (event) => {
      const btn = event.target.closest('.tw-swatch');
      if (!btn) return;
      const hex = btn.dataset.hex;
      const color = btn.dataset.color;
      const shade = btn.dataset.shade;
      if (!hex || !color || !shade) return;
      window.copyToClipboard(`${hex} bg-${color}-${shade}`, 'HEX + class copied');
    });
  }

  // Final Initial Updates
  updateHexToRgb();
  updateRgbToHex();
  updateHslToHex();
  updateOpacity();
  renderTailwind();
}
