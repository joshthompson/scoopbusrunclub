// Simplify judarskogen water: remove small polygons + decimate large ones
const fs = require('fs');
const path = 'apps/game/src/levels/judarskogen.map.ts';
const src = fs.readFileSync(path, 'utf8');

const waterMatch = src.match(/"water":\s*(\[[\s\S]*)\s*\};\s*export/);
if (!waterMatch) { console.log('No water match'); process.exit(1); }
const water = JSON.parse(waterMatch[1]);

const MIN_COORDS = 50;       // drop features with fewer coords than this
const MAX_COORDS = 40;       // decimate features to at most this many coords
const RIVERS_MAX_COORDS = 20; // rivers get even more aggressive decimation

function decimatePolygon(coords, maxPts) {
  if (coords.length <= maxPts) return coords;
  // Keep every Nth point, always keep first and last
  const step = (coords.length - 1) / (maxPts - 1);
  const result = [];
  for (let i = 0; i < maxPts; i++) {
    const idx = Math.round(i * step);
    result.push(coords[Math.min(idx, coords.length - 1)]);
  }
  return result;
}

// Also round coordinates to reduce file size
function roundCoord(c) {
  return [Math.round(c[0] * 10000) / 10000, Math.round(c[1] * 10000) / 10000];
}

const filtered = water
  .filter(w => w.coords.length >= MIN_COORDS)
  .map(w => {
    const max = w.type === 'river' ? RIVERS_MAX_COORDS : MAX_COORDS;
    const decimated = decimatePolygon(w.coords, max);
    return { coords: decimated.map(roundCoord), type: w.type };
  });

const totalCoordsBefore = water.reduce((s, w) => s + w.coords.length, 0);
const totalCoordsAfter = filtered.reduce((s, w) => s + w.coords.length, 0);

console.log('Before:', water.length, 'features,', totalCoordsBefore, 'coords');
console.log('After:', filtered.length, 'features,', totalCoordsAfter, 'coords');
console.log('Reduction:', ((1 - totalCoordsAfter / totalCoordsBefore) * 100).toFixed(1) + '%');

// Replace the water array in the file
const waterJson = JSON.stringify(filtered);
const newSrc = src.replace(/"water":\s*\[[\s\S]*\]\s*\};\s*export/, '"water": ' + waterJson + '\n};\n\nexport');
fs.writeFileSync(path, newSrc);
console.log('Written to', path);
