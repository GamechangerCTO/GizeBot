// 🚀 Persistent Bot Service - Ensures bot runs 24/7 without web panel dependency
// This service maintains bot connection independently of web requests
const GizeBotCommands = require('./bot-commands');

class PersistentBotService {
  constructor() {
    this.botInstance = null;
    this.isRunning = false;
    this.startTime = null;
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.healthCheckFrequency = 2 * 60 * 1000; // 2 minutes
    
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
    if (this.isRunning) {
      console.log('✅ Persistent bot service already running');
      return true;
    }

    try {
      console.log('🚀 Starting persistent bot service...');
      
      // Initialize bot instance
      this.botInstance = new GizeBotCommands();
      
      // Start bot polling
      await this.botInstance.start();
      
      this.isRunning = true;
      this.startTime = new Date();
      this.reconnectAttempts = 0;
      
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
   * 🔄 Restart bot service
   */
  async restart() {
    console.log('🔄 Restarting persistent bot service...');
    
    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      await this.start();
      console.log('✅ Bot service restarted successfully');
    } catch (error) {
      console.error('❌ Failed to restart bot service:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Scheduling restart attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in 30 seconds...`);
        setTimeout(() => this.restart(), 30000);
      } else {
        console.error('🚨 Max reconnect attempts reached. Manual intervention required.');
      }
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
   * 🩺 Health check function
   */
  async healthCheck() {
    try {
      if (!this.isRunning || !this.botInstance) {
        console.log('⚠️ Health check failed: Service not running');
        await this.restart();
        return;
      }

      // Check bot status
      const status = this.botInstance.getStatus();
      
      if (!status.isOnline) {
        console.log('⚠️ Health check failed: Bot offline');
        await this.restart();
        return;
      }

      // Check for excessive errors
      if (status.consecutiveErrors > 10) {
        console.log('⚠️ Health check failed: Too many consecutive errors');
        await this.restart();
        return;
      }

      // Log healthy status periodically
      const uptime = Date.now() - status.uptime;
      const uptimeMinutes = Math.floor(uptime / (1000 * 60));
      console.log(`💚 Bot health check passed (uptime: ${uptimeMinutes} minutes)`);
      
    } catch (error) {
      console.error('❌ Health check error:', error);
      await this.restart();
    }
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