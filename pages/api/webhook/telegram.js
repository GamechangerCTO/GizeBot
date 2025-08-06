// 🌐 Telegram Webhook Handler for Vercel/Serverless
// Processes incoming updates from Telegram via webhook

const persistentBot = require('../../../lib/bot-persistent');

export default async function handler(req, res) {
  // Only accept POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🌐 Webhook received update');
    
    // Validate webhook secret (optional security)
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.log('❌ Webhook unauthorized - invalid secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get bot instance from persistent service
    const botInstance = persistentBot.getBotInstance();
    
    if (!botInstance) {
      console.log('⚠️ Bot not running, auto-starting...');
      await persistentBot.start();
      const newBotInstance = persistentBot.getBotInstance();
      
      if (!newBotInstance) {
        console.error('❌ Failed to start bot for webhook');
        return res.status(503).json({ error: 'Bot service unavailable' });
      }
    }

    // Process the update
    const update = req.body;
    console.log('🔄 Processing update:', { 
      updateId: update.update_id,
      hasMessage: !!update.message,
      hasCallbackQuery: !!update.callback_query 
    });
    
    const bot = persistentBot.getBotInstance();
    await bot.bot.processUpdate(update);

    console.log('✅ Webhook update processed successfully');
    
    // Acknowledge receipt (must respond within 10 seconds)
    res.status(200).json({ ok: true, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}