// Manual Live Results API - Post results for recently finished matches
// This endpoint fetches and posts results from matches that just finished

import { FootballAPI } from '../../../lib/football-api.js';
import { ContentGenerator } from '../../../lib/content-generator.js';
import { TelegramManager } from '../../../lib/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  console.log('⚡ Manual live results execution...');

  try {
    // Initialize services
    const footballAPI = new FootballAPI();
    const contentGenerator = new ContentGenerator();
    const telegramManager = new TelegramManager();

    // Get recent finished matches (last 2 hours)
    const recentResults = await footballAPI.getRecentResults();
    
    if (recentResults.length === 0) {
      console.log('📊 No recent results found');
      return res.status(200).json({
        success: true,
        message: 'No recent results found',
        resultCount: 0
      });
    }

    console.log(`⚡ Found ${recentResults.length} recent results`);

    // Generate results content
    const resultsContent = await contentGenerator.generateLiveResults(recentResults);

    // Send results to Telegram channel
    const telegramResult = await telegramManager.sendResults(resultsContent);

    console.log('✅ Live results posted successfully');

    res.status(200).json({
      success: true,
      message: `Live results posted for ${recentResults.length} matches`,
      resultCount: recentResults.length,
      channelInfo: {
        channelId: telegramManager.channelId,
        contentType: 'live-results',
        language: 'English'
      },
      result: telegramResult,
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    });

  } catch (error) {
    console.error('❌ Error in live results:', error);
    res.status(500).json({
      error: 'Failed to post live results',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}