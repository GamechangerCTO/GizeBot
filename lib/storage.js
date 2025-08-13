// Simple storage abstraction with file-based persistence and in-memory rate limits
// Designed to be easily replaced with a real DB (e.g., Supabase) later

const fs = require('fs').promises;
const path = require('path');

const RATE_LIMIT_TTL_DEFAULT_SEC = 60;
const rateLimitMap = new Map(); // key -> expiresAt (ms)

function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

async function getSchedulePath() {
  const dir = path.join(process.cwd(), 'temp');
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  return path.join(dir, 'daily-schedule.json');
}

async function saveDailySchedule(schedule) {
  try {
    const file = await getSchedulePath();
    await fs.writeFile(file, JSON.stringify(schedule, null, 2));
    return true;
  } catch (err) {
    console.log('⚠️ saveDailySchedule error:', err.message);
    return false;
  }
}

async function getDailySchedule() {
  try {
    const file = await getSchedulePath();
    const raw = await fs.readFile(file, 'utf8');
    const data = JSON.parse(raw);
    if (data?.date === getTodayDateStr() && Array.isArray(data.matches)) {
      return data;
    }
    return null;
  } catch (err) {
    return null;
  }
}

function isRateLimitedSync(key) {
  const now = Date.now();
  const exp = rateLimitMap.get(key);
  if (exp && exp > now) return true;
  if (exp && exp <= now) rateLimitMap.delete(key);
  return false;
}

async function isRateLimited(key) {
  return isRateLimitedSync(key);
}

async function setRateLimit(key, ttlSec = RATE_LIMIT_TTL_DEFAULT_SEC) {
  const expiresAt = Date.now() + ttlSec * 1000;
  rateLimitMap.set(key, expiresAt);
}

// Merge today's tracked matches into the daily schedule (idempotent by fixtureId)
async function appendDailyMatches(matches) {
  try {
    const today = getTodayDateStr();
    const current = (await getDailySchedule()) || { date: today, matches: [] };
    const existing = Array.isArray(current.matches) ? current.matches : [];
    const byId = new Map();
    // seed existing
    for (const m of existing) {
      const key = m.fixtureId || m.id || `${m.homeTeam}__${m.awayTeam}`;
      byId.set(key, m);
    }
    // merge new
    for (const m of (matches || [])) {
      const key = m.fixtureId || m.id || `${m.homeTeam}__${m.awayTeam}`;
      if (!byId.has(key)) {
        byId.set(key, m);
      }
    }
    const merged = Array.from(byId.values());
    await saveDailySchedule({ date: today, matches: merged });
    return true;
  } catch (err) {
    console.log('⚠️ appendDailyMatches error:', err.message);
    return false;
  }
}

module.exports = {
  saveDailySchedule,
  getDailySchedule,
  isRateLimited,
  setRateLimit,
  getTodayDateStr,
  appendDailyMatches
};

