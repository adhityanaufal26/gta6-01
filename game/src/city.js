// city.js — Solara Bay: procedural coastal city grid, buildings, beach, palms.
// World is 3200x3200. Roads every 400px, road width 120. East edge is the sea.
export const WORLD = 3200;
export const ROAD_STEP = 400;
export const ROAD_W = 120;

const PALETTE = [
  '#ff9d5c', '#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b',
  '#e07a5f', '#81b29a', '#f2cc8f', '#e63946', '#2a9d8f', '#f4a261',
];

function mulberry(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCity() {
  const rand = mulberry(20261117);
  const buildings = [];
  const palms = [];
  const ramps = [];
  // Buildings fill each block between roads (blocks run 60..340 inside each 400 cell).
  for (let bx = 0; bx < 7; bx++) {
    for (let by = 0; by < 8; by++) {
      const x0 = bx * ROAD_STEP + 90, y0 = by * ROAD_STEP + 90;
      const w = 220, h = 220;
      // Beach strip: last column is sand, no buildings.
      if (bx === 6) continue;
      const n = 1 + Math.floor(rand() * 2);
      if (n === 1) {
        buildings.push({ x: x0, y: y0, w, h, color: PALETTE[Math.floor(rand() * PALETTE.length)], hgt: 20 + rand() * 60, roof: rand() > 0.5 });
      } else {
        buildings.push({ x: x0, y: y0, w: 100, h, color: PALETTE[Math.floor(rand() * PALETTE.length)], hgt: 20 + rand() * 50, roof: true });
        buildings.push({ x: x0 + 120, y: y0, w: 100, h, color: PALETTE[Math.floor(rand() * PALETTE.length)], hgt: 20 + rand() * 50, roof: false });
      }
    }
  }
  // Palm rows along the beach boardwalk (x ~ 2860) and a few park clusters.
  for (let y = 120; y < WORLD - 100; y += 130) palms.push({ x: 2870 + rand() * 40, y, s: 0.9 + rand() * 0.4 });
  for (let i = 0; i < 26; i++) palms.push({ x: 200 + rand() * 2400, y: 200 + rand() * 2800, s: 0.8 + rand() * 0.5 });
  // Stunt ramps on straight road stretches.
  ramps.push({ x: 1400, y: 400, angle: 0 });
  ramps.push({ x: 2000, y: 2000, angle: Math.PI / 2 });
  ramps.push({ x: 800, y: 2400, angle: 0 });
  return { buildings, palms, ramps };
}

export function isRoad(x, y) {
  if (x < 0 || y < 0 || x > WORLD || y > WORLD) return false;
  const rx = x % ROAD_STEP, ry = y % ROAD_STEP;
  return rx < ROAD_W / 2 || rx > ROAD_STEP - ROAD_W / 2 || ry < ROAD_W / 2 || ry > ROAD_STEP - ROAD_W / 2;
}

export function isSea(x, y) {
  return x > 2960;
}

export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) {
      const d = Math.hypot(dx, dy) || 1;
      return { x: cx + (dx / d) * r, y: cy + (dy / d) * r, hit: true };
    }
  }
  return { x, y, hit: false };
}

export function nearestRoadPoint(x, y) {
  const rx = Math.round(x / ROAD_STEP) * ROAD_STEP;
  const ry = Math.round(y / ROAD_STEP) * ROAD_STEP;
  return Math.abs(x - rx) < Math.abs(y - ry) ? { x: rx, y } : { x, y: ry };
}

export function drawCity(ctx, city, cam, t) {
  const { x: cx, y: cy, w, h } = cam;
  // Ground: sand base.
  ctx.fillStyle = '#f2d8a0';
  ctx.fillRect(cx, cy, w, h);
  // Grass parks in a few blocks.
  ctx.fillStyle = '#8fce6e';
  ctx.fillRect(490, 490, 220, 220);
  ctx.fillRect(1290, 1690, 220, 220);
  ctx.fillRect(2090, 890, 220, 220);
  // Sea on the east edge with animated waves.
  ctx.fillStyle = '#1fb6c9';
  ctx.fillRect(2960, cy, w, h);
  ctx.fillStyle = '#2fd4e6';
  for (let y = Math.floor(cy / 46) * 46; y < cy + h; y += 46) {
    ctx.fillRect(2960, y + Math.sin(t / 500 + y / 60) * 4, 60 + Math.sin(y) * 10, 6);
  }
  ctx.fillStyle = '#f7e8c3';
  ctx.fillRect(2900, cy, 60, h); // beach sand strip
  // Roads.
  ctx.fillStyle = '#3d4450';
  for (let i = 0; i <= 8; i++) {
    ctx.fillRect(i * ROAD_STEP - ROAD_W / 2, cy, ROAD_W, h);
    ctx.fillRect(cx, i * ROAD_STEP - ROAD_W / 2, w, ROAD_W);
  }
  // Lane dashes.
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i <= 8; i++) {
    for (let d = 0; d < WORLD; d += 80) {
      if (d % 160 < 80) continue;
      ctx.fillRect(i * ROAD_STEP - 2, d, 4, 34);
      ctx.fillRect(d, i * ROAD_STEP - 2, 34, 4);
    }
  }
  // Sidewalks.
  ctx.fillStyle = '#cfc4ae';
  for (let i = 0; i <= 8; i++) {
    ctx.fillRect(i * ROAD_STEP - ROAD_W / 2 - 14, cy, 14, h);
    ctx.fillRect(i * ROAD_STEP + ROAD_W / 2, cy, 14, h);
    ctx.fillRect(cx, i * ROAD_STEP - ROAD_W / 2 - 14, w, 14);
    ctx.fillRect(cx, i * ROAD_STEP + ROAD_W / 2, w, 14);
  }
  // Buildings with roof detail and fake shadow.
  for (const b of city.buildings) {
    if (b.x + b.w < cx || b.x > cx + w || b.y + b.h < cy || b.y > cy + h) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x, b.y, b.w, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x + 16, b.y + 16, b.w - 32, b.h - 32);
    // Windows.
    ctx.fillStyle = 'rgba(20,40,60,0.55)';
    for (let wx = b.x + 28; wx < b.x + b.w - 20; wx += 34) {
      for (let wy = b.y + 28; wy < b.y + b.h - 20; wy += 34) ctx.fillRect(wx, wy, 16, 16);
    }
    if (b.roof) {
      ctx.fillStyle = '#2ec4b6';
      ctx.fillRect(b.x + b.w / 2 - 18, b.y + b.h / 2 - 18, 36, 36);
    }
  }
  // Stunt ramps.
  for (const r of city.ramps) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(-40, -16, 80, 32);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-40, -16, 80, 8);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('JUMP', -24, 5);
    ctx.restore();
  }
  // Palms.
  for (const p of city.palms) {
    if (p.x < cx - 40 || p.x > cx + w + 40 || p.y < cy - 40 || p.y > cy + h + 40) continue;
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4, p.y - 18 * p.s); ctx.stroke();
    ctx.fillStyle = '#2fae5f';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.sin(t / 900 + p.y) * 0.1;
      ctx.beginPath();
      ctx.ellipse(p.x + 4 + Math.cos(a) * 14 * p.s, p.y - 18 * p.s + Math.sin(a) * 10 * p.s, 14 * p.s, 5 * p.s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
