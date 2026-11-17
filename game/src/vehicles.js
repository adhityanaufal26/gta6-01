// vehicles.js — drivable cars: definitions, driving physics, enter/exit, stealing.
import { collideBuildings, isRoad, isSea, WORLD, nearestRoadPoint } from './city.js';

export const CAR_DEFS = [
  { name: 'Sunrunner', color: '#e63946', top: 240, accel: 420, max: 560, turn: 2.6 },
  { name: 'Bay Taxi', color: '#ffd166', top: 200, accel: 360, max: 480, turn: 2.4 },
  { name: 'Palma GT', color: '#06d6a0', top: 260, accel: 520, max: 640, turn: 3.0 },
  { name: 'Coral Cruiser', color: '#118ab2', top: 220, accel: 380, max: 520, turn: 2.5 },
  { name: 'Sand Buggy', color: '#f78c6b', top: 230, accel: 440, max: 540, turn: 2.9 },
  { name: 'Harbor Van', color: '#8d99ae', top: 180, accel: 300, max: 420, turn: 2.1 },
];

let carSeq = 0;

export function makeCar(x, y, angle, defIndex, opts = {}) {
  const def = CAR_DEFS[defIndex % CAR_DEFS.length];
  return {
    id: ++carSeq, x, y, angle, speed: 0, def, defIndex,
    parked: !!opts.parked, traffic: !!opts.traffic, police: !!opts.police,
    missionCar: !!opts.missionCar, health: 100, color: opts.color || def.color,
    w: 46, h: 22, steerVis: 0, bumpTimer: 0,
  };
}

export function spawnParkedCars(G) {
  // Parked along road lanes, facing down the road so driving away stays on asphalt.
  const spots = [
    [400, 200, -Math.PI / 2], [400, 600, Math.PI / 2], [800, 200, Math.PI / 2], [1200, 600, -Math.PI / 2],
    [1600, 200, Math.PI / 2], [2000, 600, -Math.PI / 2], [2400, 200, Math.PI / 2], [2800, 600, -Math.PI / 2],
    [200, 800, 0], [600, 1200, Math.PI], [200, 1600, 0], [600, 2000, Math.PI],
    [200, 2400, 0], [600, 2800, Math.PI], [2800, 1200, Math.PI], [2800, 2000, 0],
  ];
  spots.forEach(([x, y, a], i) => G.cars.push(makeCar(x, y, a, i, { parked: true })));
}

export function nearestCar(G, x, y, maxDist = 70) {
  let best = null, bd = maxDist;
  for (const c of G.cars) {
    if (c.traffic) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  p.onFoot = false;
  p.car = car;
  car.parked = false;
  car.traffic = false;
  G.audio.door();
  if (car.stolen !== true && !car.owned) {
    car.stolen = true;
    G.wanted = Math.min(5, G.wanted + 1);
    G.wantedTimer = 0;
    G.floaters.push({ x: car.x, y: car.y - 30, text: 'CAR STOLEN +1★', life: 1.2, color: '#ff9944' });
    G.audio.sirenBlip();
  }
  G.floaters.push({ x: car.x, y: car.y - 46, text: car.def.name, life: 1, color: '#fff' });
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  car.speed = 0;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  p.angle = car.angle;
  p.onFoot = true;
  p.car = null;
  G.audio.door();
}

export function updateCar(G, car, dt, keys) {
  const p = G.player;
  const driving = p.car === car;
  let throttle = 0, steer = 0;
  if (driving) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) throttle = 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) throttle = -0.6;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) steer = -1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) steer = 1;
  }
  const def = car.def;
  car.speed += throttle * def.accel * dt;
  car.speed *= Math.pow(0.35, dt); // drag
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-def.max * 0.45, Math.min(def.max, car.speed));
  const turnRate = def.turn * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * turnRate * dt;
  car.steerVis = steer;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Building collision: bounce and slow.
  const c = collideBuildings(G.city, nx, ny, 22);
  if (c.hit) {
    car.speed *= -0.35;
    car.x = c.x; car.y = c.y;
    if (Math.abs(car.speed) > 120) {
      car.health -= 6;
      G.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#ffaa00', size: 10 });
      G.audio.crash();
    }
  } else {
    car.x = nx; car.y = ny;
  }
  car.x = Math.max(24, Math.min(WORLD - 24, car.x));
  car.y = Math.max(24, Math.min(WORLD - 24, car.y));
  if (isSea(car.x, car.y)) { car.x = 2936; car.speed *= 0.5; }
  if (car.health <= 0 && driving) {
    G.floaters.push({ x: car.x, y: car.y - 30, text: 'CAR WRECKED!', life: 1.4, color: '#ff4444' });
    exitCar(G);
    car.health = 0;
  }
  // Stunt ramp boost.
  for (const r of G.city.ramps) {
    if (Math.hypot(car.x - r.x, car.y - r.y) < 44 && Math.abs(car.speed) > 200) {
      car.speed *= 1.12;
      G.floaters.push({ x: car.x, y: car.y - 30, text: 'STUNT! +$25', life: 1, color: '#ffd166' });
      G.money += 25;
      G.audio.chime();
      break;
    }
  }
}

export function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 4, 24, 13, 0, 0, Math.PI * 2); ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -23, -11, 46, 22, 7);
  ctx.fill();
  // Hood + trunk shading.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(12, -9, 9, 18);
  // Windshield + rear window.
  ctx.fillStyle = '#16222e';
  ctx.fillRect(4, -9, 8, 18);
  ctx.fillRect(-14, -9, 6, 18);
  // Roof.
  ctx.fillStyle = car.police ? '#f8f9fa' : shade(car.color, -18);
  roundRect(ctx, -8, -8, 16, 16, 4);
  ctx.fill();
  if (car.police) {
    ctx.fillStyle = '#111';
    ctx.fillRect(-8, -8, 16, 4);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(-4, -12, 8, 4);
    // Light bar flashing.
    const on = Math.floor(t / 180) % 2 === 0;
    ctx.fillStyle = on ? '#ff2222' : '#2266ff';
    ctx.fillRect(-2, -13, 5, 4);
  }
  if (car.missionCar) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Wheels.
  ctx.fillStyle = '#111';
  ctx.fillRect(-16, -13, 10, 4);
  ctx.fillRect(-16, 9, 10, 4);
  ctx.fillRect(8, -13, 10, 4);
  ctx.fillRect(8, 9, 10, 4);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
