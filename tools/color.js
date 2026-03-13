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

const CLIPBOARD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

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
              <input type="text" id="hex-input" placeholder="#67e8f9">
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
              <input type="text" id="opacity-base" placeholder="#0ea5e9 or rgb(14,165,233)">
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
  const hexInput = container.querySelector('#hex-input');
  const hexError = container.querySelector('#hex-error');
  const hexRgbValue = container.querySelector('#hex-rgb-value');
  const hexRgbaRow = container.querySelector('#hex-rgba-row');
  const hexRgbaValue = container.querySelector('#hex-rgba-value');
  const hexRgbCopy = container.querySelector('#hex-rgb-copy');
  const hexRgbaCopy = container.querySelector('#hex-rgba-copy');
  const hexPreview = container.querySelector('#hex-preview');

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
    rgbInputs[sourceKey].value = clamped;
    rgbRanges[sourceKey].value = clamped;
  }

  function updateRgbToHex() {
    const r = clampNumber(rgbInputs.r.value || 0, 0, 255);
    const g = clampNumber(rgbInputs.g.value || 0, 0, 255);
    const b = clampNumber(rgbInputs.b.value || 0, 0, 255);
    syncRgbInputs('r', r);
    syncRgbInputs('g', g);
    syncRgbInputs('b', b);
    const hex = rgbaToHex({ r, g, b });
    rgbHexValue.textContent = hex;
    if (rgbPreview) rgbPreview.style.background = rgbString({ r, g, b });
  }

  function updateHslToHex() {
    const h = clampNumber(hslInputs.h.value || 0, 0, 360);
    const s = clampNumber(hslInputs.s.value || 0, 0, 100);
    const l = clampNumber(hslInputs.l.value || 0, 0, 100);
    hslInputs.h.value = h;
    hslInputs.s.value = s;
    hslInputs.l.value = l;
    const rgb = hslToRgb(h, s, l);
    const hex = rgbaToHex(rgb);
    hslHexValue.textContent = hex;
    if (hslPreview) hslPreview.style.background = hex;
  }

  function updateOpacity() {
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
      opacitySwatch.style.background = 'transparent';
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
    opacityRgba.textContent = rgbaText;
    opacityHex8.textContent = rgbaToHex(value);
    opacityCss.textContent = `--color-primary: ${rgbaText};`;
    opacitySwatch.style.background = rgbaText;
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
          <button class="tw-swatch" data-color="${name}" data-shade="${shade}" data-hex="${hex}">
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

  hexInput.addEventListener('input', updateHexToRgb);
  updateHexToRgb();

  hexRgbCopy.addEventListener('click', () => window.copyToClipboard(hexRgbValue.textContent, 'RGB copied'));
  hexRgbaCopy.addEventListener('click', () => window.copyToClipboard(hexRgbaValue.textContent, 'RGBA copied'));

  Object.keys(rgbInputs).forEach((key) => {
    rgbInputs[key].addEventListener('input', (e) => {
      syncRgbInputs(key, e.target.value);
      updateRgbToHex();
    });
    rgbRanges[key].addEventListener('input', (e) => {
      syncRgbInputs(key, e.target.value);
      updateRgbToHex();
    });
  });
  updateRgbToHex();

  hslInputs.h.addEventListener('input', updateHslToHex);
  hslInputs.s.addEventListener('input', updateHslToHex);
  hslInputs.l.addEventListener('input', updateHslToHex);
  updateHslToHex();

  hslHexCopy.addEventListener('click', () => window.copyToClipboard(hslHexValue.textContent, 'HEX copied'));
  rgbHexCopy.addEventListener('click', () => window.copyToClipboard(rgbHexValue.textContent, 'HEX copied'));

  opacityBase.addEventListener('input', updateOpacity);
  opacityValue.addEventListener('input', updateOpacity);
  opacityRange.addEventListener('input', updateOpacity);
  updateOpacity();

  opacityRgbaCopy.addEventListener('click', () => window.copyToClipboard(opacityRgba.textContent, 'RGBA copied'));
  opacityHex8Copy.addEventListener('click', () => window.copyToClipboard(opacityHex8.textContent, 'HEX8 copied'));
  opacityCssCopy.addEventListener('click', () => window.copyToClipboard(opacityCss.textContent, 'CSS variable copied'));

  if (twSearch) {
    twSearch.addEventListener('input', renderTailwind);
  }

  if (twToggle && twSection) {
    twToggle.addEventListener('click', () => {
      const collapsed = twSection.classList.toggle('is-collapsed');
      twToggle.textContent = collapsed ? 'Expand' : 'Collapse';
    });
  }

  twContainer.addEventListener('click', (event) => {
    const btn = event.target.closest('.tw-swatch');
    if (!btn) return;
    const hex = btn.dataset.hex;
    const color = btn.dataset.color;
    const shade = btn.dataset.shade;
    if (!hex || !color || !shade) return;
    const className = `bg-${color}-${shade}`;
    window.copyToClipboard(`${hex} ${className}`, 'HEX + class copied');
  });

  renderTailwind();
}
