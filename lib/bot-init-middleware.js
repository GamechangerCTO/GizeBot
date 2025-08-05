// 🚀 Bot Initialization Middleware - Ensures bot is always running
// This middleware auto-starts the bot on any API request
const persistentBot = require('./bot-persistent');

// Global state to track initialization
global.botInitState = global.botInitState || {
  isInitialized: false,
  isInitializing: false,
  lastInitAttempt: 0,
  initPromise: null
};

/**
 * 🔧 Middleware to ensure bot is running before any operation
 */
async function ensureBotRunning() {
  const now = Date.now();
  
  // If already initialized and healthy, return quickly
  if (global.botInitState.isInitialized) {
    const status = persistentBot.getStatus();
    if (status.isRunning) {
      return true;
    }
    // If status shows not running, mark as uninitialized to restart
    global.botInitState.isInitialized = false;
  }
  
  // Prevent concurrent initialization attempts
  if (global.botInitState.isInitializing) {
    // Wait for current initialization to complete
    if (global.botInitState.initPromise) {
      return await global.botInitState.initPromise;
    }
    return true;
  }
  
  // Rate limit initialization attempts (minimum 30 seconds between attempts)
  if (now - global.botInitState.lastInitAttempt < 30000) {
    console.log('⏳ Bot initialization rate limited, skipping...');
    return global.botInitState.isInitialized;
  }
  
  // Start initialization
  global.botInitState.isInitializing = true;
  global.botInitState.lastInitAttempt = now;
  
  console.log('🚀 Initializing bot via middleware...');
  
  // Create initialization promise
  global.botInitState.initPromise = performInitialization();
  
  try {
    const result = await global.botInitState.initPromise;
    global.botInitState.isInitialized = result;
    return result;
  } finally {
    global.botInitState.isInitializing = false;
    global.botInitState.initPromise = null;
  }
}

/**
 * 🔧 Perform the actual bot initialization
 */
async function performInitialization() {
  try {
    // Check current status
    const currentStatus = persistentBot.getStatus();
    
    if (currentStatus.isRunning) {
      console.log('✅ Bot already running via middleware check');
      return true;
    }
    
    // Start the persistent bot service
    console.log('🚀 Starting persistent bot service via middleware...');
    const startResult = await persistentBot.start();
    
    if (startResult) {
      console.log('✅ Bot initialized successfully via middleware');
      return true;
    } else {
      console.error('❌ Bot initialization failed via middleware');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error in bot initialization middleware:', error);
    return false;
  }
}

/**
 * 🎯 Express middleware function
 */
function botInitMiddleware() {
  return async (req, res, next) => {
    try {
      // Skip initialization for health check endpoints to prevent loops
      if (req.url.includes('/health') || req.url.includes('/status')) {
        return next();
      }
      
      // Ensure bot is running
      await ensureBotRunning();
      
      // Continue to next middleware/handler
      next();
      
    } catch (error) {
      console.error('❌ Bot initialization middleware error:', error);
      // Don't block the request, just log the error
      next();
    }
  };
}

/**
 * 📊 Get initialization status
 */
function getInitStatus() {
  return {
    ...global.botInitState,
    botStatus: persistentBot.getStatus(),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  ensureBotRunning,
  botInitMiddleware,
  getInitStatus
};