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
    const isRunning = botCommands !== null && botCommands.isPollingActive;
    
    return res.status(200).json({
      success: true,
      message: 'Bot status retrieved',
      data: {
        isRunning: isRunning,
        commands: [
          '/sendpromo [category] - Send promotional message',
          '/sendbonus ALL "message" - Send bonus code to all users',
          '/predictions - Send match predictions manually', 
          '/results - Send match results',
          '/status - Get system status',
          '/help - Show available commands'
        ],
        adminUsers: process.env.ADMIN_USER_IDS ? 
          process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : [],
        lastStarted: botCommands ? new Date().toISOString() : null
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
    // Prevent multiple concurrent starts
    if (isStarting) {
      return res.status(200).json({
        success: true,
        message: 'Bot commands are already starting, please wait...',
        data: { isRunning: false, isStarting: true }
      });
    }

    if (botCommands && botCommands.isPollingActive) {
      return res.status(200).json({
        success: true,
        message: 'Bot commands are already running',
        data: { isRunning: true }
      });
    }

    isStarting = true;
    console.log('🚀 Starting GizeBots Command System...');

    // Create new bot instance
    botCommands = new GizeBotCommands();
    
    // Configure admin users from environment
    if (process.env.ADMIN_USER_IDS) {
      botCommands.adminUsers = process.env.ADMIN_USER_IDS
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    }

    // Start the bot
    const started = await botCommands.start();

    if (started) {
      console.log('✅ Bot commands started successfully');
      isStarting = false;
      return res.status(200).json({
        success: true,
        message: 'Bot commands started successfully',
        data: {
          isRunning: true,
          adminUsers: botCommands.adminUsers,
          startedAt: new Date().toISOString(),
          heartbeatActive: !!(botCommands.heartbeatInterval),
          lastHeartbeat: botCommands.lastHeartbeat ? new Date(botCommands.lastHeartbeat).toISOString() : null,
          systemStatus: botCommands.systemStatus || {}
        }
      });
    } else {
      isStarting = false;
      return res.status(500).json({
        success: false,
        message: 'Failed to start bot commands'
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
    if (!botCommands) {
      return res.status(200).json({
        success: true,
        message: 'Bot commands are already stopped',
        data: { isRunning: false }
      });
    }

    console.log('🛑 Stopping GizeBots Command System...');

    await botCommands.stop();
    botCommands = null;

    console.log('✅ Bot commands stopped successfully');

    return res.status(200).json({
      success: true,
      message: 'Bot commands stopped successfully',
      data: {
        isRunning: false,
        stoppedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error stopping bot commands:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to stop bot commands',
      error: error.message
    });
  }
}

// Export the bot instance for other modules
export { botCommands };