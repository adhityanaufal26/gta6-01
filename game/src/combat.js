// combat.js — pistol shooting, bullets, health pickups, ammo.
import { addWanted } from './police.js';

export function createCombatState() {
  return { bullets: [], pickups: [], shootCooldown: 0 };
}

export function spawnPickups(G) {
  const spots = [
    [460, 460], [1240, 820], [2040, 460], [2440, 1640], [840, 2040],
    [1640, 2440], [2440, 2840], [460, 2840], [2820, 1600], [1240, 2840],
  ];
  spots.forEach(([x, y], i) => {
    G.combat.pickups.push({ x, y, kind: i % 3 === 0 ? 'ammo' : 'health', taken: false });
  });
}

export function shoot(G, tx, ty) {
  const p = G.player;
  if (G.weapon !== 'pistol' || G.ammo <= 0 || G.combat.shootCooldown > 0) return;
  G.combat.shootCooldown = 0.28;
  G.ammo -= 1;
  G.audio.gunshot();
  const ox = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
  const oy = p.onFoot ? p.y : (p.car ? p.car.y : p.y);
  const a = Math.atan2(ty - oy, tx - ox);
  G.combat.bullets.push({ x: ox + Math.cos(a) * 24, y: oy + Math.sin(a) * 24, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.7 });
  G.particles.push({ x: ox + Math.cos(a) * 30, y: oy + Math.sin(a) * 30, vx: 0, vy: 0, life: 0.12, max: 0.12, color: '#ffe066', size: 12 });
  addWanted(G, 1, 'SHOTS FIRED +1★');
}

export function updateCombat(G, dt) {
  const c = G.combat;
  if (c.shootCooldown > 0) c.shootCooldown -= dt;
  const p = G.player;
  const px = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
  const py = p.onFoot ? p.y : (p.car ? p.car.y : p.y);
  for (let i = c.bullets.length - 1; i >= 0; i--) {
    const b = c.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    // Hit peds.
    for (const ped of G.peds) {
      if (ped.health > 0 && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
        ped.health -= 50; ped.flee = 3; dead = true;
        G.floaters.push({ x: ped.x, y: ped.y - 20, text: 'HIT', life: 0.6, color: '#ffdd00' });
      }
    }
    // Hit cops.
    for (const cop of G.cops) {
      if (Math.hypot(cop.x - b.x, cop.y - b.y) < (cop.car ? 26 : 16)) {
        cop.health -= 40; cop.stagger = 0.4; dead = true;
        G.audio.hit();
      }
    }
    // Hit traffic / parked cars.
    for (const car of G.cars) {
      if (car === p.car) continue;
      if (Math.hypot(car.x - b.x, car.y - b.y) < 26) {
        car.health -= 25; dead = true;
        G.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ffaa00', size: 8 });
      }
    }
    if (dead) c.bullets.splice(i, 1);
  }
  // Pickups.
  for (const pk of c.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(pk.x - px, pk.y - py) < 36) {
      pk.taken = true;
      if (pk.kind === 'health') {
        p.health = Math.min(100, p.health + 40);
        G.floaters.push({ x: pk.x, y: pk.y - 20, text: 'HEALTH +40', life: 1, color: '#7ee787' });
      } else {
        G.ammo += 24;
        G.floaters.push({ x: pk.x, y: pk.y - 20, text: 'AMMO +24', life: 1, color: '#ffd166' });
      }
      G.audio.chime();
    }
  }
}

export function drawCombat(ctx, G, t) {
  for (const b of G.combat.bullets) {
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const pk of G.combat.pickups) {
    if (pk.taken) continue;
    const bob = Math.sin(t / 300 + pk.x) * 3;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    if (pk.kind === 'health') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    } else {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('AMMO', 0, 3);
    }
    ctx.restore();
  }
}
