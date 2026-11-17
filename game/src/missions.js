// missions.js — story missions, side jobs (taxi fares, sun coins), rewards.
import { makeCar } from './vehicles.js';

export const STORY = [
  {
    id: 'fare', title: 'First Fare', giver: 'Mara — dispatcher',
    brief: 'Mara needs a driver who asks no questions. Get in any car and reach the pickup point at Coral Plaza.',
    lines: ['Mara: "Rio, you drive. I talk. That is the deal."', 'Rio: "One fare. Then I am out."', 'Mara: "Sure. They all say that."'],
    reward: 150,
  },
  {
    id: 'wheels', title: 'Hot Wheels', giver: 'Mara — dispatcher',
    brief: 'A Palma GT is parked by the marina. Steal it and deliver it to the garage on Palm Row. The owners will notice.',
    lines: ['Mara: "That green GT belongs to a man who owes me."', 'Rio: "So I steal it and you call it even?"', 'Mara: "I call it a test."'],
    reward: 300,
  },
  {
    id: 'heat', title: 'Bayfront Heat', giver: 'Rio Vega',
    brief: 'The heat is on. Lose the cops — get your wanted level back to zero — or fight through them, then reach the hideout.',
    lines: ['Rio: "Every siren in Solara Bay is after me."', 'Mara: "Then drive like the bay is on fire."', 'Rio: "It might be, by the time I am done."'],
    reward: 500,
  },
];

export function createMissionState() {
  return {
    index: 0, stage: 'idle', // idle | active | done
    target: null, // {x, y, label}
    timer: 0, banner: null, bannerTimer: 0,
    completed: [], taxi: null, coins: 0, coinsTotal: 10,
    coinSpots: [],
  };
}

export function startMission(G, index) {
  const m = STORY[index];
  if (!m) return;
  const ms = G.missions;
  ms.index = index;
  ms.stage = 'active';
  ms.timer = 0;
  if (m.id === 'fare') {
    ms.target = { x: 1200, y: 1200, label: 'Coral Plaza pickup' };
  } else if (m.id === 'wheels') {
    // Spawn the marked Palma GT near the marina (east side).
    const car = makeCar(2820, 800, Math.PI / 2, 2, { parked: true, missionCar: true });
    G.cars.push(car);
    ms.target = { x: 2820, y: 800, label: 'Steal the Palma GT' };
    ms.missionCar = car;
  } else if (m.id === 'heat') {
    G.wanted = Math.max(3, G.wanted);
    G.wantedTimer = 0;
    ms.target = { x: 400, y: 2800, label: 'Hideout — lose the heat' };
  }
  G.objective = `${m.title}: ${m.brief}`;
  G.dialogue = m.lines.slice();
  G.dialogueTimer = 6;
  G.audio.chime();
  G.floaters.push({ x: G.player.x, y: G.player.y - 40, text: `MISSION: ${m.title}`, life: 1.6, color: '#ffd166' });
}

export function completeMission(G) {
  const ms = G.missions;
  const m = STORY[ms.index];
  ms.stage = 'done';
  ms.completed.push(m.id);
  G.money += m.reward;
  ms.banner = `MISSION COMPLETE — ${m.title}  +$${m.reward}`;
  ms.bannerTimer = 4;
  G.audio.fanfare();
  G.objective = `Done: ${m.title}. Press N for the next mission.`;
  G.saveGame();
}

