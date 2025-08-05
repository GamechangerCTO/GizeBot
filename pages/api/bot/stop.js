// Stop Bot Commands API Endpoint
// Safely stops the Telegram bot polling system

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Use POST to stop bot commands'
    });
  }

  try {
    console.log('🛑 API request to stop bot commands...');

    const { reason = 'Manual stop requested' } = req.body;

    // Import the bot commands system
    const GizeBotCommands = require('../../../lib/bot-commands.js');
    
    // Create instance and stop
    const botCommands = new GizeBotCommands();
    
    try {
      // Try to stop polling if it's active
      if (botCommands.bot && botCommands.isPollingActive) {
        await botCommands.bot.stopPolling();
        botCommands.isPollingActive = false;
        console.log('🛑 Bot polling stopped successfully');
        
        // Notify admins that bot was stopped
        await botCommands.notifyAdmins('🔴 **BOT STOPPED**', `⏹️ Bot commands have been stopped\n🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n📝 Reason: ${reason}`);
      } else {
        console.log('⚠️ Bot polling was not active');
      }

      return res.status(200).json({
        success: true,
        message: 'Bot commands stopped successfully',
        timestamp: new Date().toISOString(),
        reason: reason,
        data: {
          wasActive: botCommands.isPollingActive,
          stoppedAt: new Date().toISOString()
        }
      });

    } catch (stopError) {
      console.error('❌ Error stopping bot polling:', stopError);
      
      return res.status(200).json({
        success: true,
        message: 'Bot stop command executed (may not have been active)',
        warning: stopError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error in bot stop endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to stop bot commands',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}