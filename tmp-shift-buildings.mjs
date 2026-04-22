import fs from 'fs';

const filePath = 'apps/game/src/levels/huddinge.map.ts';
const content = fs.readFileSync(filePath, 'utf-8');

const mod = await import('./apps/game/src/levels/huddinge.map.ts');
const level = mod.default;
const coords = level.course.coordinates;

// Course coordinates are [lon, lat, alt]
const startLat = coords[0][1], startLon = coords[0][0];
const nextLat = coords[1][1], nextLon = coords[1][0];
console.log('Start:', startLat, startLon);
console.log('Next:', nextLat, nextLon);

// Direction of travel
const dLat = nextLat - startLat;
const dLon = nextLon - startLon;
const mag = Math.sqrt(dLat * dLat + dLon * dLon);
const uLat = dLat / mag;
const uLon = dLon / mag;
console.log('Travel direction (unit): dLat=' + uLat.toFixed(6) + ' dLon=' + uLon.toFixed(6));

const mPerDegLat = 111320;
const mPerDegLon = 111320 * Math.cos(startLat * Math.PI / 180);

// Shift 50m opposite to travel direction ("back" from start line)
const shiftLat = -uLat * 50 / mPerDegLat;
const shiftLon = -uLon * 50 / mPerDegLon;
console.log('Shift: dLat=' + shiftLat.toFixed(8) + ' dLon=' + shiftLon.toFixed(8));

// Find buildings near start
const buildingIndices = [];
level.buildings.forEach((b, i) => {
  const avgLat = b.points.reduce((s, p) => s + p[0], 0) / b.points.length;
  const avgLon = b.points.reduce((s, p) => s + p[1], 0) / b.points.length;
  const distLat = (avgLat - startLat) * mPerDegLat;
  const distLon = (avgLon - startLon) * mPerDegLon;
  const dist = Math.sqrt(distLat * distLat + distLon * distLon);
  if (dist < 80) {
    buildingIndices.push(i);
    console.log(`Building ${i}: dist=${dist.toFixed(1)}m type=${b.type}`);
  }
});

// Shift those buildings
for (const idx of buildingIndices) {
  const b = level.buildings[idx];
  console.log(`\nShifting building ${idx}:`);
  console.log('  Before first point:', JSON.stringify(b.points[0]));
  b.points = b.points.map(([lat, lon]) => [
    parseFloat((lat + shiftLat).toFixed(7)),
    parseFloat((lon + shiftLon).toFixed(7))
  ]);
  console.log('  After first point:', JSON.stringify(b.points[0]));
}

// Rewrite the file
const buildingsJson = JSON.stringify(level.buildings, null, 4);
const indented = buildingsJson.split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n');
const newContent = content.replace(
  /"buildings": \[[\s\S]*?\n  \]/,
  '"buildings": ' + indented
);
fs.writeFileSync(filePath, newContent);
console.log('\nDone! File rewritten.');
