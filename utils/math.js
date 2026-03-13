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
  difference: (x, y) => ((y - x) / x) * 100
};