export function updateMissions(G, dt) {
  const ms = G.missions;
  if (ms.bannerTimer > 0) ms.bannerTimer -= dt;
  if (ms.stage !== 'active') return;
  ms.timer += dt;
  const m = STORY[ms.index];
  const p = G.player;
  const px = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
  const py = p.onFoot ? p.y : (p.car ? p.car.y : p.y);
  if (m.id === 'fare') {
    if (ms.target && Math.hypot(px - ms.target.x, py - ms.target.y) < 70) completeMission(G);
  } else if (m.id === 'wheels') {
    if (ms.target && p.car === ms.missionCar) {
      ms.target = { x: 800, y: 2400, label: 'Deliver the GT to the garage' };
      G.objective = 'Hot Wheels: deliver the Palma GT to the garage on Palm Row.';
    }
    if (ms.target && ms.target.label.startsWith('Deliver') && p.car === ms.missionCar &&
      Math.hypot(px - ms.target.x, py - ms.target.y) < 80) {
      completeMission(G);
    }
  } else if (m.id === 'heat') {
    if (G.wanted === 0 && ms.target && Math.hypot(px - ms.target.x, py - ms.target.y) < 80) completeMission(G);
  }
  // Taxi side job: a fare ped waits; drive them to their destination.
  if (ms.taxi) {
    const t = ms.taxi;
    if (t.stage === 'pickup' && p.car && Math.hypot(px - t.x, py - t.y) < 60) {
      t.stage = 'drop';
      G.floaters.push({ x: px, y: py - 30, text: 'FARE ON BOARD', life: 1, color: '#ffd166' });
      G.audio.chime();
    } else if (t.stage === 'drop' && Math.hypot(px - t.dx, py - t.dy) < 70) {
      G.money += t.pay;
      G.floaters.push({ x: px, y: py - 30, text: `FARE PAID +$${t.pay}`, life: 1.4, color: '#7ee787' });
      G.audio.fanfare();
      ms.taxi = null;
    }
  }
  // Sun coin collectibles.
  for (const coin of ms.coinSpots) {
    if (!coin.taken && Math.hypot(px - coin.x, py - coin.y) < 40) {
      coin.taken = true;
      ms.coins += 1;
      G.money += 40;
      G.floaters.push({ x: coin.x, y: coin.y - 20, text: 'SUN COIN +$40', life: 1, color: '#ffd166' });
      G.audio.chime();
    }
  }
}

export function maybeOfferTaxi(G) {
  const ms = G.missions;
  if (ms.taxi || Math.random() > 0.4) return;
  const p = G.player;
  if (!p.car) return;
  const a = Math.random() * Math.PI * 2;
  const fx = Math.max(200, Math.min(2800, p.x + Math.cos(a) * 500));
  const fy = Math.max(200, Math.min(2800, p.y + Math.sin(a) * 500));
  const dx = 400 + Math.random() * 2000, dy = 400 + Math.random() * 2000;
  ms.taxi = { x: fx, y: fy, dx, dy, stage: 'pickup', pay: 60 + Math.floor(Math.random() * 60) };
  G.objective = `Taxi fare waiting nearby — pick them up ($${ms.taxi.pay}).`;
  G.floaters.push({ x: p.x, y: p.y - 40, text: 'TAXI FARE NEARBY $', life: 1.4, color: '#ffd166' });
}

export function drawMissionMarkers(ctx, G, t) {
  const ms = G.missions;
  const drawMarker = (x, y, label, color) => {
    const pulse = 1 + Math.sin(t / 200) * 0.15;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(0, 0, 46 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, 6); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill();
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText(label, 0, -52);
    ctx.fillText(label, 0, -52);
    ctx.restore();
  };
  if (ms.stage === 'active' && ms.target) drawMarker(ms.target.x, ms.target.y, ms.target.label, '#ffd166');
  if (ms.taxi) {
    const tx = ms.taxi.stage === 'pickup' ? ms.taxi.x : ms.taxi.dx;
    const ty = ms.taxi.stage === 'pickup' ? ms.taxi.y : ms.taxi.dy;
    drawMarker(tx, ty, ms.taxi.stage === 'pickup' ? 'TAXI PICKUP' : 'DROP-OFF', '#06d6a0');
  }
  for (const coin of ms.coinSpots) {
    if (coin.taken) continue;
    ctx.save();
    ctx.translate(coin.x, coin.y + Math.sin(t / 300 + coin.x) * 4);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9d00';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('S', 0, 5);
    ctx.restore();
  }
}
