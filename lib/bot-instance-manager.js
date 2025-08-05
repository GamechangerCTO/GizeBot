// 🔒 Bot Instance Manager - Ensures only one bot instance runs globally
// This prevents 409 polling conflicts across all serverless functions

// Global state to track bot instance across all serverless invocations
global.botInstanceState = global.botInstanceState || {
  isRunning: false,
  startTime: null,
  instanceId: null,
  isStarting: false,
  startPromise: null
};

class BotInstanceManager {
  constructor() {
    this.instanceId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🔒 Acquire exclusive lock to start bot
   */
  async acquireStartLock() {
    // If already starting, wait for completion
    if (global.botInstanceState.isStarting && global.botInstanceState.startPromise) {
      console.log('⏳ Bot is already starting, waiting for completion...');
      try {
        return await global.botInstanceState.startPromise;
      } catch (error) {
        console.log('⚠️ Previous start attempt failed, proceeding with new attempt');
        global.botInstanceState.isStarting = false;
        global.botInstanceState.startPromise = null;
      }
    }

    // If already running by another instance, check if it's still active
    if (global.botInstanceState.isRunning && global.botInstanceState.instanceId !== this.instanceId) {
      const timeSinceStart = Date.now() - (global.botInstanceState.startTime || 0);
      
      // If the other instance started more than 5 minutes ago, assume it's stale
      if (timeSinceStart > 5 * 60 * 1000) {
        console.log('🔄 Found stale bot instance, taking over...');
        await this.forceStop();
      } else {
        console.log('✅ Another bot instance is already running, skipping start');
        return false;
      }
    }

    // Acquire the lock
    global.botInstanceState.isStarting = true;
    global.botInstanceState.instanceId = this.instanceId;
    
    console.log(`🔒 Acquired start lock for instance: ${this.instanceId}`);
    return true;
  }

  /**
   * 🚀 Mark bot as successfully started
   */
  markAsStarted() {
    global.botInstanceState.isRunning = true;
    global.botInstanceState.startTime = Date.now();
    global.botInstanceState.instanceId = this.instanceId;
    global.botInstanceState.isStarting = false;
    global.botInstanceState.startPromise = null;
    
    console.log(`✅ Bot instance ${this.instanceId} marked as started`);
  }

  /**
   * 🛑 Mark bot as stopped
   */
  markAsStopped() {
    if (global.botInstanceState.instanceId === this.instanceId) {
      global.botInstanceState.isRunning = false;
      global.botInstanceState.startTime = null;
      global.botInstanceState.instanceId = null;
      
      console.log(`🛑 Bot instance ${this.instanceId} marked as stopped`);
    }
  }

  /**
   * 🔥 Force stop all bot instances (for recovery)
   */
  async forceStop() {
    console.log('🔥 Force stopping all bot instances...');
    
    global.botInstanceState.isRunning = false;
    global.botInstanceState.startTime = null;
    global.botInstanceState.instanceId = null;
    global.botInstanceState.isStarting = false;
    global.botInstanceState.startPromise = null;
    
    // Give time for cleanup
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * 📊 Get current instance state
   */
  getState() {
    return {
      ...global.botInstanceState,
      currentInstanceId: this.instanceId,
      isCurrentInstance: global.botInstanceState.instanceId === this.instanceId,
      timeSinceStart: global.botInstanceState.startTime ? 
        Date.now() - global.botInstanceState.startTime : null
    };
  }

  /**
   * 🎯 Check if this is the active instance
   */
  isActiveInstance() {
    return global.botInstanceState.instanceId === this.instanceId && 
           global.botInstanceState.isRunning;
  }

  /**
   * ⏰ Update heartbeat for this instance
   */
  updateHeartbeat() {
    if (this.isActiveInstance()) {
      global.botInstanceState.lastHeartbeat = Date.now();
    }
  }
}

module.exports = BotInstanceManager;