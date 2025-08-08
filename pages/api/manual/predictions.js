// Manual Predictions API - Simple version

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const FootballAPI = require('../../../lib/football-api.js');
    const ContentGenerator = require('../../../lib/content-generator.js');
    const TelegramManager = require('../../../lib/telegram.js');

    // Support dry-run mode to avoid sending to Telegram
    // Accept from query (?dryRun=1) or JSON body { dryRun: true }
    const dryRun = Boolean(
      (req.query && (req.query.dryRun === '1' || req.query.dryRun === 'true')) ||
      (req.body && (req.body.dryRun === true || req.body.dryRun === 'true' || req.body.dryRun === 1))
    );

    const footballAPI = new FootballAPI();
    const { getDailySchedule } = require('../../../lib/storage');
    const contentGenerator = new ContentGenerator();
    const telegram = new TelegramManager();

    // Source selection: default popular leagues; allow bypass filters
    let matches;
    const bypassFilters = req.query.bypassFilters === '1' || req.query.source === 'all';

    // Try cached daily schedule first
    const cached = await getDailySchedule();
    if (cached?.matches?.length) {
      matches = cached.matches;
    } else if (bypassFilters) {
      matches = await footballAPI.getAllTodayMatchesRanked();
    } else {
      matches = await footballAPI.getTodayMatches();
    }
    
    if (matches.length === 0) {
      return res.json({
        success: false,
        message: 'No matches found for predictions',
        matchCount: 0
      });
    }

    // Generate predictions (using generateTop5Predictions)
    const predictions = await contentGenerator.generateTop5Predictions(matches);

    // If dry-run, do NOT send to Telegram – just return the generated content
    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        message: `Predictions generated for ${matches.length} matches (not sent)`,
        preview: {
          items: Array.isArray(predictions) ? predictions.slice(0, 5) : [predictions],
          totalItems: Array.isArray(predictions) ? predictions.length : 1
        },
        matchCount: matches.length,
        timestamp: new Date().toISOString(),
        ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
      });
    }

    // Otherwise send to Telegram
    const result = await telegram.sendPredictions(predictions, matches);

    res.json({
      success: true,
      message: `Predictions sent successfully for ${matches.length} matches`,
      result: {
        messageId: result?.message_id || null,
        matchCount: matches.length
      },
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }),
      channelInfo: {
        channelId: '@gizebetgames',
        contentType: 'predictions',
        language: 'English'
      }
    });

  } catch (error) {
    console.error('❌ Predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send predictions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}