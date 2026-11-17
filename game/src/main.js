// main.js — SOLARA BAY boot, game loop, input, camera, particles, rendering.
import { buildCity, drawCity, WORLD } from './city.js';
import { createPlayer, updatePlayer, playerPunch, drawPlayer } from './player.js';
import { spawnParkedCars, enterCar, exitCar, nearestCar, updateCar, drawCar } from './vehicles.js';
import { spawnTraffic, updateTraffic, drawTraffic } from './traffic.js';
import { spawnPedestrians, updatePedestrians, drawPedestrians } from './pedestrians.js';
import { updateWanted, updatePolice, drawPolice } from './police.js';
import { createMissionState, startMission, updateMissions, maybeOfferTaxi, drawMissionMarkers, STORY } from './missions.js';
import { createCombatState, spawnPickups, shoot, updateCombat, drawCombat } from './combat.js';
import { createAudio } from './audio.js';
import { saveGameState, loadGameState, applySave, hasSave } from './save.js';
import { drawHUD, drawTitle, drawPause, drawGameOver } from './hud.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  mode: 'title',
  city: buildCity(),
  player: createPlayer(600, 600),
  cars: [], traffic: [], peds: [], cops: [],
  particles: [], floaters: [],
  missions: createMissionState(),
  combat: createCombatState(),
  audio: createAudio(),
  money: 0, ammo: 12, weapon: 'pistol', wanted: 0, wantedTimer: 0,
  clock: 540, objective: 'Press ENTER to start. Then press N to take your first mission.',
  dialogue: [], dialogueTimer: 0,
  hasSave: hasSave(),
  cam: { x: 0, y: 0, w: 1280, h: 720 },
  time: 0,
};
G.saveGame = () => saveGameState(G);

// Sun coin spots (10 across the city).
G.missions.coinSpots = [
  { x: 500, y: 500, taken: false }, { x: 1700, y: 500, taken: false },
  { x: 2500, y: 900, taken: false }, { x: 900, y: 1300, taken: false },
  { x: 2100, y: 1700, taken: false }, { x: 500, y: 2100, taken: false },
  { x: 1300, y: 2500, taken: false }, { x: 2500, y: 2500, taken: false },
  { x: 2860, y: 1800, taken: false }, { x: 1700, y: 2900, taken: false },
];

spawnParkedCars(G);
spawnTraffic(G, 14);
spawnPedestrians(G, 26);
spawnPickups(G);

const keys = new Set();
let mouse = { x: 640, y: 360, down: false };

function worldFromScreen(sx, sy) {
  return { x: G.cam.x + sx, y: G.cam.y + sy };
}

function startGame(fresh) {
  if (fresh) {
    G.money = 0; G.ammo = 12; G.wanted = 0; G.wantedTimer = 0;
    G.player = createPlayer(600, 600);
    G.missions = createMissionState();
    G.missions.coinSpots = [
      { x: 500, y: 500, taken: false }, { x: 1700, y: 500, taken: false },
      { x: 2500, y: 900, taken: false }, { x: 900, y: 1300, taken: false },
      { x: 2100, y: 1700, taken: false }, { x: 500, y: 2100, taken: false },
      { x: 1300, y: 2500, taken: false }, { x: 2500, y: 2500, taken: false },
      { x: 2860, y: 1800, taken: false }, { x: 1700, y: 2900, taken: false },
    ];
    G.cops.length = 0;
    G.objective = 'Press N to take your first mission from Mara.';
    G.dialogue = ['Mara: "Rio. Coral Plaza. One fare. No questions."'];
    G.dialogueTimer = 6;
  }
  G.mode = 'play';
  G.audio.unlock();
}

