// shots.js — staged screenshot states via ?shot= : cover, title, mission, drive.
// Each state sets up a dense, legible scene using the game's own systems.
import { startMission } from './missions.js';
import { makeCar } from './vehicles.js';

export function applyShot(G, shot) {
  const p = G.player;
  if (shot === 'title') {
    G.mode = 'title';
    G.missions.completed = ['fare'];
    return;
  }
  if (shot === 'cover') {
    // Police chase mid-action: player in a car, wanted 3, cops on tail,
    // mission objective on screen, minimap live.
    G.mode = 'play';
    const car = makeCar(1400, 1200, 0, 2, { parked: false });
    G.cars.push(car);
    p.x = 1400; p.y = 1200;
    p.onFoot = false; p.car = car;
    car.speed = 420;
    G.wanted = 3;
    G.wantedTimer = 0;
    G.money = 1250;
    G.ammo = 18;
    G.clock = 17 * 60 + 24;
    startMission(G, 1); // Hot Wheels — marker + dialogue visible
    // Two police cars in pursuit, one foot cop ahead.
    const c1 = makeCar(1180, 1200, 0, 0, { police: true, color: '#f8f9fa' });
    c1.speed = 480;
    const c2 = makeCar(1560, 1060, Math.PI * 0.75, 0, { police: true, color: '#f8f9fa' });
    c2.speed = 430;
    G.cars.push(c1, c2);
    G.cops.push(
      { car: c1, onFoot: false, x: c1.x, y: c1.y, health: 100, stagger: 0, arrestTimer: 0, ramTimer: 0 },
      { car: c2, onFoot: false, x: c2.x, y: c2.y, health: 100, stagger: 0, arrestTimer: 0, ramTimer: 0 },
    );
    // Crowd the frame: traffic + peds nearby.
    G.traffic.forEach((t, i) => { t.x = 1400 + (i - 3) * 260; t.y = 1200 + ((i % 2) ? 140 : -140); t.speed = 150; });
    G.peds.forEach((pd, i) => { pd.x = 1250 + i * 55; pd.y = 1330 + (i % 3) * 24; });
    G.audio.sirenStart();
    return;
  }
  if (shot === 'mission') {
    // On-foot mission/combat moment: Rio punching near a cop, marker ahead.
    // Player starts well outside the 70px mission radius so it cannot auto-complete.
    G.mode = 'play';
    p.x = 1000; p.y = 1200; p.onFoot = true; p.angle = 0;
    p.punchTimer = 0.22;
    G.wanted = 2;
    G.money = 640;
    G.ammo = 12;
    G.clock = 11 * 60 + 40;
    startMission(G, 0); // First Fare — marker at Coral Plaza (1200,1200)
    G.cops.push({ car: null, onFoot: true, x: 1090, y: 1200, health: 66, stagger: 0, arrestTimer: 0, ramTimer: 0, angle: Math.PI });
    G.peds.forEach((pd, i) => { pd.x = 880 + i * 48; pd.y = 1150 + (i % 4) * 24; pd.flee = 1.5; });
    G.floaters.push({ x: 1000, y: 1140, text: 'POW!', life: 2, color: '#ffdd00' });
    return;
  }
  if (shot === 'drive') {
    // Driving with a mission-complete banner: reward moment.
    // Car sits on the road clear of the stunt ramp at (800,2400).
    G.mode = 'play';
    const car = makeCar(1000, 2400, 0, 2, { parked: false, missionCar: true });
    G.cars.push(car);
    p.x = 1000; p.y = 2400;
    p.onFoot = false; p.car = car;
    car.speed = 380;
    G.wanted = 0;
    G.money = 1500;
    G.ammo = 24;
    G.clock = 19 * 60 + 5;
    G.missions.completed = ['fare', 'wheels'];
    G.missions.banner = 'MISSION COMPLETE — Hot Wheels  +$300';
    G.missions.bannerTimer = 99;
    G.objective = 'Done: Hot Wheels. Press N for the next mission.';
    G.missions.coins = 4;
    G.traffic.forEach((t, i) => { t.x = 800 + (i - 4) * 300; t.y = 2400 + ((i % 2) ? 160 : -160); t.speed = 170; });
    return;
  }
}
