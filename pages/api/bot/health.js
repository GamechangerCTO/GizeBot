// 🏥 Bot Health Check API - Independent bot status monitoring
// This endpoint ensures bot is running and responds to commands instantly
const persistentBot = require('../../../lib/bot-persistent');

export default async function handler(req, res) {
  try {
    const { method } = req;

    if (method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        message: 'Method not allowed. Use GET.'
      });
    }

    // Get current bot status
    const status = persistentBot.getStatus();
    const botInstance = persistentBot.getBotInstance();
    
    // Detailed health information
    const healthInfo = {
      service: {
        isRunning: status.isRunning,
        uptime: status.uptimeFormatted,
        startTime: status.startTime,
        reconnectAttempts: status.reconnectAttempts,
        healthCheckActive: status.healthCheckActive,
        nextHealthCheck: status.nextHealthCheck
      },
      bot: status.botStatus || {
        isOnline: false,
        lastApiSuccess: null,
        lastApiError: null,
        consecutiveErrors: 0
      },
      telegram: {
        connected: !!botInstance,
        polling: botInstance ? botInstance.isPollingActive : false,
        commandsReady: !!botInstance
      },
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', { 
        timeZone: 'Africa/Addis_Ababa' 
      })
    };

    // Auto-start if not running
    if (!status.isRunning) {
      console.log('⚡ Bot not running, auto-starting...');
      try {
        await persistentBot.start();
        healthInfo.autoStarted = true;
        healthInfo.message = 'Bot was down, successfully auto-started';
      } catch (error) {
        console.error('❌ Auto-start failed:', error);
        healthInfo.autoStartFailed = true;
        healthInfo.error = error.message;
      }
    }

    // Determine overall health status
    const isHealthy = status.isRunning && 
                     (status.botStatus?.isOnline !== false) && 
                     (status.botStatus?.consecutiveErrors || 0) < 5;

    const responseCode = isHealthy ? 200 : 503;
    const healthStatus = isHealthy ? 'healthy' : 'unhealthy';

    return res.status(responseCode).json({
      success: isHealthy,
      health: healthStatus,
      message: isHealthy ? 
        'Bot is healthy and ready to respond instantly' : 
        'Bot is experiencing issues',
      ...healthInfo
    });

  } catch (error) {
    console.error('❌ Error in bot health check:', error);
    
    return res.status(500).json({
      success: false,
      health: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}