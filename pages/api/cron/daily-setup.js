// Daily setup cron - runs every morning at 6 AM
// Loads today's matches and prepares the dynamic schedule

const FootballAPI = require('../../../lib/football-api');
const fs = require('fs').promises;
const path = require('path');

let dailyMatches = null;

export default async function handler(req, res) {
  // Only allow GET requests from Vercel Cron
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is a legitimate cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🌅 Daily Setup: Loading today\'s matches...');
    
    const footballAPI = new FootballAPI();
    
    // Try to get enhanced matches with detailed team data
    let matches;
    try {
      matches = await footballAPI.getEnhancedTop5Matches();
      console.log('✅ Enhanced match data loaded');
    } catch (error) {
      console.log('⚠️ Enhanced data failed, using basic matches');
      matches = await footballAPI.getTodayMatches();
    }

    if (matches.length === 0) {
      console.log('⚠️ No matches found for today');
      return res.status(200).json({
        success: true,
        message: 'No matches found for today',
        matchCount: 0,
        ethiopianTime: new Date().toLocaleString("en-US", {timeZone: "Africa/Addis_Ababa"})
      });
    }

    // Store matches data for the day
    dailyMatches = matches;
    
    // Calculate optimal prediction times (2-4 hours before each match)
    const predictionTimes = matches.map(match => {
      const kickoffTime = new Date(match.kickoffTime);
      const predictionTime = new Date(kickoffTime.getTime() - (2.5 * 60 * 60 * 1000)); // 2.5 hours before
      
      return {
        matchId: match.id,
        homeTeam: match.homeTeam?.name || match.homeTeam,
        awayTeam: match.awayTeam?.name || match.awayTeam,
        kickoffTime: kickoffTime.toISOString(),
        predictionTime: predictionTime.toISOString(),
        league: match.competition?.name || match.competition
      };
    });

    // Save today's schedule to a file (for persistence)
    const scheduleData = {
      date: new Date().toISOString().split('T')[0],
      matches: matches,
      predictionTimes: predictionTimes,
      loadedAt: new Date().toISOString()
    };

    try {
      const scheduleDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(scheduleDir, { recursive: true });
      await fs.writeFile(
        path.join(scheduleDir, 'daily-schedule.json'),
        JSON.stringify(scheduleData, null, 2)
      );
      console.log('📝 Daily schedule saved to file');
    } catch (fileError) {
      console.log('⚠️ Could not save schedule file:', fileError.message);
    }

    console.log(`✅ Daily setup completed: ${matches.length} matches loaded`);

    res.status(200).json({
      success: true,
      message: 'Daily setup completed successfully',
      matchCount: matches.length,
      predictionTimes: predictionTimes,
      nextPrediction: predictionTimes.length > 0 ? predictionTimes[0] : null,
      hasEnhancedData: matches.length > 0 && matches[0].homeTeamData,
      ethiopianTime: new Date().toLocaleString("en-US", {timeZone: "Africa/Addis_Ababa"}),
      executedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Daily setup error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to execute daily setup',
      error: error.message,
      ethiopianTime: new Date().toLocaleString("en-US", {timeZone: "Africa/Addis_Ababa"}),
      executedAt: new Date().toISOString()
    });
  }
}

// Export matches for other endpoints
export { dailyMatches };