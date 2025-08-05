// Telegram Webhook Handler
// Alternative to polling for production environments

const GizeBotCommands = require('../../../lib/bot-commands');

let botInstance = null;

export default async function handler(req, res) {
  // Only accept POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate webhook secret (optional security)
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Initialize bot if not exists (but don't start polling)
    if (!botInstance) {
      botInstance = new GizeBotCommands();
      
      // Configure admin users
      if (process.env.ADMIN_USER_IDS) {
        botInstance.adminUsers = process.env.ADMIN_USER_IDS
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
      }

      // Set up command handlers without polling
      await botInstance.setupBotCommands();
      botInstance.setupSendPromoCommand();
      botInstance.setupSendBonusCommand();
      botInstance.setupPredictionsCommand();
      botInstance.setupResultsCommand();
      botInstance.setupStatusCommand();
      botInstance.setupHelpCommand();
      botInstance.setupStopCommand();
      botInstance.setupRestartCommand();
      botInstance.setupErrorHandler();
      
      console.log('✅ Bot webhook handler initialized');
    }

    // Process the update
    const update = req.body;
    await botInstance.bot.processUpdate(update);

    // Acknowledge receipt
    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}