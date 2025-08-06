// API endpoint to manage GizeBets Bot Commands
// Start/Stop bot command system and manage admin users

const GizeBotCommands = require('../../../lib/bot-commands');

let botCommands = null;
let isStarting = false; // Flag to prevent concurrent starts

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getBotStatus(req, res);
      
      case 'POST':
        return await startBot(req, res);
      
      case 'DELETE':
        return await stopBot(req, res);
      
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error) {
    console.error('❌ Error in bot commands API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// Get bot status
async function getBotStatus(req, res) {
  try {
    // Use PersistentBotService for status
    const persistentBot = require('../../../lib/bot-persistent');
    const status = persistentBot.getStatus();
    
    return res.status(200).json({
      success: true,
      message: 'Bot status retrieved from PersistentBotService',
      data: {
        isRunning: status.isRunning,
        source: 'PersistentBotService',
        uptime: status.uptimeFormatted,
        startedAt: status.startTime,
        healthCheck: status.healthCheckActive,
        reconnectAttempts: status.reconnectAttempts,
        commands: [
          '/sendpromo [category] - Send promotional message',
          '/sendbonus ALL "message" - Send bonus code to all users',
          '/predictions - Send match predictions manually', 
          '/results - Send match results',
          '/status - Get system status',
          '/help - Show available commands'
        ],
        adminUsers: process.env.ADMIN_USER_IDS ? 
          process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : []
      }
    });
  } catch (error) {
    console.error('❌ Error getting bot status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get bot status',
      error: error.message
    });
  }
}

// Start bot commands system
async function startBot(req, res) {
  try {
    // ⚠️ This endpoint is deprecated - use PersistentBotService instead
    console.log('⚠️ /api/bot/commands is deprecated, redirecting to PersistentBotService...');
    
    const persistentBot = require('../../../lib/bot-persistent');
    const status = persistentBot.getStatus();
    
    if (status.isRunning) {
      return res.status(200).json({
        success: true,
        message: 'Bot commands are already running via PersistentBotService',
        data: {
          isRunning: true,
          source: 'PersistentBotService',
          uptime: status.uptimeFormatted,
          startedAt: status.startTime
        }
      });
    }

    // Start via PersistentBotService
    console.log('🚀 Starting bot via PersistentBotService...');
    const started = await persistentBot.start();
    
    if (started) {
      console.log('✅ Bot started successfully via PersistentBotService');
      const finalStatus = persistentBot.getStatus();
      
      return res.status(200).json({
        success: true,
        message: 'Bot commands started successfully via PersistentBotService',
        data: {
          isRunning: finalStatus.isRunning,
          source: 'PersistentBotService',
          startedAt: finalStatus.startTime,
          uptime: finalStatus.uptimeFormatted,
          healthCheck: finalStatus.healthCheckActive
        }
      });
    } else {
      console.error('❌ Bot start returned false - check previous error logs');
      isStarting = false;
      return res.status(500).json({
        success: false,
        message: 'Failed to start bot commands',
        error: 'Bot start() method returned false'
      });
    }

  } catch (error) {
    console.error('❌ Error starting bot commands:', error);
    botCommands = null;
    isStarting = false;
    
    return res.status(500).json({
      success: false,
      message: 'Failed to start bot commands',
      error: error.message
    });
  }
}

// Stop bot commands system
async function stopBot(req, res) {
  try {
    // Use PersistentBotService for stopping
    const persistentBot = require('../../../lib/bot-persistent');
    const status = persistentBot.getStatus();
    
    if (!status.isRunning) {
      return res.status(200).json({
        success: true,
        message: 'Bot commands are already stopped',
        data: { isRunning: false, source: 'PersistentBotService' }
      });
    }

    console.log('🛑 Stopping bot via PersistentBotService...');

    await persistentBot.stop();

    console.log('✅ Bot commands stopped successfully via PersistentBotService');

    return res.status(200).json({
      success: true,
      message: 'Bot commands stopped successfully via PersistentBotService',
      data: {
        isRunning: false,
        source: 'PersistentBotService',
        stoppedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error stopping bot via PersistentBotService:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to stop bot commands via PersistentBotService',
      error: error.message
    });
  }
}

// Export the bot instance for other modules
export { botCommands };