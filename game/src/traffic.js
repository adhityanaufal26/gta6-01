// traffic.js — ambient traffic cars cruising the road grid.
import { makeCar, drawCar } from './vehicles.js';
import { ROAD_STEP, ROAD_W, nearestRoadPoint } from './city.js';

export function spawnTraffic(G, n = 14) {
  for (let i = 0; i < n; i++) {
    const rx = (1 + Math.floor(Math.random() * 7)) * ROAD_STEP;
    const ry = (1 + Math.floor(Math.random() * 7)) * ROAD_STEP;
    const horizontal = Math.random() > 0.5;
    const car = makeCar(horizontal ? rx + (Math.random() * 600 - 300) : rx, horizontal ? ry : ry + (Math.random() * 600 - 300),
      horizontal ? (Math.random() > 0.5 ? 0 : Math.PI) : (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2),
      Math.floor(Math.random() * 6), { traffic: true });
    car.speed = 140 + Math.random() * 90;
    car.dir = horizontal ? 'h' : 'v';
    G.cars.push(car);
    G.traffic.push(car);
  }
}

export function updateTraffic(G, dt) {
  const p = G.player;
  for (const car of G.traffic) {
    // Slow down if the player is right ahead.
    const px = p.onFoot ? p.x : (p.car ? p.car.x : p.x);
    const py = p.onFoot ? p.y : (p.car ? p.car.y : p.y);
    const aheadX = car.x + Math.cos(car.angle) * 70;
    const aheadY = car.y + Math.sin(car.angle) * 70;
    const blocked = Math.hypot(aheadX - px, aheadY - py) < 46;
    const target = blocked ? 0 : 170;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // At an intersection, sometimes turn.
    const nearX = Math.abs((car.x % ROAD_STEP) - 0) < 14 || Math.abs((car.x % ROAD_STEP) - ROAD_STEP) < 14;
    const nearY = Math.abs((car.y % ROAD_STEP) - 0) < 14 || Math.abs((car.y % ROAD_STEP) - ROAD_STEP) < 14;
    if (nearX && nearY && Math.random() < dt * 0.5) {
      car.angle += (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
      car.x = Math.round(car.x / ROAD_STEP) * ROAD_STEP;
      car.y = Math.round(car.y / ROAD_STEP) * ROAD_STEP;
    }
    // Wrap around the world edges.
    if (car.x < -60) car.x = 3140;
    if (car.x > 3260) car.x = 60;
    if (car.y < -60) car.y = 3140;
    if (car.y > 3260) car.y = 60;
    // Player car collision: bump both (damage on a cooldown, not per frame).
    if (car.bumpTimer > 0) car.bumpTimer -= dt;
    if (p.car && p.car !== car) {
      const d = Math.hypot(car.x - p.car.x, car.y - p.car.y);
      if (d < 46 && car.bumpTimer <= 0) {
        car.bumpTimer = 0.8;
        car.speed *= 0.4;
        p.car.speed *= 0.7;
        p.car.health -= 2;
        G.audio.crash();
      }
    }
  }
  // Keep traffic topped up.
  if (G.traffic.length < 12) spawnTraffic(G, 1);
}

export function drawTraffic(ctx, G, t) {
  for (const car of G.traffic) drawCar(ctx, car, t);
}
