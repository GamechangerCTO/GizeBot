// 🚀 Persistent Bot Service API - Ensures bot runs independently of web panel
// This API maintains bot connection across all serverless functions
const persistentBot = require('../../../lib/bot-persistent');

// Global bot state (survives across function calls in serverless)
global.botServiceState = global.botServiceState || {
  initialized: false,
  startTime: null,
  lastActivity: null
};

export default async function handler(req, res) {
  try {
    const { method } = req;

    // 🔐 Security check for production
    const isInternal = req.headers['x-internal-service'] === 'true';
    const authToken = req.headers.authorization;
    
    if (!isInternal && method !== 'GET') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access to bot service'
      });
    }

    switch (method) {
      case 'GET':
        // Get bot service status
        const status = persistentBot.getStatus();
        
        // Auto-start if not running (for serverless compatibility)
        if (!status.isRunning && !global.botServiceState.initialized) {
          console.log('🚀 Auto-starting bot service for first request...');
          await persistentBot.start();
          global.botServiceState.initialized = true;
          global.botServiceState.startTime = new Date();
        }
        
        global.botServiceState.lastActivity = new Date();
        
        return res.status(200).json({
          success: true,
          message: 'Bot service status retrieved',
          status: persistentBot.getStatus(),
          globalState: global.botServiceState,
          timestamp: new Date().toISOString()
        });

      case 'POST':
        // Start persistent bot service
        console.log('🚀 Starting persistent bot service via API...');
        
        const startResult = await persistentBot.start();
        global.botServiceState.initialized = true;
        global.botServiceState.startTime = new Date();
        global.botServiceState.lastActivity = new Date();
        
        return res.status(200).json({
          success: startResult,
          message: startResult ? 'Persistent bot service started successfully' : 'Failed to start bot service',
          status: persistentBot.getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'PUT':
        // Restart bot service
        console.log('🔄 Restarting persistent bot service via API...');
        
        await persistentBot.restart();
        global.botServiceState.lastActivity = new Date();
        
        return res.status(200).json({
          success: true,
          message: 'Bot service restarted successfully',
          status: persistentBot.getStatus(),
          timestamp: new Date().toISOString()
        });

      case 'DELETE':
        // Stop bot service (for maintenance)
        console.log('🛑 Stopping persistent bot service via API...');
        
        const stopResult = await persistentBot.stop();
        global.botServiceState.initialized = false;
        
        return res.status(200).json({
          success: stopResult,
          message: stopResult ? 'Bot service stopped successfully' : 'Failed to stop bot service',
          timestamp: new Date().toISOString()
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('❌ Error in persistent bot service API:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error in bot service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// 🎯 Auto-initialize bot service on module load (for serverless)
// This ensures the bot starts as soon as any API is called
if (!global.botServiceState.initialized) {
  console.log('🔄 Auto-initializing bot service on module load...');
  
  // Use setTimeout to avoid blocking the response
  setTimeout(async () => {
    try {
      if (!global.botServiceState.initialized) {
        await persistentBot.start();
        global.botServiceState.initialized = true;
        global.botServiceState.startTime = new Date();
        console.log('✅ Bot service auto-initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to auto-initialize bot service:', error);
    }
  }, 1000); // 1 second delay to allow API response to complete
}