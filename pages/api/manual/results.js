// Manual Results API - Simple version

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

    // Get yesterday's results
    const results = await footballAPI.getYesterdayResults();
    
    if (results.length === 0) {
      return res.json({
        success: false,
        message: 'No results found',
        resultCount: 0
      });
    }

    // Generate and send results (using generateLiveResults)
    const resultsContent = await contentGenerator.generateLiveResults(results);
    const result = await telegram.sendResults(resultsContent, results);

    res.json({
      success: true,
      message: `Results sent successfully for ${results.length} matches`,
      result: {
        messageId: result?.message_id || null,
        resultCount: results.length
      },
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }),
      channelInfo: {
        channelId: '@gizebetgames',
        contentType: 'results',
        language: 'English'
      }
    });

  } catch (error) {
    console.error('❌ Results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send results',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}