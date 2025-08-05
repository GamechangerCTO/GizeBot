// Stop All Bot Instances API Endpoint
// Emergency stop to clear all bot instances and prevent conflicts

const persistentBot = require('../../../lib/bot-persistent');
const BotInstanceManager = require('../../../lib/bot-instance-manager');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Use POST to stop bot instances'
    });
  }

  try {
    console.log('🛑 API request to stop all bot instances...');

    const { reason = 'Manual stop requested', force = false } = req.body;

    // Get current status before stopping
    const statusBefore = persistentBot.getStatus();
    const instanceManager = new BotInstanceManager();
    const instanceState = instanceManager.getState();

    let stopResults = {
      persistentBot: null,
      forceStop: null,
      wasRunning: statusBefore.isRunning,
      instancesBefore: instanceState
    };

    try {
      // Step 1: Stop PersistentBotService
      console.log('🛑 Stopping PersistentBotService...');
      const stopSuccess = await persistentBot.stop();
      stopResults.persistentBot = stopSuccess ? 'Stopped successfully' : 'Stop failed';

      // Step 2: Force stop all instances if requested or if normal stop failed
      if (force || !stopSuccess) {
        console.log('🔥 Force stopping all bot instances...');
        await instanceManager.forceStop();
        stopResults.forceStop = 'Force stop completed';
        
        // Additional cleanup - clear any polling conflicts
        try {
          // Clear webhook to prevent conflicts
          const TelegramBot = require('node-telegram-bot-api');
          if (process.env.TELEGRAM_BOT_TOKEN) {
            const tempBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
            await tempBot.deleteWebhook();
            console.log('🧹 Webhook cleared');
          }
        } catch (webhookError) {
          console.log('⚠️ Could not clear webhook:', webhookError.message);
        }
        
        // Wait for complete cleanup
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      const statusAfter = persistentBot.getStatus();
      const instanceStateAfter = instanceManager.getState();

      // Try to notify if there's still a running instance
      let notificationSent = false;
      try {
        const botInstance = persistentBot.getBotInstance();
        if (botInstance && statusAfter.isRunning) {
          await botInstance.notifyAdmins('🛑 **BOT STOPPED**', 
            `⛔ All bot instances have been stopped\n🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n📝 Reason: ${reason}\n🔄 Force stop: ${force ? 'Yes' : 'No'}`);
          notificationSent = true;
        }
      } catch (notifyError) {
        console.log('⚠️ Could not notify admins about stop:', notifyError.message);
      }

      return res.status(200).json({
        success: true,
        message: force ? 'All bot instances force stopped' : 'Bot stopped successfully',
        timestamp: new Date().toISOString(),
        reason: reason,
        data: {
          ...stopResults,
          statusBefore: statusBefore,
          statusAfter: statusAfter,
          instanceStateBefore: instanceState,
          instanceStateAfter: instanceStateAfter,
          stoppedAt: new Date().toISOString(),
          isNowRunning: statusAfter.isRunning,
          notificationSent: notificationSent,
          recommendations: statusAfter.isRunning ? [] : [
            'All instances stopped successfully',
            'Use /api/bot/restart to start fresh',
            'Check /api/bot/health for current status'
          ]
        }
      });

    } catch (stopError) {
      console.error('❌ Error during bot stop:', stopError);
      
      return res.status(500).json({
        success: false,
        error: 'Stop failed',
        message: 'Bot stop encountered issues',
        details: stopError.message,
        data: stopResults,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error in bot stop endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to stop bot instances',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}