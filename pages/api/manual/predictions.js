// API Endpoint for manual Top 5 Predictions
// POST /api/manual/predictions - Send predictions immediately

import { scheduler } from '../start';
const { ensureBotRunning } = require('../../../lib/bot-init-middleware');

export default async function handler(req, res) {
  try {
    // 🚀 Ensure bot is running independently of web panel
    await ensureBotRunning();
    
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

    console.log('🎯 Manual predictions requested');
    
    // Execute manual predictions
    const result = await scheduler.executeManualPredictions();
    
    res.status(200).json({
      success: true,
      message: 'Top 5 Predictions sent successfully to @gizebetgames',
      result: result,
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa'
      }),
      channelInfo: {
        channelId: process.env.CHANNEL_ID || '@gizebetgames',
        messageId: result.messageId,
        contentType: 'predictions',
        language: 'Amharic'
      }
    });

  } catch (error) {
    console.error('❌ Error in manual predictions:', error);
    
    const errorResponse = {
      success: false,
      message: 'Failed to send predictions',
      error: error.message,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        possibleCauses: [
          'No matches available today',
          'Football API connection issue',
          'Telegram bot token invalid',
          'Channel permissions insufficient',
          'OpenAI API rate limit'
        ],
        solutions: [
          'Check if there are scheduled matches today',
          'Verify FOOTBALL_API_KEY environment variable',
          'Verify TELEGRAM_BOT_TOKEN environment variable',
          'Ensure bot is admin in @gizebetgames channel',
          'Check OpenAI API quota and billing'
        ]
      }
    };

    // Return appropriate status code based on error type
    if (error.message.includes('No matches')) {
      res.status(404).json(errorResponse);
    } else if (error.message.includes('token') || error.message.includes('unauthorized')) {
      res.status(401).json(errorResponse);
    } else {
      res.status(500).json(errorResponse);
    }
  }
}