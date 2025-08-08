// Manual Summary API - Generates and optionally posts a daily summary

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    const FootballAPI = require('../../../lib/football-api.js');
    const TelegramManager = require('../../../lib/telegram.js');
    const { getDailySchedule } = require('../../../lib/storage');
    const { acquireLock, releaseLock } = require('../../../lib/lock');
    const { isCooldownActive, markCooldown } = require('../../../lib/cooldown');

    const dryRun = Boolean(
      (req.query && (req.query.dryRun === '1' || req.query.dryRun === 'true')) ||
      (req.body && (req.body.dryRun === true || req.body.dryRun === 'true' || req.body.dryRun === 1))
    );

    // Cooldown + lock to avoid flooding
    const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
    const cdKey = 'summary-global';
    if (await isCooldownActive(cdKey, COOLDOWN_MS)) {
      return res.status(429).json({ success: false, message: 'Summary cooldown active. Try again later.' });
    }

    const lock = await acquireLock('summary-run', 2 * 60 * 1000);
    if (!lock.acquired) {
      return res.status(423).json({ success: false, message: 'Summary is already running. Please wait.' });
    }

    const footballAPI = new FootballAPI();
    const telegram = new TelegramManager();

    // Data sources
    // First try popular leagues, if empty then ALL leagues (real data only)
    let yesterdayResults = await footballAPI.getYesterdayResults();
    if (!yesterdayResults || yesterdayResults.length === 0) {
      console.log('⚠️ No results from popular leagues, loading ALL yesterday results...');
      yesterdayResults = await footballAPI.getAllYesterdayResults();
    }
    const cached = await getDailySchedule();
    const todayMatches = cached?.matches || [];

    // Build concise summary content in English
    const etTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });
    const lines = [];
    lines.push('📋 DAILY SUMMARY');
    lines.push('────────────────────');
    lines.push(`🕒 Time (ET): ${etTime}`);
    lines.push('');
    lines.push(`✅ Yesterday Results: ${yesterdayResults.length}`);
    if (yesterdayResults.length > 0) {
      const topRes = yesterdayResults.slice(0, 3).map(r => {
        const home = r.homeTeam?.name || r.homeTeam;
        const away = r.awayTeam?.name || r.awayTeam;
        const score = r.score || r.fullTimeScore || r.result || '';
        const league = r.competition?.name || r.league?.name || '';
        return `• ${home} ${score} ${away}${league ? ` (${league})` : ''}`;
      });
      lines.push(...topRes);
      if (yesterdayResults.length > 3) lines.push(`… and ${yesterdayResults.length - 3} more`);
    }
    lines.push('');
    lines.push(`📅 Today Matches: ${todayMatches.length}`);
    if (todayMatches.length > 0) {
      const topMx = todayMatches.slice(0, 3).map(m => {
        const home = m.homeTeam?.name || m.homeTeam;
        const away = m.awayTeam?.name || m.awayTeam;
        const league = m.competition?.name || m.league?.name || '';
        const t = m.kickoffTime ? new Date(m.kickoffTime).toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour: '2-digit', minute: '2-digit' }) : '';
        return `• ${home} vs ${away}${league ? ` (${league})` : ''}${t ? ` — ${t} ET` : ''}`;
      });
      lines.push(...topMx);
      if (todayMatches.length > 3) lines.push(`… and ${todayMatches.length - 3} more`);
    }
    lines.push('');
    lines.push('🔗 Visit: https://gizebets.et/');

    const content = lines.join('\n');

    if (dryRun) {
      await releaseLock('summary-run');
      return res.json({
        success: true,
        dryRun: true,
        message: 'Summary generated (not sent)',
        preview: content,
        yesterdayCount: yesterdayResults.length,
        todayCount: todayMatches.length,
        timestamp: new Date().toISOString(),
        ethiopianTime: etTime
      });
    }

    const message = await telegram.sendSummary(content);
    await markCooldown(cdKey);
    await releaseLock('summary-run');

    return res.json({
      success: true,
      message: 'Summary sent successfully',
      messageId: message?.message_id || null,
      yesterdayCount: yesterdayResults.length,
      todayCount: todayMatches.length,
      timestamp: new Date().toISOString(),
      ethiopianTime: etTime
    });

  } catch (error) {
    try { const { releaseLock } = require('../../../lib/lock'); await releaseLock('summary-run'); } catch (_) {}
    console.error('❌ Summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send summary', error: error.message });
  }
}

