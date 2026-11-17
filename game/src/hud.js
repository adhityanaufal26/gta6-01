// hud.js — HUD: health, money, wanted stars, weapon/ammo, clock, objective,
// live minimap, dialogue lines, banners, title / pause / game-over screens.
import { STORY } from './missions.js';
import { WORLD } from './city.js';

function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function drawHUD(ctx, G) {
  const W = 1280, H = 720;
  ctx.save();
  // Top-left: health bar + money.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 14, 250, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('RIO VEGA', 24, 34);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 42, 180, 14);
  ctx.fillStyle = G.player.health > 30 ? '#37d67a' : '#e63946';
  ctx.fillRect(24, 42, 180 * (G.player.health / 100), 14);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText(`$${G.money.toLocaleString()}`, 214, 56);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px system-ui';
  ctx.fillText(`☀ ${G.missions.coins}/${G.missions.coinsTotal} coins`, 24, 72);
  // Top-right: wanted stars + clock.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(W - 264, 14, 250, 64);
  ctx.font = '26px system-ui';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W - 254 + i * 32, 48);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText(fmtClock(G.clock), W - 110, 72);
  ctx.fillStyle = '#9fc3d4';
  ctx.font = '13px system-ui';
  ctx.fillText(G.player.onFoot ? 'ON FOOT' : `DRIVING — ${G.player.car ? G.player.car.def.name : ''}`, W - 254, 72);
  // Top-center: mission objective (truncated, below the top panels).
  if (G.objective) {
    const short = G.objective.length > 72 ? G.objective.slice(0, 72) + '…' : G.objective;
    ctx.font = 'bold 15px system-ui';
    const tw = ctx.measureText(short).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W / 2 - tw / 2 - 14, 88, tw + 28, 30);
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.fillText(short, W / 2, 109);
  }
  // Bottom-left: weapon / ammo + controls reminder.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, H - 64, 240, 50);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(G.weapon === 'pistol' ? '🔫 PISTOL' : '🥊 FISTS', 24, H - 42);
  ctx.fillStyle = '#ffd166';
  ctx.fillText(G.weapon === 'pistol' ? `AMMO ${G.ammo}` : 'SPACE punch · F shoot', 24, H - 22);
  // Minimap bottom-right.
  drawMinimap(ctx, G, W - 214, H - 214, 200);
  // Dialogue lines.
  if (G.dialogueTimer > 0 && G.dialogue.length) {
    const line = G.dialogue[G.dialogue.length - 1];
    ctx.font = 'italic 16px system-ui';
    const tw = ctx.measureText(line).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(W / 2 - tw / 2 - 14, H - 120, tw + 28, 30);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(line, W / 2, H - 99);
  }
  // Mission banner.
  if (G.missions.bannerTimer > 0 && G.missions.banner) {
    ctx.font = 'bold 30px system-ui';
    const tw = ctx.measureText(G.missions.banner).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(W / 2 - tw / 2 - 18, 140, tw + 36, 48);
    ctx.fillStyle = '#7ee787';
    ctx.textAlign = 'center';
    ctx.fillText(G.missions.banner, W / 2, 173);
  }
  // Floating score text is drawn in world space by main.js.
  // Low-health vignette.
  if (G.player.health < 30 && G.mode === 'play') {
    ctx.fillStyle = `rgba(230,57,70,${0.12 + 0.08 * Math.sin(Date.now() / 200)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

export function drawMinimap(ctx, G, x, y, size) {
  const s = size / WORLD;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 6, y - 6, size + 12, size + 12);
  ctx.fillStyle = '#1fb6c9';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#f2d8a0';
  ctx.fillRect(x, y, size * (2960 / WORLD), size);
  // Roads.
  ctx.fillStyle = '#3d4450';
  for (let i = 0; i <= 8; i++) {
    ctx.fillRect(x + i * 400 * s - 2, y, 4, size);
    ctx.fillRect(x, y + i * 400 * s - 2, size, 4);
  }
  // Buildings.
  ctx.fillStyle = '#c98f5f';
  for (const b of G.city.buildings) ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
  // Mission marker.
  if (G.missions.stage === 'active' && G.missions.target) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(x + G.missions.target.x * s, y + G.missions.target.y * s, 5, 0, Math.PI * 2); ctx.fill();
  }
  if (G.missions.taxi) {
    ctx.fillStyle = '#06d6a0';
    ctx.beginPath(); ctx.arc(x + G.missions.taxi.x * s, y + G.missions.taxi.y * s, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Cops (blue), player (white ring).
  for (const cop of G.cops) {
    ctx.fillStyle = '#2266ff';
    ctx.beginPath(); ctx.arc(x + cop.x * s, y + cop.y * s, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  const p = G.player;
  const px = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
  const py = p.onFoot ? p.y : (p.car ? p.car.y : p.y);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + px * s, y + py * s, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + px * s, y + py * s, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARA BAY', x, y - 10);
  ctx.restore();
}

export function drawTitle(ctx, G) {
  const W = 1280, H = 720;
  // Sun-soaked backdrop: gradient sky, sea band, skyline silhouettes.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#ff9d5c');
  grad.addColorStop(0.45, '#ff6b6b');
  grad.addColorStop(0.75, '#118ab2');
  grad.addColorStop(1, '#073b4c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(1040, 130, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(300, 120, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(700, 80, 150, 30, 0, 0, Math.PI * 2); ctx.fill();
  // Skyline.
  const cols = ['#073b4c', '#0b5563', '#118ab2', '#0f4c5c'];
  for (let i = 0; i < 22; i++) {
    const bw = 46 + (i * 37) % 40, bh = 120 + (i * 53) % 190;
    ctx.fillStyle = cols[i % 4];
    ctx.fillRect(i * 60, H - 190 - bh + 120, bw, bh);
    ctx.fillStyle = '#ffd166';
    for (let wy = H - 190 - bh + 140; wy < H - 90; wy += 26) ctx.fillRect(i * 60 + 10, wy, 10, 12);
  }
  ctx.fillStyle = '#1fb6c9';
  ctx.fillRect(0, H - 70, W, 70);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = 0; x < W; x += 90) ctx.fillRect(x + (Date.now() / 40 % 90), H - 50, 46, 4);
  // Title block.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 92px system-ui';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18;
  ctx.fillText('SOLARA BAY', W / 2, 190);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 24px system-ui';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('An open-world crime story — drive, steal, run, survive.', W / 2, 232);
  ctx.font = '16px system-ui';
  ctx.fillStyle = '#fff';
  ctx.fillText('Rio Vega, driver-for-hire, is pulled into a turf war over the sunniest city on the coast.', W / 2, 262);
  ctx.fillText('Steal cars, outrun the police, run fares for Mara — and take the bay back, one job at a time.', W / 2, 286);
  // Mission list panel.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(90, 320, 480, 240);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px system-ui';
  ctx.fillText('STORY MISSIONS', 112, 350);
  ctx.fillStyle = '#fff';
  ctx.font = '15px system-ui';
  STORY.forEach((m, i) => {
    const done = G.missions.completed.includes(m.id);
    ctx.fillStyle = done ? '#7ee787' : '#fff';
    ctx.fillText(`${done ? '✓' : `${i + 1}.`} ${m.title} — ${m.giver}  ($${m.reward})`, 112, 380 + i * 44);
    ctx.fillStyle = '#cfe8ef';
    ctx.font = '13px system-ui';
    ctx.fillText(`   ${m.brief.slice(0, 62)}…`, 112, 398 + i * 44);
    ctx.font = '15px system-ui';
  });
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 15px system-ui';
  ctx.fillText('SIDE JOBS: taxi fares ($) · stunt jumps · 10 sun coins', 112, 528);
  // Controls panel.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(620, 320, 570, 210);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px system-ui';
  ctx.fillText('CONTROLS', 644, 350);
  const controls = [
    'WASD / Arrows — move on foot, drive in a car',
    'SHIFT — run   ·   E — enter / exit car (steal it!)',
    'SPACE — punch   ·   F or Click — shoot pistol',
    'N — next mission   ·   P — pause   ·   M — mute',
    'Goal: finish all 3 story missions. Wanted stars rise on crime',
    'and fall when you stay hidden. Cops chase, ram and arrest.',
  ];
  ctx.fillStyle = '#fff';
  ctx.font = '15px system-ui';
  controls.forEach((c, i) => ctx.fillText(c, 644, 382 + i * 26));
  // Start prompt.
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(G.hasSave ? 'Press ENTER — NEW GAME or C — CONTINUE SAVED GAME' : 'Press ENTER to start', W / 2, 600);
  ctx.globalAlpha = 1;
  ctx.font = '14px system-ui';
  ctx.fillStyle = '#cfe8ef';
  ctx.fillText('Best played with sound on. Progress saves automatically after each mission.', W / 2, 632);
}

export function drawPause(ctx, G) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 320);
  ctx.font = '20px system-ui';
  ctx.fillText('P — resume    ·    R — restart day    ·    T — back to title', 640, 370);
  ctx.font = '16px system-ui';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`Money $${G.money}  ·  Missions done: ${G.missions.completed.length}/3  ·  Sun coins ${G.missions.coins}/10`, 640, 410);
}

export function drawGameOver(ctx, G) {
  ctx.fillStyle = G.mode === 'busted' ? 'rgba(10,30,80,0.78)' : 'rgba(80,10,10,0.78)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(G.mode === 'busted' ? 'BUSTED' : 'WASTED', 640, 320);
  ctx.font = '20px system-ui';
  ctx.fillText(G.mode === 'busted'
    ? 'The Solara Bay police caught Rio. The bail is steep — but the bay is still there.'
    : 'Rio went down in the streets of Solara Bay. The city does not wait.', 640, 372);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px system-ui';
  ctx.fillText(`Money $${G.money}  ·  Missions done: ${G.missions.completed.length}/3  ·  Sun coins ${G.missions.coins}/10`, 640, 420);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px system-ui';
  ctx.fillText('Press ENTER to try again', 640, 480);
}
