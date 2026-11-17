// police.js — wanted stars, police cars and foot cops, chase, ram, arrest.
import { makeCar, drawCar } from './vehicles.js';
import { hurtPlayer } from './player.js';
import { WORLD } from './city.js';

export function addWanted(G, n, reason) {
  G.wanted = Math.min(5, G.wanted + n);
  G.wantedTimer = 0;
  if (reason) G.floaters.push({ x: G.player.x, y: G.player.y - 30, text: reason, life: 1.2, color: '#ff5555' });
}

export function updateWanted(G, dt) {
  if (G.wanted === 0) return;
  G.wantedTimer += dt;
  // Decay when hidden: no crime for 18s and no cop nearby.
  const copNear = G.cops.some(c => Math.hypot(c.x - G.player.x, c.y - G.player.y) < 420);
  if (G.wantedTimer > 18 && !copNear) {
    G.wanted -= 1;
    G.wantedTimer = 0;
    G.floaters.push({ x: G.player.x, y: G.player.y - 30, text: 'HEAT DYING DOWN −1★', life: 1, color: '#7ee787' });
  }
}

export function updatePolice(G, dt) {
  const p = G.player;
  const px = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
  const py = p.onFoot ? p.y : (p.car ? p.car.y : p.y);
  const want = Math.min(G.wanted, 5);
  const targetCops = want === 0 ? 0 : want + 1;
  // Spawn cops off-screen near the player.
  if (G.cops.length < targetCops && Math.random() < dt * 2) {
    const a = Math.random() * Math.PI * 2;
    const sx = Math.max(60, Math.min(WORLD - 60, px + Math.cos(a) * 700));
    const sy = Math.max(60, Math.min(WORLD - 60, py + Math.sin(a) * 700));
    const inCar = !p.onFoot || G.wanted >= 2;
    if (inCar) {
      const car = makeCar(sx, sy, Math.atan2(py - sy, px - sx), 0, { police: true, color: '#f8f9fa' });
      car.speed = 200;
      G.cops.push({ car, onFoot: false, x: sx, y: sy, health: 100, stagger: 0, arrestTimer: 0, ramTimer: 0 });
      G.cars.push(car);
    } else {
      G.cops.push({ car: null, onFoot: true, x: sx, y: sy, health: 100, stagger: 0, arrestTimer: 0, ramTimer: 0, angle: 0 });
    }
    if (G.cops.length === 1) G.audio.sirenStart();
  }
  // Despawn when wanted is 0.
  if (want === 0) {
    for (const cop of G.cops) {
      if (cop.car) { const i = G.cars.indexOf(cop.car); if (i >= 0) G.cars.splice(i, 1); }
    }
    G.cops.length = 0;
    G.audio.sirenStop();
    return;
  }
  for (let i = G.cops.length - 1; i >= 0; i--) {
    const cop = G.cops[i];
    if (cop.health <= 0) {
      if (cop.car) { const ci = G.cars.indexOf(cop.car); if (ci >= 0) G.cars.splice(ci, 1); }
      G.cops.splice(i, 1);
      G.money += 50;
      G.floaters.push({ x: cop.x, y: cop.y - 20, text: 'COP DOWN +$50', life: 1, color: '#ffd166' });
      continue;
    }
    if (cop.stagger > 0) { cop.stagger -= dt; continue; }
    if (cop.car) {
      const car = cop.car;
      const d = Math.hypot(px - car.x, py - car.y);
      const wantAngle = Math.atan2(py - car.y, px - car.x);
      let da = wantAngle - car.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      car.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, da));
      car.speed = Math.min(620, car.speed + 300 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      cop.x = car.x; cop.y = car.y;
      // Ram the player's car or run the player down (damage on a cooldown, not per frame).
      if (cop.ramTimer > 0) cop.ramTimer -= dt;
      if (p.car && d < 48 && cop.ramTimer <= 0) {
        cop.ramTimer = 1.0;
        p.car.speed *= 0.55;
        p.car.health -= 4;
        car.speed *= 0.7;
        G.audio.crash();
        G.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ffaa00', size: 9 });
      } else if (p.onFoot && d < 30) {
        hurtPlayer(G, 12, 'wasted');
      }
      if (d > 1600) { // lost the trail far away: recycle
        const ci = G.cars.indexOf(car); if (ci >= 0) G.cars.splice(ci, 1);
        G.cops.splice(i, 1);
      }
    } else {
      // Foot cop chases on foot.
      const d = Math.hypot(px - cop.x, py - cop.y);
      cop.angle = Math.atan2(py - cop.y, px - cop.x);
      const spd = 235;
      cop.x += Math.cos(cop.angle) * spd * dt;
      cop.y += Math.sin(cop.angle) * spd * dt;
      if (p.onFoot && d < 34) {
        cop.arrestTimer += dt;
        if (cop.arrestTimer > 1.2) {
          G.mode = 'busted';
          G.audio.gameOver();
        }
      } else cop.arrestTimer = 0;
      if (d > 1200) G.cops.splice(i, 1);
    }
  }
}

export function drawPolice(ctx, G, t) {
  for (const cop of G.cops) {
    if (cop.car) { drawCar(ctx, cop.car, t); continue; }
    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 6, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d3557';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#457b9d';
    ctx.fillRect(-10, -10, 20, 4);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('POLICE', -18, -16);
    ctx.restore();
  }
}
