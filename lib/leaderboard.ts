import "server-only";

export interface LeaderboardEntry {
  id: string;
  callsign: string;
  championship_points: number;
  maximum_points: number;
  percentage: number;
  grade: string;
  fastest_lap_ms: number;
  best_submitted_at: string;
}

function configuration() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase leaderboard is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }
  return { url, key };
}

async function request(path: string, init: RequestInit = {}) {
  const { url, key } = configuration();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Leaderboard database request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return response;
}

export async function isCallsignAvailable(callsign: string): Promise<boolean> {
  return isCallsignAvailableForPlayer(callsign, null);
}

export async function isCallsignAvailableForPlayer(
  callsign: string,
  playerTokenHash: string | null
): Promise<boolean> {
  const safe = callsign.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const response = await request(
    `leaderboard_entries?select=id,player_token_hash&callsign_key=eq.${encodeURIComponent(safe)}&limit=1`
  );
  const rows = await response.json() as { id: string; player_token_hash: string }[];
  if (rows.length === 0) return true;
  return Boolean(playerTokenHash && rows[0].player_token_hash === playerTokenHash);
}

export async function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const response = await request(
    `leaderboard_entries?select=id,callsign,championship_points,maximum_points,percentage,grade,fastest_lap_ms,best_submitted_at&order=championship_points.desc,fastest_lap_ms.asc,best_submitted_at.asc&limit=${safeLimit}`
  );
  return await response.json() as LeaderboardEntry[];
}

export async function submitLeaderboardResult(input: {
  callsign: string;
  playerTokenHash: string;
  championshipPoints: number;
  maximumPoints: number;
  percentage: number;
  grade: string;
  fastestLapMs: number;
}) {
  const { url, key } = configuration();
  const response = await fetch(`${url}/rest/v1/rpc/submit_leaderboard_result`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_callsign: input.callsign,
      p_player_token_hash: input.playerTokenHash,
      p_championship_points: input.championshipPoints,
      p_maximum_points: input.maximumPoints,
      p_percentage: input.percentage,
      p_grade: input.grade,
      p_fastest_lap_ms: input.fastestLapMs,
      p_scoring_version: "0.3",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (detail.toLowerCase().includes("callsign")) {
      throw new Error("That callsign is already on the leaderboard. Please choose another.");
    }
    throw new Error("Your result could not be saved to the leaderboard.");
  }

  const rows = await response.json() as LeaderboardEntry[];
  return rows[0] ?? null;
}

export async function deleteLeaderboardEntry(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Invalid leaderboard entry.");
  }
  await request(`leaderboard_entries?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export function generateCallsign(): string {
  const adjectives = [
    "Apex","Turbo","Rapid","Neon","Swift","Lucky","Bold","Prime","Slick","Flying",
    "Racing","Rocket","Silver","Golden","Crimson","Blue","Shadow","Velocity","Nitro","Atomic",
    "Super","Hyper","Mega","Ultra","Stealth","Vortex","Phantom","Cosmic","Storm","Thunder",
    "Midnight","Arctic","Solar","Lunar","Electric","Carbon","Titanium","Velvet","Wild","Fierce",
    "Clever","Brave","Mighty","Quick","Smooth","Keen"," fearless","Dynamic","Daring","Grand",
    "Elite","Rapidfire","Overtake","Pole","Grid","Paddock","Pitwall","Kerb","Chicane","Hairpin",
    "Downforce","Slipstream","Drafting","Drift","Clutch","Piston","Octane","Fuel","Boost","Burnout",
    "Checkered","Podium","Victory","Champion","Rookie","Veteran","Sunday","Sprint","Endurance","Formula",
    "Circuit","Trackside","Racecraft","FrontRow","Fastlane","Fullsend","Flatout","Lightsout","Redline","Revved",
    "Highspeed","Topgear","Overdrive","Aero","Monza","Spa","Suzuka","Silverstone","Imola","Interlagos"
  ];
  const nouns = [
    "Racer","Driver","Steward","Marshal","Chaser","Hunter","Kicker","Breaker","Master","Legend",
    "Pilot","Ace","Rocket","Falcon","Wolf","Hawk","Tiger","Panther","Cobra","Viper",
    "Eagle","Lion","Fox","Badger","Otter","Panda","Bear","Shark","Dolphin","Dragon",
    "Phoenix","Comet","Meteor","Orbit","Nova","Star","Knight","Ranger","Rebel","Bandit",
    "Shadow","Ghost","Spectre","Wizard","Ninja","Samurai","Gladiator","Champion","Contender","Sprinter",
    "Overtaker","Defender","Poleman","Podium","Paddock","Pitstop","Wheelman","Gearhead","Engineer","Strategist",
    "Tactician","Analyst","Observer","Judge","Referee","Director","Captain","Chief","Boss","King",
    "Queen","Ace","Rocketman","Speedster","Drifter","Slider","Shifter","Piston","Turbo","Nitro",
    "Octane","Downforce","Slipstream","Chicane","Hairpin","Apex","Kerb","Grid","Flag","Marshal",
    "Safetycar","Trackstar","Racefox","Lapmaster","Fastlane","Redliner","Checkmate","Overdrive","Fullsend","Lightsout"
  ];
  const randomIndex = (max: number) => {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  };
  const adjective = adjectives[randomIndex(adjectives.length)].trim().slice(0, 6);
  const noun = nouns[randomIndex(nouns.length)].slice(0, 6);
  const suffix = randomIndex(36 ** 4).toString(36).padStart(4, "0");
  return `${adjective}${noun}${suffix}`;
}
