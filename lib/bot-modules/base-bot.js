// 🔧 Base Bot Class - Core functionality and authentication
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const TelegramWebhookManager = require('../telegram-webhook-manager');

class BaseBotCommands {
  constructor() {
    // Check if token exists
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('❌ TELEGRAM_BOT_TOKEN environment variable is not set');
    }
    
    console.log('🔧 Base Bot constructor - Token exists:', !!process.env.TELEGRAM_BOT_TOKEN);
    
    // 🌐 Choose connection method based on environment
    const useWebhook = process.env.USE_WEBHOOK === 'true' || process.env.VERCEL === '1';
    
    if (useWebhook) {
      // Webhook mode for Vercel/Serverless
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
      console.log('🌐 Bot initialized in WEBHOOK mode (Vercel/Serverless)');
    } else {
      // Polling mode for persistent servers
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
      console.log('🌐 Bot initialized in POLLING mode (Persistent Server)');
    }
    
    this.useWebhook = useWebhook;
    this.channelId = process.env.CHANNEL_ID;
    
    // Initialize webhook manager for cleaning up conflicts
    this.webhookManager = new TelegramWebhookManager(process.env.TELEGRAM_BOT_TOKEN);
    
    // Admin User IDs
    this.adminUsers = [
      2024477887, // Test admin user
      // Add more admin user IDs here (get your ID from @userinfobot)
    ];
    
    // System status tracking
    this.systemStatus = {
      isOnline: false,
      lastApiSuccess: null,
      lastApiError: null,
      consecutiveErrors: 0,
      uptime: Date.now()
    };
    
    // 🌐 Determine base URL for API calls (internal)
    // For deployment issues, use a fixed production URL temporarily
    if (process.env.NODE_ENV === 'development') {
      this.baseUrl = 'http://localhost:3000';
    } else {
      // Use the primary domain for production to avoid deployment mismatch
      this.baseUrl = 'https://gize-bot.vercel.app';
    }
    
    console.log('🌐 Bot commands baseUrl:', this.baseUrl, '| NODE_ENV:', process.env.NODE_ENV);
    
    // Track if polling is active
    this.isPollingActive = false;
    
    // Bot stability features
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // 📊 Production monitoring and metrics
    this.metrics = {
      startTime: Date.now(),
      messagesProcessed: 0,
      errorsCount: 0,
      restartCount: 0,
      lastError: null,
      healthChecks: 0,
      callbacksProcessed: 0,
      apiCallsSuccess: 0,
      apiCallsFailure: 0
    };
    
    // Setup heartbeat monitor
    this.setupHeartbeat();
    
    // Configure axios defaults
    axios.defaults.timeout = 8000;
    axios.defaults.headers.common['User-Agent'] = 'GizeBets-Bot/1.0';
    this.setupAxiosInterceptors();
  }

  // 🛡️ Admin verification middleware
  isAdmin(userId) {
    return this.adminUsers.includes(userId);
  }

  // 🔒 Check if user is authorized for admin commands
  checkAdminAccess(msg) {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    
    if (!this.isAdmin(userId)) {
      console.log(`🚫 Unauthorized access attempt by ${username} (ID: ${userId})`);
      this.bot.sendMessage(msg.chat.id, '🚫 Access denied. This command is for administrators only.');
      return false;
    }
    
    console.log(`✅ Admin access granted to ${username} (ID: ${userId})`);
    return true;
  }

  // 📊 API call helper with authentication
  async makeApiCall(endpoint, data = {}, options = {}) {
    const requestConfig = {
      headers: {
        'Authorization': `Bearer ${process.env.TELEGRAM_BOT_TOKEN}`,
        'x-bot-internal': 'true',
        'x-debug-skip-auth': 'true',
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000,
      maxRetries: 3,
      ...options
    };

    if (options.method === 'GET') {
      return await axios.get(`${this.baseUrl}${endpoint}`, requestConfig);
    } else {
      return await axios.post(`${this.baseUrl}${endpoint}`, data, requestConfig);
    }
  }

  // 💓 Setup heartbeat monitoring
  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.lastHeartbeat = Date.now();
      this.updateSystemStatus('Heartbeat', true);
    }, 60000); // Every minute
  }

  // 📈 Update system status
  async updateSystemStatus(component, success, error = null) {
    if (success) {
      this.systemStatus.lastApiSuccess = Date.now();
      this.systemStatus.consecutiveErrors = 0;
      this.systemStatus.isOnline = true;
      this.metrics.apiCallsSuccess++;
    } else {
      this.systemStatus.lastApiError = Date.now();
      this.systemStatus.consecutiveErrors++;
      this.metrics.apiCallsFailure++;
      this.metrics.lastError = error;
      
      if (this.systemStatus.consecutiveErrors > 10) {
        this.systemStatus.isOnline = false;
      }
    }
  }

  // 🔧 Setup axios interceptors for error handling
  setupAxiosInterceptors() {
    axios.interceptors.response.use(
      (response) => {
        this.updateSystemStatus('API', true);
        return response;
      },
      (error) => {
        this.updateSystemStatus('API', false, error.message);
        return Promise.reject(error);
      }
    );
  }

  // 📊 Get system status
  getStatus() {
    const uptime = Date.now() - this.systemStatus.uptime;
    return {
      ...this.systemStatus,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      metrics: this.metrics,
      isPollingActive: this.isPollingActive
    };
  }

  // 🕐 Format uptime for display
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

  // 📢 Notify admins about important events
  async notifyAdmins(title, message) {
    for (const adminId of this.adminUsers) {
      try {
        await this.bot.sendMessage(adminId, `${title}\n\n${message}`, { parse_mode: 'Markdown' });
      } catch (error) {
        console.log(`⚠️ Failed to notify admin ${adminId}:`, error.message);
      }
    }
  }

  // 🛑 Stop the bot
  async stop() {
    try {
      console.log('🛑 Stopping bot...');
      
      // Stop heartbeat monitor
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        console.log('💔 Heartbeat monitor stopped');
      }
      
      // Stop polling
      if (this.bot && this.isPollingActive) {
        await this.bot.stopPolling();
        this.isPollingActive = false;
        console.log('🛑 Bot polling stopped');
      }
      
      // Update system status
      this.systemStatus.isOnline = false;
      
      return true;
    } catch (error) {
      console.error('❌ Error stopping bot:', error);
      // Force reset the flag even if stop fails
      this.isPollingActive = false;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      return false;
    }
  }
}

module.exports = BaseBotCommands;