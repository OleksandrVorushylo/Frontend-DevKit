// utils/math.js

export function formatNumber(num, decimals = 4) {
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(decimals));
}

// Clamp Math
export function calculateFluidClamp({ min, max, minViewport, maxViewport, useRem, rootFontSize }) {
  const slope = (max - min) / (maxViewport - minViewport);
  const yIntersection = -minViewport * slope + min;
  const slopeVw = slope * 100;

  let minVal, maxVal, intersectionVal;

  if (useRem) {
    minVal = formatNumber(min / rootFontSize) + 'rem';
    maxVal = formatNumber(max / rootFontSize) + 'rem';
    intersectionVal = formatNumber(yIntersection / rootFontSize) + 'rem';
  } else {
    minVal = formatNumber(min) + 'px';
    maxVal = formatNumber(max) + 'px';
    intersectionVal = formatNumber(yIntersection) + 'px';
  }

  const preferred = `${intersectionVal} + ${formatNumber(slopeVw)}vw`;
  return `clamp(${minVal}, calc(${preferred}), ${maxVal})`;
}

export function generateAlternativeClamp({ min, max, maxViewport, useRem, rootFontSize }) {
  // ac(48px, 24px, 640)
  // this is a simplified custom function ac(max, min, viewport)
  // just generate the string ac()
  return `ac(${max}px, ${min}px, ${maxViewport})`;
}

// Percent Math
export const percentMath = {
  // X is what % of Y -> (X / Y) * 100
  percentageOf: (x, y) => (x / y) * 100,

  // What is X% of Y -> (X / 100) * Y
  percentRatio: (x, y) => (x / 100) * y,

  // X is Y% of what -> X / (Y / 100)
  isPercentageOf: (x, y) => x / (y / 100),

  // Increase/Decrease from X to Y -> ((Y - X) / X) * 100
  difference: (x, y) => ((y - x) / x) * 100,

  // Percentage Difference -> (|X - Y| / ((X + Y) / 2)) * 100
  percentageDifference: (x, y) => {
    if (x + y === 0) return 0;
    return (Math.abs(x - y) / ((x + y) / 2)) * 100;
  }
};

// Layout & Spacing
export function calculateVw(px, viewportWidth) {
  if (!viewportWidth) return 0;
  return (px / viewportWidth) * 100;
}

export function calculatePxFromVw(vw, viewportWidth) {
  return (vw / 100) * viewportWidth;
}

// Typography
export function calculateLineHeight(lineHeightPx, fontSizePx) {
  if (!fontSizePx) return 0;
  return lineHeightPx / fontSizePx;
}

export function calculateLetterSpacing(trackingPercent, fontSizePx) {
  return (trackingPercent / 100) * fontSizePx;
}

// Aspect Ratio
export function getGcd(a, b) {
  return b === 0 ? a : getGcd(b, a % b);
}

export function calculateAspectRatio(width, height) {
  if (!width || !height) return { w: 0, h: 0, string: '0:0' };
  const common = getGcd(width, height);
  const w = width / common;
  const h = height / common;
  return { w, h, string: `${w}:${h}` };
}

// Grid
export function calculateColumnWidth(containerWidth, columns, gap) {
  if (columns <= 0) return 0;
  return (containerWidth - (gap * (columns - 1))) / columns;
}
