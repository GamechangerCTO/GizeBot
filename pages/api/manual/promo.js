// API Endpoint for manual Promo Messages
// POST /api/manual/promo - Send promotional message immediately
// Supports /sendpromo command functionality

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

    // Get promo type from request body
    const { promoType = 'football', customCode, customOffer } = req.body;

    console.log(`🎁 Manual promo requested: ${promoType}`);
    
    let result;
    
    if (customCode && customOffer) {
      // Custom promo with specific code and offer
      const customContent = await scheduler.contentGenerator.generatePromoMessage(customCode, customOffer);
      result = await scheduler.telegram.sendPromo(customContent, customCode);
    } else {
      // Pre-defined promo types
      result = await scheduler.executeManualPromo(promoType);
    }
    
    res.status(200).json({
      success: true,
      message: `Promotional message (${promoType}) sent successfully to @gizebetgames`,
      result: {
        messageId: result.message_id,
        promoType: promoType,
        customCode: customCode || null,
        customOffer: customOffer || null
      },
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa'
      }),
      channelInfo: {
        channelId: process.env.CHANNEL_ID || '@gizebetgames',
        messageId: result.message_id,
        contentType: 'promo',
        language: 'Amharic'
      },
      availablePromoTypes: [
        'football',
        'casino',
        'sports',
        'special'
      ]
    });

  } catch (error) {
    console.error('❌ Error in manual promo:', error);
    
    const errorResponse = {
      success: false,
      message: 'Failed to send promotional message',
      error: error.message,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        possibleCauses: [
          'Invalid promo type',
          'Telegram bot token invalid',
          'Channel permissions insufficient',
          'OpenAI API rate limit',
          'Missing required parameters'
        ],
        solutions: [
          'Use valid promo types: football, casino, sports, special',
          'Verify TELEGRAM_BOT_TOKEN environment variable',
          'Ensure bot is admin in @gizebetgames channel',
          'Check OpenAI API quota and billing',
          'Provide promoType in request body'
        ]
      },
      requestExample: {
        url: '/api/manual/promo',
        method: 'POST',
        body: {
          promoType: 'football'
        }
      },
      customPromoExample: {
        url: '/api/manual/promo',
        method: 'POST',
        body: {
          customCode: 'CUSTOM100',
          customOffer: '100% ልዩ ቦናስ'
        }
      }
    };

    // Return appropriate status code based on error type
    if (error.message.includes('token') || error.message.includes('unauthorized')) {
      res.status(401).json(errorResponse);
    } else if (error.message.includes('Invalid') || error.message.includes('required')) {
      res.status(400).json(errorResponse);
    } else {
      res.status(500).json(errorResponse);
    }
  }
}