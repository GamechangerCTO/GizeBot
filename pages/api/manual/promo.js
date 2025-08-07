// Manual Promo API - Simple version

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const TelegramManager = require('../../../lib/telegram');
    const telegram = new TelegramManager();

    // Send promo using existing system
    const result = await telegram.executePromoCommand('football');

    res.json({
      success: true,
      message: 'Promotional message sent successfully to @gizebetgames',
      result: {
        messageId: result?.message_id || null,
        promoType: 'football'
      },
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }),
      channelInfo: {
        channelId: '@gizebetgames',
        contentType: 'promo',
        language: 'English'
      }
    });

  } catch (error) {
    console.error('❌ Promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send promotional message',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}