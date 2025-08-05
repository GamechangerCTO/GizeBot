// 🚀 Persistent Bot Service - Ensures bot runs 24/7 without web panel dependency
// This service maintains bot connection independently of web requests
const GizeBotCommands = require('./bot-commands');
const BotInstanceManager = require('./bot-instance-manager');

class PersistentBotService {
  constructor() {
    this.botInstance = null;
    this.isRunning = false;
    this.startTime = null;
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.healthCheckFrequency = 2 * 60 * 1000; // 2 minutes
    this.instanceManager = new BotInstanceManager();
    this.lastRestartTime = 0; // Track last restart for cooldown
    
    // Bind methods to preserve context
    this.healthCheck = this.healthCheck.bind(this);
    this.gracefulShutdown = this.gracefulShutdown.bind(this);
    
    // Register shutdown handlers
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('SIGINT', this.gracefulShutdown);
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught exception in bot service:', error);
      this.restart();
    });
  }

  /**
   * 🚀 Start persistent bot service
   */
  async start() {
    // 🔒 Acquire exclusive lock to prevent multiple instances
    const canStart = await this.instanceManager.acquireStartLock();
    if (!canStart) {
      console.log('✅ Bot is already running in another instance');
      return true;
    }

    if (this.isRunning) {
      console.log('✅ Persistent bot service already running in this instance');
      return true;
    }

    try {
      console.log('🚀 Starting persistent bot service...');
      
      // 🛡️ Ensure no other bot instances are running by stopping existing ones
      if (this.botInstance) {
        console.log('🔄 Stopping existing bot instance...');
        try {
          await this.botInstance.stop();
        } catch (stopError) {
          console.log('⚠️ Error stopping existing instance:', stopError.message);
        }
        this.botInstance = null;
      }
      
      // Add delay to prevent Telegram API conflicts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Initialize new bot instance
      this.botInstance = new GizeBotCommands();
      
      // Start bot polling with conflict prevention
      await this.botInstance.start();
      
      this.isRunning = true;
      this.startTime = new Date();
      this.reconnectAttempts = 0;
      
      // Mark as started in global state
      this.instanceManager.markAsStarted();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      console.log('✅ Persistent bot service started successfully');
      console.log(`🕐 Started at: ${this.startTime.toISOString()}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start persistent bot service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 🔄 Restart bot service (with cooldown to prevent loops)
   */
  async restart() {
    // Prevent restart loops - minimum 2 minutes between restarts
    const now = Date.now();
    const timeSinceLastRestart = now - (this.lastRestartTime || 0);
    const minRestartInterval = 2 * 60 * 1000; // 2 minutes
    
    if (timeSinceLastRestart < minRestartInterval) {
      console.log(`⏳ Restart cooldown active. Next restart allowed in ${Math.ceil((minRestartInterval - timeSinceLastRestart) / 1000)}s`);
      return false;
    }
    
    this.lastRestartTime = now;
    console.log('🔄 Restarting persistent bot service...');
    
    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay for cleanup
      await this.start();
      console.log('✅ Bot service restarted successfully');
      this.reconnectAttempts = 0; // Reset on success
      return true;
    } catch (error) {
      console.error('❌ Failed to restart bot service:', error);
      this.reconnectAttempts++;
      
      // Exponential backoff for restart attempts
      const backoffDelay = Math.min(30000 * Math.pow(2, this.reconnectAttempts - 1), 300000); // Max 5 minutes
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Scheduling restart attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${backoffDelay / 1000}s...`);
        setTimeout(() => this.restart(), backoffDelay);
      } else {
        console.error('🚨 Max reconnect attempts reached. Stopping automatic restarts. Manual intervention required.');
      }
      return false;
    }
  }

  /**
   * 🛑 Stop bot service
   */
  async stop() {
    if (!this.isRunning) {
      return true;
    }

    try {
      console.log('🛑 Stopping persistent bot service...');
      
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Stop bot instance
      if (this.botInstance) {
        await this.botInstance.stop();
        this.botInstance = null;
      }
      
      this.isRunning = false;
      
      // Mark as stopped in global state
      this.instanceManager.markAsStopped();
      
      console.log('✅ Persistent bot service stopped');
      
      return true;
      
    } catch (error) {
      console.error('❌ Error stopping bot service:', error);
      return false;
    }
  }

  /**
   * 🏥 Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(this.healthCheck, this.healthCheckFrequency);
    console.log(`🏥 Health monitoring started (every ${this.healthCheckFrequency / 1000}s)`);
  }

  /**
   * 🩺 Health check function (with intelligent restart logic)
   */
  async healthCheck() {
    try {
      if (!this.isRunning || !this.botInstance) {
        console.log('⚠️ Health check failed: Service not running');
        
        // Only auto-restart if not in cooldown and not too many recent restarts
        const canRestart = this.shouldAutoRestart();
        if (canRestart) {
          console.log('🔄 Auto-restarting due to service not running...');
          await this.restart();
        } else {
          console.log('⏸️ Auto-restart skipped (cooldown active or too many recent restarts)');
        }
        return;
      }

      // Check bot status
      const status = this.botInstance.getStatus();
      
      if (!status.isOnline) {
        console.log('⚠️ Health check failed: Bot offline');
        
        const canRestart = this.shouldAutoRestart();
        if (canRestart) {
          console.log('🔄 Auto-restarting due to bot offline...');
          await this.restart();
        } else {
          console.log('⏸️ Auto-restart skipped (cooldown active)');
        }
        return;
      }

      // Check for excessive errors
      if (status.consecutiveErrors > 15) { // Increased threshold to prevent unnecessary restarts
        console.log('⚠️ Health check failed: Too many consecutive errors');
        
        const canRestart = this.shouldAutoRestart();
        if (canRestart) {
          console.log('🔄 Auto-restarting due to excessive errors...');
          await this.restart();
        } else {
          console.log('⏸️ Auto-restart skipped (cooldown active)');
        }
        return;
      }

      // Log healthy status periodically (less verbose)
      const uptime = Date.now() - status.uptime;
      const uptimeMinutes = Math.floor(uptime / (1000 * 60));
      
      // Only log every 10 minutes to reduce noise
      if (uptimeMinutes % 10 === 0 || uptimeMinutes < 5) {
        console.log(`💚 Bot health check passed (uptime: ${uptimeMinutes} minutes, errors: ${status.consecutiveErrors})`);
      }
      
    } catch (error) {
      console.error('❌ Health check error:', error);
      
      // Only restart on critical errors if allowed
      const canRestart = this.shouldAutoRestart();
      if (canRestart && error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.log('🔄 Auto-restarting due to critical health check error...');
        await this.restart();
      } else {
        console.log('⏸️ Health check error - restart skipped');
      }
    }
  }

  /**
   * 🤔 Determine if auto-restart is allowed
   */
  shouldAutoRestart() {
    const now = Date.now();
    const timeSinceLastRestart = now - (this.lastRestartTime || 0);
    const minRestartInterval = 2 * 60 * 1000; // 2 minutes
    
    // Check restart cooldown
    if (timeSinceLastRestart < minRestartInterval) {
      return false;
    }
    
    // Check if too many restart attempts recently
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }
    
    return true;
  }

  /**
   * 🛡️ Graceful shutdown handler
   */
  async gracefulShutdown(signal) {
    console.log(`🛡️ Received ${signal}, performing graceful shutdown...`);
    
    try {
      await this.stop();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * 📊 Get service status
   */
  getStatus() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      reconnectAttempts: this.reconnectAttempts,
      botStatus: this.botInstance ? this.botInstance.getStatus() : null,
      healthCheckActive: !!this.healthCheckInterval,
      nextHealthCheck: this.healthCheckInterval ? new Date(Date.now() + this.healthCheckFrequency) : null
    };
  }

  /**
   * 🕐 Format uptime for display
   */
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * 🎯 Get bot instance for direct access
   */
  getBotInstance() {
    return this.botInstance;
  }
}

// Export singleton instance
module.exports = new PersistentBotService();