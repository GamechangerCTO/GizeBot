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

    const footballAPI = new FootballAPI();
    const contentGenerator = new ContentGenerator();
    const telegram = new TelegramManager();

    // Get today's matches
    const matches = await footballAPI.getTodayMatches();
    
    if (matches.length === 0) {
      return res.json({
        success: false,
        message: 'No matches found for predictions',
        matchCount: 0
      });
    }

    // Generate and send predictions (using generateTop5Predictions)
    const predictions = await contentGenerator.generateTop5Predictions(matches);
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