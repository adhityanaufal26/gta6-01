// player.js — Rio Vega on foot: movement, running, punching, health.
import { collideBuildings, isSea, WORLD } from './city.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null,
    health: 100, punchTimer: 0, punchCooldown: 0, hurtTimer: 0,
    runStamina: 100, moving: false,
  };
}

export function updatePlayer(G, dt, keys) {
  const p = G.player;
  if (!p.onFoot) return;
  let dx = 0, dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  const len = Math.hypot(dx, dy);
  p.moving = len > 0;
  if (len > 0) {
    dx /= len; dy /= len;
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const spd = running ? 330 : 215;
    p.x += dx * spd * dt;
    p.y += dy * spd * dt;
    p.angle = Math.atan2(dy, dx);
    p.speed = spd;
  } else p.speed = 0;
  p.x = Math.max(16, Math.min(WORLD - 16, p.x));
  p.y = Math.max(16, Math.min(WORLD - 16, p.y));
  if (isSea(p.x, p.y)) { p.x = 2944; }
  const c = collideBuildings(G.city, p.x, p.y, 14);
  p.x = c.x; p.y = c.y;
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.punchTimer > 0) p.punchTimer -= dt;
  if (p.hurtTimer > 0) p.hurtTimer -= dt;
}

export function playerPunch(G) {
  const p = G.player;
  if (!p.onFoot || p.punchCooldown > 0) return;
  p.punchCooldown = 0.45;
  p.punchTimer = 0.22;
  G.audio.punch();
  const px = p.x + Math.cos(p.angle) * 30, py = p.y + Math.sin(p.angle) * 30;
  G.particles.push({ x: px, y: py, vx: Math.cos(p.angle) * 60, vy: Math.sin(p.angle) * 60, life: 0.25, max: 0.25, color: '#ffd166', size: 8 });
  // Hit pedestrians, cops, or a nearby car door.
  let hit = false;
  for (const ped of G.peds) {
    if (Math.hypot(ped.x - p.x, ped.y - p.y) < 46) { ped.flee = 3; ped.health -= 34; G.floaters.push({ x: ped.x, y: ped.y - 20, text: 'POW!', life: 0.8, color: '#ffdd00' }); hit = true; }
  }
  for (const cop of G.cops) {
    if (cop.onFoot && Math.hypot(cop.x - p.x, cop.y - p.y) < 48) {
      cop.health -= 34; cop.stagger = 0.5; hit = true;
      G.wanted = Math.min(5, G.wanted + 1); G.wantedTimer = 0;
      G.floaters.push({ x: cop.x, y: cop.y - 20, text: 'HIT COP +1★', life: 1, color: '#ff5555' });
    }
  }
  if (hit) G.audio.hit();
}

export function hurtPlayer(G, dmg, cause) {
  const p = G.player;
  if (p.hurtTimer > 0 || G.mode !== 'play') return;
  p.health -= dmg;
  p.hurtTimer = 0.6;
  G.audio.hurt();
  G.floaters.push({ x: p.x, y: p.y - 26, text: `-${dmg}`, life: 0.9, color: '#ff4444' });
  if (p.health <= 0) {
    p.health = 0;
    G.mode = cause === 'busted' ? 'busted' : 'wasted';
    G.audio.gameOver();
  }
}

export function drawPlayer(ctx, G, t) {
  const p = G.player;
  if (!p.onFoot) return;
  const bob = p.moving ? Math.sin(t / 90) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(p.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(-2, 6, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Body: teal jacket, dark jeans.
  ctx.fillStyle = '#0f766e';
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(7, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-12, -8, 8, 5);
  ctx.fillRect(-12, 3, 8, 5);
  // Punch arm.
  if (p.punchTimer > 0) {
    ctx.fillStyle = '#f2c89b';
    ctx.fillRect(8, -4, 16, 7);
  }
  // Pistol in hand when armed.
  if (G.weapon === 'pistol') {
    ctx.fillStyle = '#222';
    ctx.fillRect(6, 6, 12, 4);
  }
  ctx.restore();
}
