const axios = require('axios');

/**
 * 🚀 Auto-start utility for ensuring bot is always running
 * This ensures the bot starts automatically whenever needed
 */
class BotAutoStart {
  constructor() {
    this.isChecking = false;
    this.lastCheck = 0;
    this.checkInterval = 30000; // 30 seconds minimum between checks
  }

  /**
   * ⚡ Ensure bot is running, start if needed
   */
  async ensureBotRunning() {
    const now = Date.now();
    
    // Prevent too frequent checks
    if (this.isChecking || (now - this.lastCheck) < this.checkInterval) {
      return true;
    }

    this.isChecking = true;
    this.lastCheck = now;

    try {
      console.log('🔍 Checking if bot is running...');
      
      // Check if bot is running via internal API
      const baseUrl = this.getBaseUrl();
      
      // Try to get bot status
      try {
        const response = await axios.get(`${baseUrl}/api/bot/commands`, {
          timeout: 5000,
          headers: {
            'User-Agent': 'GizeBets-Internal-Check'
          }
        });
        
        if (response.data?.data?.isRunning) {
          console.log('✅ Bot is already running');
          return true;
        }
      } catch (statusError) {
        console.log('⚠️ Bot status check failed, will try to start...');
      }
      
      // Bot not running, try to start it
      console.log('🚀 Starting bot automatically...');
      const startResponse = await axios.post(`${baseUrl}/api/bot/commands`, {}, {
        timeout: 15000,
        headers: {
          'User-Agent': 'GizeBets-Auto-Start'
        }
      });
      
      if (startResponse.data?.success) {
        console.log('✅ Bot started successfully');
        return true;
      } else {
        console.error('❌ Failed to start bot:', startResponse.data);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error in bot auto-start:', error.message);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 🌐 Get base URL for API calls
   */
  getBaseUrl() {
    let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';
    if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    return baseUrl;
  }

  /**
   * 🔄 Middleware function to ensure bot is running before API operations
   */
  async withBotRunning(operation) {
    await this.ensureBotRunning();
    return operation();
  }
}

// Export singleton instance
module.exports = new BotAutoStart();