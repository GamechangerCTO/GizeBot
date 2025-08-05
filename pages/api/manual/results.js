// API Endpoint for manual Daily Results
// POST /api/manual/results - Send yesterday's results immediately

import { scheduler } from '../start';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

    // 🔐 Authentication check for production
    const authHeader = req.headers.authorization;
    const isInternalBot = req.headers['x-bot-internal'] === 'true';
    const expectedToken = `Bearer ${process.env.TELEGRAM_BOT_TOKEN}`;
    
    if (!isInternalBot || !authHeader || authHeader !== expectedToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Bot authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (!scheduler) {
      return res.status(400).json({
        success: false,
        message: 'System not initialized. Please start the system first.',
        startEndpoint: '/api/start'
      });
    }

    console.log('📊 Manual results requested');
    
    // Execute manual results
    const result = await scheduler.executeManualResults();
    
    res.status(200).json({
      success: true,
      message: 'Daily Results sent successfully to @gizebetgames',
      result: result,
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa'
      }),
      channelInfo: {
        channelId: process.env.CHANNEL_ID || '@gizebetgames',
        messageId: result.messageId,
        contentType: 'results',
        language: 'Amharic'
      }
    });

  } catch (error) {
    console.error('❌ Error in manual results:', error);
    
    const errorResponse = {
      success: false,
      message: 'Failed to send daily results',
      error: error.message,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        possibleCauses: [
          'No finished matches from yesterday',
          'Football API connection issue',
          'Telegram bot token invalid',
          'Channel permissions insufficient',
          'OpenAI API rate limit'
        ],
        solutions: [
          'Check if there were matches yesterday',
          'Verify FOOTBALL_API_KEY environment variable',
          'Verify TELEGRAM_BOT_TOKEN environment variable', 
          'Ensure bot is admin in @gizebetgames channel',
          'Check OpenAI API quota and billing'
        ]
      }
    };

    // Return appropriate status code based on error type
    if (error.message.includes('No results')) {
      res.status(404).json(errorResponse);
    } else if (error.message.includes('token') || error.message.includes('unauthorized')) {
      res.status(401).json(errorResponse);
    } else {
      res.status(500).json(errorResponse);
    }
  }
}