function nextMission() {
  const ms = G.missions;
  if (ms.stage === 'active') return;
  const idx = STORY.findIndex(m => !ms.completed.includes(m.id));
  if (idx >= 0) startMission(G, idx);
  else G.objective = 'All story missions complete — free roam Solara Bay!';
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  G.audio.unlock();
  if (e.code === 'Enter') {
    if (G.mode === 'title') startGame(true);
    else if (G.mode === 'wasted' || G.mode === 'busted') { G.mode = 'title'; G.hasSave = hasSave(); }
  }
  if (e.code === 'KeyC' && G.mode === 'title' && G.hasSave) {
    const data = loadGameState();
    if (data) { applySave(G, data); G.mode = 'play'; G.audio.unlock(); }
  }
  if (e.code === 'KeyN' && G.mode === 'play') nextMission();
  if (e.code === 'KeyP' && (G.mode === 'play' || G.mode === 'paused')) {
    G.mode = G.mode === 'play' ? 'paused' : 'play';
  }
  if (e.code === 'KeyM') G.audio.toggleMute();
  if (e.code === 'KeyR' && G.mode === 'paused') { G.mode = 'title'; G.hasSave = hasSave(); }
  if (e.code === 'KeyT' && G.mode === 'paused') { G.mode = 'title'; G.hasSave = hasSave(); }
  if (e.code === 'KeyE' && G.mode === 'play') {
    const p = G.player;
    if (p.onFoot) {
      const car = nearestCar(G, p.x, p.y, 75);
      if (car) enterCar(G, car);
    } else exitCar(G);
  }
  if (e.code === 'Space' && G.mode === 'play') playerPunch(G);
  if (e.code === 'KeyF' && G.mode === 'play') {
    const w = worldFromScreen(mouse.x, mouse.y);
    shoot(G, w.x, w.y);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
});
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  if (G.mode === 'play') {
    const w = worldFromScreen(mouse.x, mouse.y);
    shoot(G, w.x, w.y);
  }
  G.audio.unlock();
});

// Staged screenshot states (?shot=cover|title|mission|drive).
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  applyShot(G, shot);
  // Let staged scenes settle a few frames before any screenshot is taken.
  G.shotMode = shot;
}

function update(dt) {
  G.time += dt * 1000;
  if (G.mode !== 'play') return;
  G.clock = (G.clock + dt * 0.6) % 1440;
  if (G.dialogueTimer > 0) G.dialogueTimer -= dt;
  updatePlayer(G, dt, keys);
  if (G.player.car) updateCar(G, G.player.car, dt, keys);
  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updateWanted(G, dt);
  updatePolice(G, dt);
  updateMissions(G, dt);
  updateCombat(G, dt);
  // Random taxi offers while driving.
  if (G.player.car && Math.random() < dt * 0.02) maybeOfferTaxi(G);
  // Particles.
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.life -= dt;
    f.y -= 30 * dt;
    if (f.life <= 0) G.floaters.splice(i, 1);
  }
  // Engine + siren audio follow the action.
  const car = G.player.car;
  G.audio.setEngine(car ? car.speed : 0, car ? car.def.max : 500);
  G.audio.sirenTick(G.time);
  // Camera follows the player (or their car), clamped to the world.
  const px = G.player.onFoot ? G.player.x : (G.player.car ? G.player.car.x : G.player.x);
  const py = G.player.onFoot ? G.player.y : (G.player.car ? G.player.car.y : G.player.y);
  G.cam.x = Math.max(0, Math.min(WORLD - 1280, px - 640));
  G.cam.y = Math.max(0, Math.min(WORLD - 720, py - 360));
}

function render() {
  const t = G.time;
  ctx.clearRect(0, 0, 1280, 720);
  if (G.mode === 'title') { drawTitle(ctx, G); return; }
  ctx.save();
  ctx.translate(-G.cam.x, -G.cam.y);
  drawCity(ctx, G.city, G.cam, t);
  drawMissionMarkers(ctx, G, t);
  drawCombat(ctx, G, t);
  // Parked / owned cars (not traffic, not police cars — police drawn with cops).
  for (const car of G.cars) {
    if (car.traffic) continue;
    if (G.cops.some(c => c.car === car)) continue;
    drawCar(ctx, car, t);
  }
  drawTraffic(ctx, G, t);
  drawPedestrians(ctx, G, t);
  drawPolice(ctx, G, t);
  drawPlayer(ctx, G, t);
  // Particles.
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floating score text.
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawHUD(ctx, G);
  if (G.mode === 'paused') drawPause(ctx, G);
  if (G.mode === 'wasted' || G.mode === 'busted') drawGameOver(ctx, G);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Expose a small handle for automated play-testing.
window.__solara = { G, keys, startGame, nextMission };
