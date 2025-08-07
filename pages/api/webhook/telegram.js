// Telegram Webhook Handler - Connected to Simple Bot Commands

const SimpleBotCommands = require('../../../lib/simple-bot-commands');

// Keep a global instance to avoid recreating
let botInstance = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    console.log('📨 Telegram webhook received:', JSON.stringify(update, null, 2));

    // Initialize bot instance if needed
    if (!botInstance) {
      console.log('🤖 Initializing Simple Bot Commands for webhook...');
      botInstance = new SimpleBotCommands();
      // Set up webhook mode (no polling)
      botInstance.bot = require('node-telegram-bot-api')(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
      botInstance.setupCommands();
      console.log('✅ Bot commands initialized for webhook mode');
    }

    // Process different types of updates
    if (update.message) {
      console.log('💬 Processing message update...');
      // Simulate polling message event
      botInstance.bot.emit('message', update.message);
    }

    if (update.callback_query) {
      console.log('🔘 Processing callback query...');
      // Simulate polling callback_query event
      botInstance.bot.emit('callback_query', update.callback_query);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
      updateType: update.message ? 'message' : update.callback_query ? 'callback_query' : 'other'
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}