const fs = require('fs');
const txt = fs.readFileSync('apps/game/src/levels/judarskogen.map.ts', 'utf-8');
const waterMatch = txt.match(/"water":\s*(\[[\s\S]*\])\s*\};/);
if (!waterMatch) { console.log('No water match'); process.exit(1); }
const water = JSON.parse(waterMatch[1]);
console.log('Water features:', water.length);
let totalCoords = 0;
let maxCoords = 0;
for (const w of water) { totalCoords += w.coords.length; maxCoords = Math.max(maxCoords, w.coords.length); }
console.log('Total coords:', totalCoords);
console.log('Max coords in single feature:', maxCoords);
console.log('Avg coords per feature:', (totalCoords / water.length).toFixed(1));
