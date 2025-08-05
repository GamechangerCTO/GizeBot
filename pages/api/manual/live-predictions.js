// Manual Live Predictions API - Send predictions for currently live matches
// This endpoint generates and sends predictions for active/live matches

const { FootballAPI } = require('../../../lib/football-api.js');
const { ContentGenerator } = require('../../../lib/content-generator.js');
const { TelegramManager } = require('../../../lib/telegram.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  console.log('📺 Manual live predictions execution...');

  try {
    // Initialize services
    const footballAPI = new FootballAPI();
    const contentGenerator = new ContentGenerator();
    const telegramManager = new TelegramManager();

    // Get current live matches
    const liveMatches = await footballAPI.getLiveMatches();
    
    if (liveMatches.length === 0) {
      console.log('⚽ No live matches found for predictions');
      return res.status(200).json({
        success: true,
        message: 'No live matches found at the moment',
        messageCount: 0,
        liveMatches: 0
      });
    }

    console.log(`🔴 Found ${liveMatches.length} live matches for predictions`);

    // Take top 3 live matches for predictions
    const selectedMatches = liveMatches.slice(0, 3);
    
    // Generate live predictions content
    const predictions = await contentGenerator.generateLivePredictions(selectedMatches);

    // Send predictions to Telegram channel
    const telegramResult = await telegramManager.sendPredictions(predictions);

    console.log('✅ Live predictions sent successfully');

    res.status(200).json({
      success: true,
      message: `Live predictions sent successfully for ${selectedMatches.length} matches`,
      messageCount: Array.isArray(predictions) ? predictions.length : 1,
      liveMatches: selectedMatches.length,
      channelInfo: {
        channelId: telegramManager.channelId,
        contentType: 'live-predictions',
        language: 'English'
      },
      result: telegramResult,
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    });

  } catch (error) {
    console.error('❌ Error in live predictions:', error);
    res.status(500).json({
      error: 'Failed to send live predictions',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}