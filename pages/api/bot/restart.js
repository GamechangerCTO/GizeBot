// Restart Bot Commands API Endpoint
// Safely restarts the Telegram bot using PersistentBotService

const persistentBot = require('../../../lib/bot-persistent');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Use POST to restart bot commands'
    });
  }

  try {
    console.log('🔄 API request to restart bot via PersistentBotService...');

    const { reason = 'Manual restart requested' } = req.body;

    // Get current status before restart
    const statusBefore = persistentBot.getStatus();
    const wasActive = statusBefore.isRunning;

    try {
      // Use PersistentBotService for safe restart (prevents duplicate instances)
      console.log('🔄 Restarting bot through PersistentBotService...');
      const restartSuccess = await persistentBot.restart();
      
      if (restartSuccess) {
        const statusAfter = persistentBot.getStatus();
        
        // Try to notify admins about restart if bot is running
        try {
          const botInstance = persistentBot.getBotInstance();
          if (botInstance && statusAfter.isRunning) {
            await botInstance.notifyAdmins('🔄 **BOT RESTARTED**', 
              `✅ Bot has been restarted safely\n🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n📝 Reason: ${reason}\n🔄 Previous state: ${wasActive ? 'Active' : 'Inactive'}`);
          }
        } catch (notifyError) {
          console.log('⚠️ Could not notify admins about restart:', notifyError.message);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Bot restarted successfully via PersistentBotService',
          timestamp: new Date().toISOString(),
          reason: reason,
          data: {
            wasActive: wasActive,
            restartSuccess: true,
            statusBefore: statusBefore,
            statusAfter: statusAfter,
            restartedAt: new Date().toISOString(),
            isNowRunning: statusAfter.isRunning,
            uptime: statusAfter.uptimeFormatted
          }
        });
      } else {
        throw new Error('PersistentBotService restart returned false (cooldown active or failed)');
      }

    } catch (restartError) {
      console.error('❌ Error during bot restart:', restartError);
      
      return res.status(500).json({
        success: false,
        error: 'Restart failed',
        message: 'Bot restart encountered issues',
        details: restartError.message,
        data: {
          wasActive: wasActive,
          statusBefore: statusBefore,
          restartAttempted: true
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error in bot restart endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to restart bot commands',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}