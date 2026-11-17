// pedestrians.js — sidewalk walkers who stroll, flee, and can be taxi fares.
import { isSea, WORLD } from './city.js';

const SHIRTS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#9b5de5', '#f15bb5', '#00bbf9'];
const SKINS = ['#f2c89b', '#c68e5e', '#8d5524', '#ffdbac'];

export function spawnPedestrians(G, n = 26) {
  for (let i = 0; i < n; i++) {
    G.peds.push(makePed(G));
  }
}

export function makePed(G) {
  // Spawn on a sidewalk near a road.
  const rx = (1 + Math.floor(Math.random() * 7)) * 400;
  const ry = (1 + Math.floor(Math.random() * 7)) * 400;
  const side = Math.random() > 0.5;
  return {
    x: side ? rx + 74 : rx + (Math.random() * 600 - 300),
    y: side ? ry + (Math.random() * 600 - 300) : ry + 74,
    angle: Math.random() * Math.PI * 2,
    speed: 40 + Math.random() * 30,
    shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
    skin: SKINS[Math.floor(Math.random() * SKINS.length)],
    health: 100, flee: 0, wait: Math.random() * 2,
    fare: false, bob: Math.random() * 10,
  };
}

export function updatePedestrians(G, dt) {
  const p = G.player;
  const px = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
  const py = p.onFoot ? p.y : (p.car ? p.car.y : p.y);
  for (const ped of G.peds) {
    if (ped.health <= 0) continue;
    const dPlayer = Math.hypot(ped.x - px, ped.y - py);
    if (ped.flee > 0) {
      ped.flee -= dt;
      ped.angle = Math.atan2(ped.y - py, ped.x - px);
      ped.speed = 150;
    } else if (dPlayer < 90 && !p.onFoot && p.car && Math.abs(p.car.speed) > 60) {
      ped.flee = 2.5; // car speeding at them
    } else {
      ped.speed = 55;
      ped.wait -= dt;
      if (ped.wait <= 0) {
        ped.wait = 1 + Math.random() * 3;
        // Wander along sidewalks: snap heading to a road axis.
        ped.angle = (Math.floor(Math.random() * 4) * Math.PI) / 2;
      }
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    ped.x = Math.max(20, Math.min(WORLD - 20, ped.x));
    ped.y = Math.max(20, Math.min(WORLD - 20, ped.y));
    if (isSea(ped.x, ped.y)) ped.x = 2940;
    // Run over by the player's car.
    if (!p.onFoot && p.car && Math.abs(p.car.speed) > 80 && Math.hypot(ped.x - p.car.x, ped.y - p.car.y) < 34) {
      ped.health = 0;
      G.wanted = Math.min(5, G.wanted + 1);
      G.wantedTimer = 0;
      G.money = Math.max(0, G.money - 20);
      G.floaters.push({ x: ped.x, y: ped.y - 24, text: 'HIT PEDESTRIAN +1★', life: 1.2, color: '#ff5555' });
      G.audio.crash();
      G.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -40, life: 0.5, max: 0.5, color: '#ff4444', size: 9 });
    }
    // Punch knockback handled in player.js; dead peds respawn.
    if (ped.health <= 0) {
      const fresh = makePed(G);
      Object.assign(ped, fresh);
    }
  }
}

export function drawPedestrians(ctx, G, t) {
  for (const ped of G.peds) {
    if (ped.health <= 0) continue;
    const bob = Math.sin(t / 120 + ped.bob) * 1.5;
    ctx.save();
    ctx.translate(ped.x, ped.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 5, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath(); ctx.arc(0, -2, 5.5, 0, Math.PI * 2); ctx.fill();
    if (ped.fare) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 16px system-ui';
      ctx.fillText('$', -4, -16);
    }
    ctx.restore();
  }
}
