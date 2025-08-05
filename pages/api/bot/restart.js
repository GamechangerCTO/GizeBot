// Restart Bot Commands API Endpoint
// Safely restarts the Telegram bot polling system

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
    console.log('🔄 API request to restart bot commands...');

    const { reason = 'Manual restart requested' } = req.body;

    // Import the bot commands system
    const GizeBotCommands = require('../../../lib/bot-commands.js');
    
    // Create instance for restart
    const botCommands = new GizeBotCommands();
    
    let wasActive = false;
    let stopResult = null;
    let startResult = null;

    try {
      // Step 1: Stop existing bot if running
      if (botCommands.bot && botCommands.isPollingActive) {
        console.log('🛑 Stopping existing bot polling...');
        await botCommands.bot.stopPolling();
        botCommands.isPollingActive = false;
        wasActive = true;
        stopResult = 'Stopped successfully';
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        stopResult = 'Was not active';
      }

      // Step 2: Start bot commands fresh
      console.log('🚀 Starting bot commands...');
      const startSuccess = await botCommands.startBotCommands();
      
      if (startSuccess) {
        startResult = 'Started successfully';
        
        // Notify admins about restart
        await botCommands.notifyAdmins('🔄 **BOT RESTARTED**', `✅ Bot commands have been restarted\n🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n📝 Reason: ${reason}\n🔄 Previous state: ${wasActive ? 'Active' : 'Inactive'}`);
        
        return res.status(200).json({
          success: true,
          message: 'Bot commands restarted successfully',
          timestamp: new Date().toISOString(),
          reason: reason,
          data: {
            wasActive: wasActive,
            stopResult: stopResult,
            startResult: startResult,
            restartedAt: new Date().toISOString(),
            isNowRunning: true
          }
        });
      } else {
        throw new Error('Failed to start bot commands after stop');
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
          stopResult: stopResult,
          startResult: startResult || 'Failed'
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