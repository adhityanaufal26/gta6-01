// save.js — localStorage save / load for Solara Bay.
const KEY = 'solara-bay-save-v1';

export function saveGameState(G) {
  try {
    const p = G.player;
    const data = {
      money: G.money,
      ammo: G.ammo,
      health: p.health,
      missionsCompleted: G.missions.completed,
      coins: G.missions.coins,
      coinTaken: G.missions.coinSpots.map(c => c.taken),
      x: p.x, y: p.y,
      clock: G.clock,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGameState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function applySave(G, data) {
  G.money = data.money ?? 0;
  G.ammo = data.ammo ?? 12;
  G.player.health = data.health ?? 100;
  G.player.x = data.x ?? 600;
  G.player.y = data.y ?? 600;
  G.missions.completed = data.missionsCompleted || [];
  G.missions.coins = data.coins || 0;
  if (Array.isArray(data.coinTaken)) {
    data.coinTaken.forEach((t, i) => { if (G.missions.coinSpots[i]) G.missions.coinSpots[i].taken = !!t; });
  }
  G.clock = data.clock ?? 540;
  // Next uncompleted mission becomes the active one.
  const next = ['fare', 'wheels', 'heat'].findIndex(id => !G.missions.completed.includes(id));
  G.missions.index = next < 0 ? 0 : next;
  G.missions.stage = 'idle';
  G.objective = next < 0 ? 'All story missions complete — free roam Solara Bay!' : 'Press N to start your next mission.';
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}
