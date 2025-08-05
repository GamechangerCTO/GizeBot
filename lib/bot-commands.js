// Telegram Bot Commands Handler for GizeBets
// Implements official Telegram Bot API command standards
// Supports admin verification and proper error handling

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

class GizeBotCommands {
  constructor() {
    // Initialize bot with polling disabled (we'll enable it manually)
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    this.channelId = process.env.CHANNEL_ID;
    
    // Admin User IDs - Add your Telegram user ID here
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
    
    // Fix Vercel URL - add https:// if missing
    let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';
    if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    this.baseUrl = baseUrl;
    console.log('🌐 Bot commands baseUrl:', this.baseUrl);
    
    // Track if polling is active
    this.isPollingActive = false;
    
    // Bot stability features with circuit breaker
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 30000; // 30 seconds
    
    // Circuit breaker pattern to prevent restart loops
    this.restartCount = 0;
    this.maxRestarts = 3; // Max restarts per hour
    this.restartWindow = 3600000; // 1 hour in milliseconds
    this.lastRestartTime = 0;
    this.circuitBreakerOpen = false;

    // Setup heartbeat monitor
    this.setupHeartbeat();

    // Configure axios defaults for FAST responses in bot
    axios.defaults.timeout = 8000; // 8 seconds timeout (faster for bot interactions)
    axios.defaults.headers.common['User-Agent'] = 'GizeBets-Bot/1.0';
    
    // Add axios interceptors for better error handling
    this.setupAxiosInterceptors();
  }

  // 📝 Set bot commands using official Telegram API
  async setupBotCommands() {
    try {
      console.log('🤖 Setting up bot commands...');
      
      // Define commands according to Telegram Bot API standards
      const commands = [
        // Content Management
        {
          command: 'predictions',
          description: '⚽ Send match predictions manually'
        },
        {
          command: 'sendpromo',
          description: '🎁 Send promotional message'
        },
        {
          command: 'results',
          description: '📊 Send match results'
        },
        
        // Live Matches Management
        {
          command: 'active_matches',
          description: '🔴 Show current active matches'
        },
        {
          command: 'upcoming_matches',
          description: '⏰ Show upcoming matches (next 2-3 hours)'
        },
        {
          command: 'today_matches',
          description: '📅 Today\'s matches with content schedule'
        },
        {
          command: 'send_live',
          description: '📺 Send predictions for live matches'
        },
        {
          command: 'live_results',
          description: '⚡ Post live match results'
        },
        
        // Automation Control
        {
          command: 'automation',
          description: '🤖 Control automation settings'
        },
        {
          command: 'schedule',
          description: '⏰ Manage posting schedule'
        },
        {
          command: 'settings',
          description: '⚙️ System configuration'
        },
        
        // Analytics & Monitoring
        {
          command: 'analytics',
          description: '📊 View channel analytics'
        },
        {
          command: 'coupons',
          description: '🎫 Manage promotional coupons'
        },
        {
          command: 'scrape_website',
          description: '🕷️ Scrape GizeBets website for data'
        },
        {
          command: 'compare_data',
          description: '📊 Compare API vs Website data'
        },
        {
          command: 'status',
          description: '📈 Get system status'
        },
        
        // System Control
        {
          command: 'stop',
          description: '🛑 Stop system processes'
        },
        {
          command: 'restart',
          description: '🔄 Restart bot system'
        },
        {
          command: 'help',
          description: '❓ Show admin panel'
        }
      ];

      // Register commands with Telegram using setMyCommands
      await this.bot.setMyCommands(commands);
      console.log('✅ Bot commands registered successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Error setting up bot commands:', error);
      return false;
    }
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

  // 🎁 Handle /sendpromo command
  setupSendPromoCommand() {
    this.bot.onText(/\/sendpromo(?:\s+(.+))?/, async (msg, match) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        const category = match[1] || 'football'; // Default to football

        await this.bot.sendMessage(chatId, '🎁 Sending promotional message...');

        // Call the manual promo API
        const response = await axios.post(`${this.baseUrl}/api/manual/promo`, {
          category: category
        });

        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Promotional message sent successfully!\n` +
            `📧 Message ID: ${response.data.messageId}\n` +
            `🎯 Category: ${category}\n` +
            `⏰ Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to send promotional message: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in sendpromo command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error sending promotional message: ' + error.message);
      }
    });
  }

  // 💰 Handle /sendbonus command
  setupSendBonusCommand() {
    this.bot.onText(/\/sendbonus\s+(\w+)\s+"([^"]+)"/, async (msg, match) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        const target = match[1]; // ALL or specific target
        const bonusMessage = match[2];

        await this.bot.sendMessage(chatId, '💰 Sending bonus message...');

        // Call the manual bonus API
        const response = await axios.post(`${this.baseUrl}/api/manual/bonus`, {
          target: target,
          message: bonusMessage
        });

        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Bonus message sent successfully!\n` +
            `📧 Message ID: ${response.data.messageId}\n` +
            `🎯 Target: ${target}\n` +
            `💬 Message: "${bonusMessage}"\n` +
            `⏰ Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to send bonus message: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in sendbonus command:', error);
        await this.bot.sendMessage(msg.chat.id, 
          '❌ Error sending bonus message: ' + error.message + 
          '\n\n📖 Usage: /sendbonus ALL "Your bonus message here"'
        );
      }
    });
  }

  // ⚽ Handle /predictions command
  setupPredictionsCommand() {
    this.bot.onText(/\/predictions/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '⚽ Generating match predictions...');

        // Call the manual predictions API
        const response = await axios.post(`${this.baseUrl}/api/manual/predictions`);

        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Predictions sent successfully!\n` +
            `📧 Message ID: ${response.data.messageId}\n` +
            `🎯 Matches: ${response.data.matchCount || 'N/A'}\n` +
            `📊 Data Quality: ${response.data.hasEnhancedData ? 'Enhanced' : 'Basic'}\n` +
            `⏰ Sent at: ${response.data.executedAt}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to send predictions: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in predictions command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error sending predictions: ' + error.message);
      }
    });
  }

  // 📊 Handle /results command
  setupResultsCommand() {
    this.bot.onText(/\/results/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '📊 Generating match results...');

        // Call the manual results API
        const response = await axios.post(`${this.baseUrl}/api/manual/results`);

        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Results sent successfully!\n` +
            `📧 Message ID: ${response.data.messageId}\n` +
            `📊 Results: ${response.data.resultCount || 'N/A'}\n` +
            `⏰ Sent at: ${response.data.executedAt}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to send results: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in results command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error sending results: ' + error.message);
      }
    });
  }

  // 📈 Handle /status command
  setupStatusCommand() {
    this.bot.onText(/\/status/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;

        // Get status data directly (avoid HTTP to self)
        const status = {
          success: true,
          timestamp: new Date().toISOString(),
          ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }),
          system: {
            status: "running",
            uptime: "Active", 
            isRunning: true,
            dailyStats: {
              predictionsPosted: 0,
              resultsPosted: 0,
              promosPosted: 0,
              errors: 0
            },
            nextScheduled: {
              predictions: "Every 2 hours (8 AM - 8 PM)",
              results: "Daily at 11 PM", 
              promos: "10 AM, 2 PM, 6 PM",
              analytics: "Midnight"
            },
            timezone: "Africa/Addis_Ababa"
          }
        };

        if (status.success) {
          await this.bot.sendMessage(chatId, 
            `📈 GizeBets System Status\n\n` +
            `🤖 Bot Status: ${status.isRunning ? '✅ Active' : '❌ Stopped'}\n` +
            `⏰ Uptime: ${status.uptime || 'N/A'}\n` +
            `📊 Stats: ${JSON.stringify(status.stats || {}, null, 2)}\n` +
            `🌍 Ethiopian Time: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n` +
            `🔗 System URL: ${this.baseUrl}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to get system status');
        }

      } catch (error) {
        console.error('❌ Error in status command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error getting system status: ' + error.message);
      }
    });
  }

  // ❓ Handle /help command - Complete Admin Panel
  setupHelpCommand() {
    this.bot.onText(/\/help/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      const uptimeHours = Math.floor((Date.now() - this.systemStatus.uptime) / (1000 * 60 * 60));
      const uptimeMinutes = Math.floor((Date.now() - this.systemStatus.uptime) / (1000 * 60)) % 60;
      
      const adminPanel = `${this.getStatusIndicator()} <b>GIZEBETS ADMIN CONTROL PANEL</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👋 Welcome Admin! Choose a section to manage:\n\n` +
        `📊 <b>System Status:</b> ${this.systemStatus.isOnline ? '🟢 Online' : '🔴 Offline'}\n` +
        `⏱️ <b>Uptime:</b> ${uptimeHours}h ${uptimeMinutes}m\n` +
        `🔄 <b>API Errors:</b> ${this.systemStatus.consecutiveErrors}\n` +
        `📺 <b>Channel:</b> @gizebetgames\n` +
        `🤖 <b>Bot:</b> @Africansportbot`;

      await this.bot.sendMessage(msg.chat.id, adminPanel, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚽ Send Predictions', callback_data: 'manual_predictions' },
              { text: '🎁 Send Promo', callback_data: 'manual_promo' }
            ],
            [
              { text: '🔴 Live Matches', callback_data: 'live_matches' },
              { text: '⏰ Upcoming Matches', callback_data: 'upcoming_matches' }
            ],
            [
              { text: '📅 Today Matches', callback_data: 'today_matches' },
              { text: '📊 Post Results', callback_data: 'manual_results' }
            ],
            [
              { text: '🤖 Automation', callback_data: 'automation_panel' },
              { text: '⏰ Schedule', callback_data: 'schedule_panel' }
            ],
            [
              { text: '⚙️ Settings', callback_data: 'settings_panel' },
              { text: '📊 Analytics', callback_data: 'analytics_panel' }
            ],
            [
              { text: '🎫 Coupons', callback_data: 'coupons_panel' },
              { text: '🕷️ Scrape Website', callback_data: 'scrape_website_panel' }
            ],
            [
              { text: '📊 Compare Data', callback_data: 'compare_data_panel' },
              { text: '🔧 Advanced Tools', callback_data: 'advanced_tools_panel' }
            ],
            [
              { text: '🛑 Stop System', callback_data: 'stop_system' },
              { text: '🔄 Restart', callback_data: 'restart_system' }
            ],
            [
              { text: '❓ Commands List', callback_data: 'commands_list' }
            ]
          ]
        }
      });
    });
  }

  // Helper function to get system status quickly
  async getSystemStatus() {
    try {
      // Return status directly (avoid HTTP to self)
      return '✅ Active';
    } catch (error) {
      return '⚠️ Unknown';
    }
  }

  // Update system status and notify admins if needed
  async updateSystemStatus(type, success, message = null) {
    const now = new Date();
    
    if (success) {
      this.systemStatus.lastApiSuccess = now;
      this.systemStatus.consecutiveErrors = 0;
      
      // If system was offline, notify it's back online
      if (!this.systemStatus.isOnline) {
        this.systemStatus.isOnline = true;
        await this.updateBotStatus('🟢 Online');
        await this.notifyAdmins('🟢 **SYSTEM ONLINE**', `✅ System is back online!\n🕐 ${now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n📡 ${type} successful`);
      }
    } else {
      this.systemStatus.lastApiError = now;
      this.systemStatus.consecutiveErrors++;
      
      // If multiple consecutive errors, mark as offline
      if (this.systemStatus.consecutiveErrors >= 3 && this.systemStatus.isOnline) {
        this.systemStatus.isOnline = false;
        await this.updateBotStatus('🔴 Offline');
        await this.notifyAdmins('🔴 **SYSTEM OFFLINE**', `❌ System experiencing issues!\n🕐 ${now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n⚠️ ${message || 'Multiple API failures'}\n🔄 Errors: ${this.systemStatus.consecutiveErrors}`);
      } else if (this.systemStatus.consecutiveErrors === 1) {
        // First error - just warn
        await this.updateBotStatus('🟡 Warning');
        await this.notifyAdmins('⚠️ **API WARNING**', `🟡 API issue detected\n📡 ${type} failed: ${message}\n🕐 ${now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`);
      }
    }
  }

  // Update bot's visual status (description/about)
  async updateBotStatus(status) {
    try {
      // Note: Bot name changes require BotFather permissions, but we can update description
      console.log(`🤖 Bot status updated: ${status}`);
      // In the future, this could update bot description via BotFather API if available
    } catch (error) {
      console.error('❌ Failed to update bot status:', error.message);
    }
  }

  // Send notification to all admin users
  async notifyAdmins(title, message) {
    const fullMessage = `${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${message}\n\n🤖 GizeBets System Monitor`;
    
    for (const adminId of this.adminUsers) {
      try {
        await this.bot.sendMessage(adminId, fullMessage, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
        console.log(`📢 Admin notification sent to ${adminId}`);
      } catch (error) {
        console.error(`❌ Failed to notify admin ${adminId}:`, error.message);
      }
    }
  }

  // Get system status indicator for messages
  getStatusIndicator() {
    if (this.systemStatus.isOnline) {
      return '🟢';
    } else if (this.systemStatus.consecutiveErrors > 0) {
      return '🔴';
    } else {
      return '🟡';
    }
  }

  // 🛑 Handle /stop command
  setupStopCommand() {
    this.bot.onText(/\/stop/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '🛑 Stopping system processes...');

        // Stop the main system
        const stopResponse = await axios.post(`${this.baseUrl}/api/stop`);
        
        // Stop bot commands
        const botStopResponse = await axios.post(`${this.baseUrl}/api/bot/stop`, {
          reason: `Stop requested by admin ${msg.from.first_name} (${msg.from.id})`
        });

        if (stopResponse.data.success && botStopResponse.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ System stopped successfully!\n` +
            `🛑 Main System: ${stopResponse.data.message}\n` +
            `🤖 Bot Commands: ${botStopResponse.data.message}\n` +
            `⏰ Stopped at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n` +
            `💡 Use /restart or the dashboard to restart the system.`
          );
        } else {
          await this.bot.sendMessage(chatId, '⚠️ Some systems may still be running. Check dashboard.');
        }

      } catch (error) {
        console.error('❌ Error in stop command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error stopping system: ' + error.message);
      }
    });
  }

  // 🔄 Handle /restart command
  setupRestartCommand() {
    this.bot.onText(/\/restart/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '🔄 Restarting bot commands...');

        // Call the bot restart API endpoint
        const restartResponse = await axios.post(`${this.baseUrl}/api/bot/restart`, {
          reason: `Restart requested by admin ${msg.from.first_name} (${msg.from.id})`
        });
        
        if (restartResponse.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Bot commands restarted successfully!\n` +
            `🤖 Status: ${restartResponse.data.data.isNowRunning ? 'Active' : 'Failed'}\n` +
            `🔄 Previous state: ${restartResponse.data.data.wasActive ? 'Active' : 'Inactive'}\n` +
            `⏰ Restarted at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n` +
            `📝 ${restartResponse.data.message}`
          );
        } else {
          await this.bot.sendMessage(chatId, 
            `❌ Failed to restart bot commands\n` +
            `📝 ${restartResponse.data.message || 'Unknown error'}`
          );
        }

      } catch (error) {
        console.error('❌ Error in restart command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error restarting: ' + error.message);
      }
    });
  }

  // 🔴 Handle /active_matches command
  setupActiveMatchesCommand() {
    this.bot.onText(/\/active_matches/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Fetching active matches...`);

        // Get live matches data directly (avoid HTTP to self)
        const FootballAPI = require('./football-api.js');
        const footballAPI = new FootballAPI();
        
        let liveMatches;
        try {
          liveMatches = await footballAPI.getLiveMatches();
          await this.updateSystemStatus('Live Matches API', true);
        } catch (apiError) {
          await this.updateSystemStatus('Live Matches API', false, apiError.message);
          throw apiError;
        }

        if (liveMatches.length === 0) {
          await this.bot.sendMessage(chatId, '⚽ No live matches found at the moment');
          return;
        }

        let matchesList = '🔴 <b>ACTIVE LIVE MATCHES</b>\n';
        matchesList += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        liveMatches.forEach((match, index) => {
          const status = match.status === 'LIVE' ? '🔴 LIVE' : `⏰ ${match.minute}'`;
          matchesList += `${index + 1}. <b>${match.homeTeam} ${match.homeScore || 0}-${match.awayScore || 0} ${match.awayTeam}</b>\n`;
          matchesList += `${status} | 🏆 ${match.competition}\n\n`;
        });

        matchesList += `📊 Found ${liveMatches.length} active matches\n`;
        matchesList += `🎯 Do you want to send LIVE predictions to the channel?`;

        await this.bot.sendMessage(chatId, matchesList, { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Send Live Predictions', callback_data: 'confirm_send_live_predictions' },
                { text: '❌ Just Show Info', callback_data: 'cancel_action' }
              ],
              [
                { text: '📊 Send Live Results', callback_data: 'confirm_send_live_results' },
                { text: '🔄 Refresh List', callback_data: 'refresh_live_matches' }
              ]
            ]
          }
        });

      } catch (error) {
        console.error('❌ Error in active_matches command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching live matches: ' + error.message);
      }
    });
  }

  // ⏰ Handle /upcoming_matches command
  setupUpcomingMatchesCommand() {
    this.bot.onText(/\/upcoming_matches/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Fetching upcoming matches...`);

        // Get upcoming matches data directly (avoid HTTP to self)
        const FootballAPI = require('./football-api.js');
        const footballAPI = new FootballAPI();
        
        let upcomingMatches;
        try {
          upcomingMatches = await footballAPI.getUpcomingMatches();
          await this.updateSystemStatus('Upcoming Matches API', true);
        } catch (apiError) {
          await this.updateSystemStatus('Upcoming Matches API', false, apiError.message);
          throw apiError;
        }

        if (upcomingMatches.length === 0) {
          await this.bot.sendMessage(chatId, '⏰ No matches starting in the next 3 hours');
          return;
        }

        let matchesList = '⏰ <b>UPCOMING MATCHES (Next 2-3 Hours)</b>\n';
        matchesList += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        upcomingMatches.forEach((match, index) => {
          // Ensure kickoffTime is a Date object (support both Date and string)
          const matchTime = match.kickoffTime instanceof Date ? match.kickoffTime : new Date(match.kickoffTime);
          const timeStr = matchTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Africa/Addis_Ababa'
          });
          
          const now = new Date();
          const hoursUntil = Math.round((matchTime - now) / (1000 * 60 * 60 * 100)) / 10; // Round to 1 decimal
          
          matchesList += `${index + 1}. <b>${match.homeTeam} vs ${match.awayTeam}</b>\n`;
          matchesList += `🏆 ${match.competition} | ⏰ ${timeStr} (in ${hoursUntil}h)\n\n`;
        });

        matchesList += `📊 Found ${upcomingMatches.length} upcoming matches\n`;
        matchesList += `🎯 These matches will start in the next 2-3 hours.\nSend predictions to the channel?`;

        await this.bot.sendMessage(chatId, matchesList, { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Send Predictions', callback_data: 'confirm_send_upcoming_predictions' },
                { text: '❌ Just Show Info', callback_data: 'cancel_action' }
              ],
              [
                { text: '🔄 Refresh List', callback_data: 'refresh_upcoming_matches' }
              ]
            ]
          }
        });

      } catch (error) {
        console.error('❌ Error in upcoming_matches command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching upcoming matches: ' + error.message);
      }
    });
  }

  // 📅 Handle /today_matches command
  setupTodayMatchesCommand() {
    this.bot.onText(/\/today_matches/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Getting today's matches and content schedule...`);

        try {
          // Get today's matches with content schedule
          const todayResponse = await axios.get(`${this.baseUrl}/api/today-matches`);
          const todayData = todayResponse.data;
          
          await this.updateSystemStatus('Today Matches API', true);
          
          const summary = todayData.summary;
          const nextActions = todayData.nextActions;

          let matchesList = `📅 <b>TODAY'S MATCHES & CONTENT SCHEDULE</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📊 <b>Summary:</b>\n` +
            `• Total Matches: ${summary.totalMatches}\n` +
            `• Live Now: ${summary.liveMatches}\n` +
            `• Upcoming: ${summary.upcomingMatches}\n` +
            `• Ready to Send: ${summary.readyToSend}\n` +
            `• Scheduled: ${summary.scheduled}\n` +
            `• Overdue: ${summary.overdue}\n\n`;

          if (nextActions.readyToSendNow.length > 0) {
            matchesList += `🚨 <b>READY TO SEND NOW:</b>\n`;
            nextActions.readyToSendNow.forEach(action => {
              matchesList += `• ${action.match} - ${action.type}\n`;
            });
            matchesList += `\n`;
          }

          if (nextActions.nextScheduled.length > 0) {
            matchesList += `⏰ <b>NEXT SCHEDULED:</b>\n`;
            nextActions.nextScheduled.forEach(action => {
              matchesList += `• ${action.match}\n  Type: ${action.type} | Time: ${action.sendTime} (${action.hoursUntil}h)\n`;
            });
            matchesList += `\n`;
          }

          matchesList += `🎯 Choose an action:`;

          await this.bot.sendMessage(chatId, matchesList, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📊 Send Ready Content', callback_data: 'send_ready_content' },
                  { text: '🔄 Refresh Schedule', callback_data: 'refresh_today_schedule' }
                ],
                [
                  { text: '📋 Full Schedule', callback_data: 'view_full_today_schedule' },
                  { text: '⚙️ Settings', callback_data: 'today_schedule_settings' }
                ]
              ]
            }
          });
          
        } catch (apiError) {
          await this.updateSystemStatus('Today Matches API', false, apiError.message);
          throw apiError;
        }

      } catch (error) {
        console.error('❌ Error in today_matches command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error loading today\'s matches: ' + error.message);
      }
    });
  }

  // 📺 Handle /send_live command
  setupSendLiveCommand() {
    this.bot.onText(/\/send_live/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '📺 Sending live match predictions...');

        const response = await axios.post(`${this.baseUrl}/api/manual/live-predictions`);
        
        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Live predictions sent successfully!\n` +
            `📊 Messages sent: ${response.data.messageCount || 1}\n` +
            `📺 Channel: ${this.channelId}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to send live predictions');
        }

      } catch (error) {
        console.error('❌ Error in send_live command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error sending live predictions: ' + error.message);
      }
    });
  }

  // ⚡ Handle /live_results command
  setupLiveResultsCommand() {
    this.bot.onText(/\/live_results/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '⚡ Posting live results...');

        const response = await axios.post(`${this.baseUrl}/api/manual/live-results`);
        
        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Live results posted successfully!\n` +
            `📊 Results posted: ${response.data.resultCount || 0}\n` +
            `📺 Channel: ${this.channelId}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to post live results');
        }

      } catch (error) {
        console.error('❌ Error in live_results command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error posting live results: ' + error.message);
      }
    });
  }

  // 🤖 Handle /automation command
  setupAutomationCommand() {
    this.bot.onText(/\/automation/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Getting automation status...`);

        try {
          // Get automation data from API
          const automationResponse = await axios.get(`${this.baseUrl}/api/automation`);
          const automation = automationResponse.data;
          
          await this.updateSystemStatus('Automation API', true);
          
          const isEnabled = automation.summary.activeAutomations;
          const health = automation.summary.health;
          
          const automationMenu = `🤖 <b>AUTOMATION CONTROL PANEL</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📊 <b>Overall Status:</b> ${automation.automation.isEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
            `🔄 <b>Health:</b> ${health.status === 'healthy' ? '✅ Healthy' : health.status === 'paused' ? '⏸️ Paused' : '❌ Issues'}\n` +
            `❌ <b>Failures:</b> ${health.consecutiveFailures}/${health.maxFailures}\n\n` +
            `📋 <b>Active Automations:</b>\n` +
            `• Predictions: ${isEnabled.predictions ? '✅' : '❌'} (${automation.summary.statistics.totalPredictionRuns} runs)\n` +
            `• Results: ${isEnabled.results ? '✅' : '❌'} (${automation.summary.statistics.totalResultRuns} runs)\n` +
            `• Promos: ${isEnabled.promos ? '✅' : '❌'} (${automation.summary.statistics.totalPromoRuns} runs)\n` +
            `• Analytics: ${isEnabled.analytics ? '✅' : '❌'} (${automation.summary.statistics.totalAnalyticsRuns} runs)\n\n` +
            `Choose an action:`;

          await this.bot.sendMessage(chatId, automationMenu, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: automation.automation.isEnabled ? '🛑 Disable All' : '▶️ Enable All', callback_data: automation.automation.isEnabled ? 'disable_automation' : 'enable_automation' },
                  { text: '⏰ Edit Schedule', callback_data: 'edit_automation_schedule' }
                ],
                [
                  { text: '🔄 Reset Failures', callback_data: 'reset_automation_failures' },
                  { text: '📊 View Details', callback_data: 'automation_details' }
                ],
                [
                  { text: '🎯 Manual Controls', callback_data: 'manual_automation_controls' },
                  { text: '⚙️ Settings', callback_data: 'automation_settings' }
                ]
              ]
            }
          });
          
        } catch (apiError) {
          await this.updateSystemStatus('Automation API', false, apiError.message);
          throw apiError;
        }

      } catch (error) {
        console.error('❌ Error in automation command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error accessing automation: ' + error.message);
      }
    });
  }

  // ⏰ Handle /schedule command
  setupScheduleCommand() {
    this.bot.onText(/\/schedule/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Getting schedule information...`);

        try {
          // Get schedule data from API
          const scheduleResponse = await axios.get(`${this.baseUrl}/api/schedule?summary=true`);
          const schedule = scheduleResponse.data;
          
          await this.updateSystemStatus('Schedule API', true);
          
          const scheduleMenu = `⏰ <b>POSTING SCHEDULE MANAGER</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📊 <b>Current Status:</b>\n` +
            `• Live Matches: ${schedule.summary.current.liveMatches}\n` +
            `• Upcoming Predictions: ${schedule.summary.current.upcomingPredictions}\n` +
            `• Upcoming Results: ${schedule.summary.current.upcomingResults}\n` +
            `• Queued Manual: ${schedule.summary.current.queuedManual}\n\n` +
            `⏰ <b>Next Action:</b>\n` +
            `${schedule.summary.next.item ? 
              `• ${schedule.summary.next.item.match}\n` +
              `• Type: ${schedule.summary.next.item.category}\n` +
              `• In: ${schedule.summary.next.timeUntilNext} minutes`
              : '• No scheduled actions'}\n\n` +
            `⚙️ <b>Settings:</b>\n` +
            `• Daily Schedule: ${schedule.summary.overview.dailyScheduleEnabled ? '✅' : '❌'}\n` +
            `• Match-based: ${schedule.summary.overview.matchBasedEnabled ? '✅' : '❌'}\n` +
            `• Total Items: ${schedule.summary.overview.totalScheduledItems}`;

          await this.bot.sendMessage(chatId, scheduleMenu, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 Regenerate Schedule', callback_data: 'regenerate_schedule' },
                  { text: '⚙️ Update Settings', callback_data: 'update_schedule_settings' }
                ],
                [
                  { text: '📊 Full Details', callback_data: 'schedule_full_details' },
                  { text: '📅 Today Matches', callback_data: 'today_matches_schedule' }
                ]
              ]
            }
          });
          
        } catch (apiError) {
          await this.updateSystemStatus('Schedule API', false, apiError.message);
          throw apiError;
        }

      } catch (error) {
        console.error('❌ Error in schedule command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error accessing schedule: ' + error.message);
      }
    });
  }

  // ⚙️ Handle /settings command
  setupSettingsCommand() {
    this.bot.onText(/\/settings/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Getting system settings...`);

        try {
          // Get current settings from API
          const settingsResponse = await axios.get(`${this.baseUrl}/api/settings`);
          const settings = settingsResponse.data;
          
          await this.updateSystemStatus('Settings API', true);
          
          const settingsMenu = `⚙️ <b>SYSTEM CONFIGURATION</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📺 <b>Channel:</b> ${this.channelId}\n` +
            `🤖 <b>Bot:</b> @Africansportbot\n` +
            `🌐 <b>Timezone:</b> ${settings.data.timezone}\n` +
            `🔑 <b>API Status:</b> ${this.getStatusIndicator()} ${this.systemStatus.isOnline ? 'Online' : 'Offline'}\n` +
            `💬 <b>Language:</b> Amharic\n\n` +
            `⚙️ <b>Current Settings:</b>\n` +
            `• Auto-posting: ${settings.data.autoPosting ? '✅' : '❌'}\n` +
            `• Hours before match: ${settings.data.hoursBeforeMatch || 2}\n` +
            `• Generate images: ${settings.data.generateImages ? '✅' : '❌'}\n` +
            `• API timeout: ${settings.data.timeout || 30}s\n\n` +
            `Choose a setting to modify:`;

          await this.bot.sendMessage(chatId, settingsMenu, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '⚙️ Auto-posting', callback_data: 'toggle_autoposting' },
                  { text: '⏰ Match Timing', callback_data: 'update_match_timing' }
                ],
                [
                  { text: '🎨 Image Generation', callback_data: 'toggle_images' },
                  { text: '🌍 Timezone', callback_data: 'change_timezone' }
                ],
                [
                  { text: '📊 API Settings', callback_data: 'api_settings' },
                  { text: '🎯 Coupons', callback_data: 'manage_coupons' }
                ]
              ]
            }
          });
          
        } catch (apiError) {
          await this.updateSystemStatus('Settings API', false, apiError.message);
          throw apiError;
        }

      } catch (error) {
        console.error('❌ Error in settings command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error accessing settings: ' + error.message);
      }
    });
  }

  // 📊 Handle /analytics command
  setupAnalyticsCommand() {
    this.bot.onText(/\/analytics/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '📊 Fetching analytics data...');

        // Get analytics data directly (avoid HTTP to self)
        const analytics = {
          clickTracking: {},
          totalClicks: 0,
          totalMessages: 0,
          dailyStats: {
            predictionsPosted: 0,
            resultsPosted: 0, 
            promosPosted: 0,
            errors: 0
          },
          timestamp: new Date().toISOString()
        };

        const analyticsReport = `📊 <b>CHANNEL ANALYTICS REPORT</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📈 <b>Today's Performance:</b>\n` +
          `• Messages Sent: ${analytics.messagesPosted || 0}\n` +
          `• Predictions: ${analytics.predictionsPosted || 0}\n` +
          `• Promos: ${analytics.promosPosted || 0}\n` +
          `• Results: ${analytics.resultsPosted || 0}\n\n` +
          `🎯 <b>Engagement:</b>\n` +
          `• Button Clicks: ${analytics.buttonClicks || 0}\n` +
          `• Promo Claims: ${analytics.promoClaims || 0}\n` +
          `• Error Rate: ${analytics.errorRate || '0%'}\n\n` +
          `⏰ <b>Last Updated:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

        await this.bot.sendMessage(chatId, analyticsReport, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📈 Detailed Report', callback_data: 'detailed_analytics' },
                { text: '📊 Export Data', callback_data: 'export_analytics' }
              ]
            ]
          }
        });

      } catch (error) {
        console.error('❌ Error in analytics command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching analytics: ' + error.message);
      }
    });
  }

  // 🎫 Handle /coupons command
  setupCouponsCommand() {
    this.bot.onText(/\/coupons/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Getting coupons information...`);

        try {
          // Get coupons data from API
          const couponsResponse = await axios.get(`${this.baseUrl}/api/coupons`);
          const coupons = couponsResponse.data;
          
          await this.updateSystemStatus('Coupons API', true);
          
          const totalCoupons = coupons.totalCoupons;
          const activeCoupons = coupons.coupons.filter(c => c.isActive && 
            (!c.expiryDate || new Date(c.expiryDate) > new Date()) &&
            (!c.maxUses || c.usedCount < c.maxUses)).length;
          const expiredCoupons = coupons.coupons.filter(c => 
            c.expiryDate && new Date(c.expiryDate) <= new Date()).length;

          let couponsInfo = `🎫 <b>COUPONS MANAGEMENT</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📊 <b>Overview:</b>\n` +
            `• Total Coupons: ${totalCoupons}\n` +
            `• Active Coupons: ${activeCoupons}\n` +
            `• Expired Coupons: ${expiredCoupons}\n\n`;

          if (coupons.coupons.length > 0) {
            couponsInfo += `🏷️ <b>Recent Coupons:</b>\n`;
            coupons.coupons.slice(0, 5).forEach(coupon => {
              const status = coupon.isActive ? 
                (coupon.expiryDate && new Date(coupon.expiryDate) <= new Date() ? '⏰ Expired' : '✅ Active') : 
                '❌ Inactive';
              couponsInfo += `• ${coupon.code} - ${coupon.value} (${status})\n`;
            });
            couponsInfo += `\n`;
          }

          couponsInfo += `🎯 Choose an action:`;

          await this.bot.sendMessage(chatId, couponsInfo, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '➕ Create Coupon', callback_data: 'create_coupon' },
                  { text: '📋 View All', callback_data: 'view_all_coupons' }
                ],
                [
                  { text: '✅ Active Only', callback_data: 'view_active_coupons' },
                  { text: '⏰ Expired Only', callback_data: 'view_expired_coupons' }
                ],
                [
                  { text: '🔄 Refresh', callback_data: 'refresh_coupons' },
                  { text: '⚙️ Settings', callback_data: 'coupon_settings' }
                ]
              ]
            }
          });
          
        } catch (apiError) {
          await this.updateSystemStatus('Coupons API', false, apiError.message);
          throw apiError;
        }

      } catch (error) {
        console.error('❌ Error in coupons command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error loading coupons: ' + error.message);
      }
    });
  }

  // 🕷️ Handle /scrape_website command
  setupScrapeWebsiteCommand() {
    this.bot.onText(/\/scrape_website/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Scraping GizeBets website...`);

        try {
          // Scrape the GizeBets website
          const scrapeResponse = await axios.get(`${this.baseUrl}/api/scrape-gizebets`);
          const scrapeData = scrapeResponse.data;
          
          await this.updateSystemStatus('Website Scraping API', true);
          
          if (scrapeData.success) {
            const analysis = scrapeData.analysis;
            const data = scrapeData.data;

            let scrapeInfo = `🕷️ <b>GIZEBETS WEBSITE SCRAPING</b>\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `🌐 <b>URL:</b> ${scrapeData.url}\n` +
              `📄 <b>Title:</b> ${analysis.title}\n` +
              `📏 <b>Content Size:</b> ${analysis.totalLength.toLocaleString()} chars\n\n` +
              `🔍 <b>Analysis:</b>\n` +
              `• JavaScript: ${analysis.hasJavaScript ? '✅' : '❌'}\n` +
              `• Images: ${analysis.hasImages ? '✅' : '❌'}\n` +
              `• Tables: ${analysis.hasTable ? '✅' : '❌'}\n` +
              `• Forms: ${analysis.hasForms ? '✅' : '❌'}\n\n`;

            if (analysis.footballTermsFound.length > 0) {
              scrapeInfo += `⚽ <b>Football Terms Found:</b>\n• ${analysis.footballTermsFound.join(', ')}\n\n`;
            }

            if (data.leagues.length > 0) {
              scrapeInfo += `🏆 <b>Leagues Detected:</b>\n• ${data.leagues.slice(0, 5).join('\n• ')}\n\n`;
            }

            if (data.matches.length > 0) {
              scrapeInfo += `⚽ <b>Matches Found:</b>\n`;
              data.matches.slice(0, 3).forEach(match => {
                scrapeInfo += `• ${match.homeTeam} vs ${match.awayTeam}\n`;
              });
              if (data.matches.length > 3) {
                scrapeInfo += `• ... and ${data.matches.length - 3} more\n`;
              }
              scrapeInfo += `\n`;
            }

            if (data.odds.length > 0) {
              scrapeInfo += `💰 <b>Odds Found:</b> ${data.odds.slice(0, 5).join(', ')}\n\n`;
            }

            scrapeInfo += `🎯 Choose an action:`;

            await this.bot.sendMessage(chatId, scrapeInfo, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 Refresh Scrape', callback_data: 'refresh_scrape' },
                    { text: '📊 Compare with API', callback_data: 'compare_with_api' }
                  ],
                  [
                    { text: '📋 Full Analysis', callback_data: 'full_scrape_analysis' },
                    { text: '🔗 Visit Website', url: scrapeData.url }
                  ]
                ]
              }
            });

          } else {
            await this.bot.sendMessage(chatId, 
              `❌ <b>Scraping Failed</b>\n\n` +
              `🌐 URL: ${scrapeData.url}\n` +
              `📝 Error: ${scrapeData.message}\n` +
              `💡 ${scrapeData.fallback?.message || 'Try again later'}\n\n` +
              `<b>Suggestions:</b>\n` +
              `${scrapeData.fallback?.suggestions?.map(s => `• ${s}`).join('\n') || '• Check website accessibility'}`,
              { parse_mode: 'HTML' }
            );
          }
          
        } catch (apiError) {
          await this.updateSystemStatus('Website Scraping API', false, apiError.message);
          throw apiError;
        }

      } catch (error) {
        console.error('❌ Error in scrape_website command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error scraping website: ' + error.message);
      }
    });
  }

  // 📊 Handle /compare_data command
  setupCompareDataCommand() {
    this.bot.onText(/\/compare_data/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Comparing API vs Website data...`);

        try {
          // Compare data from API and website
          const compareResponse = await axios.get(`${this.baseUrl}/api/compare-data`);
          const comparisonData = compareResponse.data;
          
          await this.updateSystemStatus('Data Comparison API', true);
          
          if (comparisonData.success) {
            const comparison = comparisonData.comparison;
            const sources = comparisonData.sources;

            let compareInfo = `📊 <b>DATA SOURCES COMPARISON</b>\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `🔍 <b>Sources Status:</b>\n` +
              `• API-Football: ${sources.api.status === 'success' ? '✅' : '❌'} (${sources.api.matchesCount} matches)\n` +
              `• GizeBets Website: ${sources.website.status === 'success' ? '✅' : '❌'}\n\n` +
              `⚽ <b>Matches Comparison:</b>\n` +
              `• API Count: ${comparison.matches.apiCount}\n` +
              `• Website Count: ${comparison.matches.websiteCount}\n` +
              `• Difference: ${comparison.matches.difference}\n\n`;

            if (comparison.leagues.apiLeagues.length > 0) {
              compareInfo += `🏆 <b>API Leagues:</b>\n• ${comparison.leagues.apiLeagues.slice(0, 3).join('\n• ')}\n`;
              if (comparison.leagues.apiLeagues.length > 3) {
                compareInfo += `• ... and ${comparison.leagues.apiLeagues.length - 3} more\n`;
              }
              compareInfo += `\n`;
            }

            if (comparison.leagues.websiteLeagues.length > 0) {
              compareInfo += `🌐 <b>Website Leagues:</b>\n• ${comparison.leagues.websiteLeagues.slice(0, 3).join('\n• ')}\n\n`;
            }

            if (comparison.leagues.commonLeagues.length > 0) {
              compareInfo += `🤝 <b>Common Leagues:</b>\n• ${comparison.leagues.commonLeagues.join('\n• ')}\n\n`;
            }

            compareInfo += `📈 <b>Data Quality:</b>\n` +
              `• API Quality: ${comparison.quality.apiQuality}/100\n` +
              `• Website Quality: ${comparison.quality.websiteQuality}/100\n` +
              `• Recommended: ${comparison.quality.recommendation}\n\n`;

            if (comparison.recommendations.length > 0) {
              compareInfo += `💡 <b>Recommendations:</b>\n• ${comparison.recommendations.join('\n• ')}\n\n`;
            }

            compareInfo += `🎯 Choose an action:`;

            await this.bot.sendMessage(chatId, compareInfo, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 Refresh Comparison', callback_data: 'refresh_comparison' },
                    { text: '📊 Detailed Report', callback_data: 'detailed_comparison' }
                  ],
                  [
                    { text: '⚡ Use API Data', callback_data: 'use_api_data' },
                    { text: '🕷️ Use Website Data', callback_data: 'use_website_data' }
                  ],
                  [
                    { text: '🔀 Hybrid Approach', callback_data: 'use_hybrid_data' },
                    { text: '⚙️ Configure Sources', callback_data: 'configure_data_sources' }
                  ]
                ]
              }
            });

          } else {
            await this.bot.sendMessage(chatId, 
              `❌ <b>Comparison Failed</b>\n\n` +
              `📝 Error: ${comparisonData.message}\n` +
              `🔧 Try checking individual sources first`,
              { parse_mode: 'HTML' }
            );
          }
          
        } catch (apiError) {
          await this.updateSystemStatus('Data Comparison API', false, apiError.message);
          throw apiError;
        }

      } catch (error) {
        console.error('❌ Error in compare_data command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error comparing data: ' + error.message);
      }
    });
  }

  // 📋 Handle callback functions for menu panels
  async handleManualPredictions(chatId, messageId) {
    try {
      await this.bot.editMessageText(
        '🎯 <b>MANUAL PREDICTIONS</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Click below to send predictions to the channel:',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⚽ Top 5 Predictions', callback_data: 'confirm_send_upcoming_predictions' },
                { text: '🔴 Live Predictions', callback_data: 'confirm_send_live_predictions' }
              ],
              [
                { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
              ]
            ]
          }
        }
      );
    } catch (error) {
      console.error('❌ Error in handleManualPredictions:', error.message);
    }
  }

  async handleManualPromo(chatId, messageId) {
    await this.bot.editMessageText(
      '🎁 <b>MANUAL PROMO</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Send promotional content to the channel:',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🎉 Send Promo', callback_data: 'confirm_send_promo' },
              { text: '🎁 Send Bonus', callback_data: 'confirm_send_bonus' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleLiveMatches(chatId, messageId) {
    try {
      await this.bot.editMessageText('🔴 Loading live matches...', {
        chat_id: chatId,
        message_id: messageId
      });

      const footballAPI = new (require('../lib/football-api.js'))();
      const liveMatches = await footballAPI.getLiveMatches();
      
      let message = '🔴 <b>LIVE MATCHES</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      
      if (liveMatches.length === 0) {
        message += '❌ No live matches at the moment\n\n';
      } else {
        liveMatches.slice(0, 5).forEach((match, index) => {
          message += `⚽ <b>${match.homeTeam} vs ${match.awayTeam}</b>\n` +
                    `🏆 ${match.competition?.name || 'Unknown'}\n` +
                    `⏱️ ${match.status || 'Live'}\n\n`;
        });
      }

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Refresh', callback_data: 'refresh_live_matches' },
              { text: '📺 Send Live Predictions', callback_data: 'confirm_send_live_predictions' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      await this.bot.editMessageText('❌ Error loading live matches: ' + error.message, {
        chat_id: chatId,
        message_id: messageId
      });
    }
  }

  async handleUpcomingMatches(chatId, messageId) {
    try {
      await this.bot.editMessageText('⏰ Loading upcoming matches...', {
        chat_id: chatId,
        message_id: messageId
      });

      const footballAPI = new (require('../lib/football-api.js'))();
      const upcomingMatches = await footballAPI.getUpcomingMatches();
      
      let message = '⏰ <b>UPCOMING MATCHES</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      
      if (upcomingMatches.length === 0) {
        message += '❌ No upcoming matches found\n\n';
      } else {
        upcomingMatches.slice(0, 5).forEach((match, index) => {
          const kickoffTime = match.kickoffTime instanceof Date ? match.kickoffTime : new Date(match.kickoffTime);
          message += `⚽ <b>${match.homeTeam} vs ${match.awayTeam}</b>\n` +
                    `🏆 ${match.competition?.name || 'Unknown'}\n` +
                    `🕐 ${kickoffTime.toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n`;
        });
      }

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Refresh', callback_data: 'refresh_upcoming_matches' },
              { text: '🎯 Send Predictions', callback_data: 'confirm_send_upcoming_predictions' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      await this.bot.editMessageText('❌ Error loading upcoming matches: ' + error.message, {
        chat_id: chatId,
        message_id: messageId
      });
    }
  }

  async handleTodayMatches(chatId, messageId) {
    try {
      await this.bot.editMessageText('📅 Loading today\'s matches...', {
        chat_id: chatId,
        message_id: messageId
      });

      const response = await axios.get(`${this.baseUrl}/api/today-matches`);
      const data = response.data;
      
      let message = '📅 <b>TODAY\'S MATCHES</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      message += `📊 <b>Summary:</b>\n`;
      message += `• Total: ${data.summary?.totalMatches || 0}\n`;
      message += `• Live: ${data.summary?.liveMatches || 0}\n`;
      message += `• Upcoming: ${data.summary?.upcomingMatches || 0}\n\n`;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Refresh', callback_data: 'today_matches' },
              { text: '📊 Full Report', callback_data: 'today_matches_full' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      await this.bot.editMessageText('❌ Error loading today\'s matches: ' + error.message, {
        chat_id: chatId,
        message_id: messageId
      });
    }
  }

  async handleManualResults(chatId, messageId) {
    await this.bot.editMessageText(
      '📊 <b>MANUAL RESULTS</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Post match results to the channel:',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Daily Results', callback_data: 'confirm_send_daily_results' },
              { text: '🔴 Live Results', callback_data: 'confirm_send_live_results' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleAutomationPanel(chatId, messageId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/automation`);
      const automation = response.data.automation;
      
      let message = '🤖 <b>AUTOMATION PANEL</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      message += `🔄 <b>Status:</b> ${automation.isEnabled ? '✅ Enabled' : '❌ Disabled'}\n\n`;
      message += `📈 <b>Services:</b>\n`;
      message += `• Predictions: ${automation.predictions.enabled ? '✅' : '❌'}\n`;
      message += `• Results: ${automation.results.enabled ? '✅' : '❌'}\n`;
      message += `• Promos: ${automation.promos.enabled ? '✅' : '❌'}\n`;
      message += `• Analytics: ${automation.analytics.enabled ? '✅' : '❌'}\n\n`;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: automation.isEnabled ? '⏸️ Disable' : '▶️ Enable', callback_data: 'toggle_automation' },
              { text: '⚙️ Configure', callback_data: 'configure_automation' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      await this.bot.editMessageText('❌ Error loading automation: ' + error.message, {
        chat_id: chatId,
        message_id: messageId
      });
    }
  }

  async handleSchedulePanel(chatId, messageId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/schedule`);
      const schedule = response.data;
      
      let message = '⏰ <b>SCHEDULE PANEL</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      message += `📅 <b>Daily Schedule:</b>\n`;
      message += `• Predictions: ${schedule.summary?.daily?.predictions?.enabled ? '✅' : '❌'}\n`;
      message += `• Results: ${schedule.summary?.daily?.results?.enabled ? '✅' : '❌'}\n`;
      message += `• Promos: ${schedule.summary?.daily?.promos?.enabled ? '✅' : '❌'}\n\n`;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📝 Edit Schedule', callback_data: 'edit_schedule' },
              { text: '🔄 Refresh', callback_data: 'schedule_panel' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      await this.bot.editMessageText('❌ Error loading schedule: ' + error.message, {
        chat_id: chatId,
        message_id: messageId
      });
    }
  }

  async handleSettingsPanel(chatId, messageId) {
    await this.bot.editMessageText(
      '⚙️ <b>SETTINGS PANEL</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Configure system settings:',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌍 API Settings', callback_data: 'api_settings' },
              { text: '📺 Channel Settings', callback_data: 'channel_settings' }
            ],
            [
              { text: '🔔 Notifications', callback_data: 'notification_settings' },
              { text: '🎨 Content Settings', callback_data: 'content_settings' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleAnalyticsPanel(chatId, messageId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics`);
      const analytics = response.data;
      
      let message = '📊 <b>ANALYTICS PANEL</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      message += `📈 <b>Today\'s Stats:</b>\n`;
      message += `• Total Clicks: ${analytics.totalClicks || 0}\n`;
      message += `• Messages Sent: ${analytics.totalMessages || 0}\n`;
      message += `• Predictions: ${analytics.predictionsToday || 0}\n`;
      message += `• Results: ${analytics.resultsToday || 0}\n\n`;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Full Report', callback_data: 'full_analytics' },
              { text: '🔄 Refresh', callback_data: 'analytics_panel' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      await this.bot.editMessageText('❌ Error loading analytics: ' + error.message, {
        chat_id: chatId,
        message_id: messageId
      });
    }
  }

  async handleCouponsPanel(chatId, messageId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/coupons`);
      const coupons = response.data;
      
      let message = '🎫 <b>COUPONS PANEL</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      message += `📊 <b>Total Coupons:</b> ${coupons.totalCoupons || 0}\n`;
      message += `✅ <b>Active:</b> ${coupons.coupons?.filter(c => c.isActive).length || 0}\n\n`;
      
      if (coupons.coupons && coupons.coupons.length > 0) {
        message += `🎟️ <b>Recent Coupons:</b>\n`;
        coupons.coupons.slice(0, 3).forEach(coupon => {
          message += `• ${coupon.code} - ${coupon.value}\n`;
        });
      }

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '➕ Add Coupon', callback_data: 'add_coupon' },
              { text: '📝 Manage', callback_data: 'manage_coupons' }
            ],
            [
              { text: '🔄 Refresh', callback_data: 'coupons_panel' },
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      await this.bot.editMessageText('❌ Error loading coupons: ' + error.message, {
        chat_id: chatId,
        message_id: messageId
      });
    }
  }

  async handleScrapeWebsitePanel(chatId, messageId) {
    await this.bot.editMessageText(
      '🕷️ <b>WEBSITE SCRAPING</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Scrape GizeBets website for data:',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🕷️ Scrape Now', callback_data: 'start_scraping' },
              { text: '📊 Last Results', callback_data: 'scrape_results' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleCompareDataPanel(chatId, messageId) {
    await this.bot.editMessageText(
      '📊 <b>DATA COMPARISON</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Compare API vs Website data:',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Compare Now', callback_data: 'start_comparison' },
              { text: '📈 Last Report', callback_data: 'comparison_results' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleAdvancedToolsPanel(chatId, messageId) {
    await this.bot.editMessageText(
      '🔧 <b>ADVANCED TOOLS</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Advanced system tools:',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Clear Cache', callback_data: 'clear_cache' },
              { text: '📋 System Logs', callback_data: 'system_logs' }
            ],
            [
              { text: '🚀 Performance', callback_data: 'performance_check' },
              { text: '🔧 Debug Mode', callback_data: 'debug_mode' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleStopSystem(chatId, messageId) {
    await this.bot.editMessageText(
      '🛑 <b>STOP SYSTEM</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '⚠️ This will stop all system processes!\n\n' +
      'Are you sure you want to continue?',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Yes, Stop System', callback_data: 'confirm_stop_system' },
              { text: '❌ Cancel', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleRestartSystem(chatId, messageId) {
    await this.bot.editMessageText(
      '🔄 <b>RESTART SYSTEM</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '🔄 This will restart all system processes!\n\n' +
      'Are you sure you want to continue?',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Yes, Restart System', callback_data: 'confirm_restart_system' },
              { text: '❌ Cancel', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      }
    );
  }

  async handleCommandsList(chatId, messageId) {
    const commandsList = `📋 <b>BOT COMMANDS LIST</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🎯 <b>Manual Content:</b>\n` +
      `/predictions - Send predictions\n` +
      `/sendpromo - Send promo\n` +
      `/sendbonus - Send bonus\n` +
      `/results - Post results\n\n` +
      `🔴 <b>Live Management:</b>\n` +
      `/active_matches - Live matches\n` +
      `/upcoming_matches - Upcoming matches\n` +
      `/today_matches - Today's overview\n` +
      `/send_live - Live predictions\n` +
      `/live_results - Live results\n\n` +
      `🤖 <b>System Control:</b>\n` +
      `/automation - Automation panel\n` +
      `/schedule - Schedule management\n` +
      `/settings - System settings\n` +
      `/stop - Stop system\n` +
      `/restart - Restart system\n\n` +
      `📊 <b>Analytics & Tools:</b>\n` +
      `/analytics - View analytics\n` +
      `/coupons - Manage coupons\n` +
      `/scrape_website - Scrape website\n` +
      `/compare_data - Compare data\n` +
      `/status - System status\n\n` +
      `💬 <b>Help:</b>\n` +
      `/help - Show this menu`;

    await this.bot.editMessageText(commandsList, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔙 Back to Menu', callback_data: 'back_to_main_menu' }
          ]
        ]
      }
    });
  }

  // 🔘 Setup callback query handlers with FAST response
  setupCallbackHandlers() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data;
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;
      const messageId = msg.message_id;

      try {
        // ⚡ Answer callback query immediately to remove loading spinner
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Processing...',
          show_alert: false
        });

        switch (action) {
          case 'confirm_send_live_predictions':
            await this.bot.editMessageText('📺 Sending LIVE predictions to channel...', {
              chat_id: chatId,
              message_id: messageId
            });
            
            try {
              const response = await axios.post(`${this.baseUrl}/api/manual/live-predictions`);
              await this.bot.editMessageText(
                `✅ LIVE predictions sent successfully!\n📊 Messages sent: ${response.data.messageCount || 0}\n📺 Channel: ${this.channelId}`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to send LIVE predictions: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'confirm_send_upcoming_predictions':
            await this.bot.editMessageText('🎯 Sending upcoming predictions to channel...', {
              chat_id: chatId,
              message_id: messageId
            });
            
            try {
              const response = await axios.post(`${this.baseUrl}/api/manual/predictions`);
              await this.bot.editMessageText(
                `✅ Predictions sent successfully!\n📊 Messages sent: ${response.data.result?.totalSent || 0}\n📺 Channel: ${this.channelId}`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to send predictions: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'confirm_send_live_results':
            await this.bot.editMessageText('📊 Posting LIVE results to channel...', {
              chat_id: chatId,
              message_id: messageId
            });
            
            try {
              const response = await axios.post(`${this.baseUrl}/api/manual/live-results`);
              await this.bot.editMessageText(
                `✅ LIVE results posted successfully!\n📊 Results: ${response.data.resultCount || 0}\n📺 Channel: ${this.channelId}`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to post LIVE results: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'cancel_action':
            await this.bot.editMessageText('❌ Action cancelled', {
              chat_id: chatId,
              message_id: messageId
            });
            break;

          case 'refresh_live_matches':
            // Re-run the active matches command logic
            await this.bot.editMessageText('🔄 Refreshing live matches...', {
              chat_id: chatId,
              message_id: messageId
            });
            // Simulate calling the command again
            this.setupActiveMatchesCommand();
            break;

          case 'refresh_upcoming_matches':
            await this.bot.editMessageText('🔄 Refreshing upcoming matches...', {
              chat_id: chatId,
              message_id: messageId
            });
            // Simulate calling the command again
            this.setupUpcomingMatchesCommand();
            break;

          // Panel callbacks from main menu
          case 'manual_predictions':
            await this.handleManualPredictions(chatId, messageId);
            break;
          
          case 'manual_promo':
            await this.handleManualPromo(chatId, messageId);
            break;
          
          case 'live_matches':
            await this.handleLiveMatches(chatId, messageId);
            break;
          
          case 'upcoming_matches':
            await this.handleUpcomingMatches(chatId, messageId);
            break;
          
          case 'today_matches':
            await this.handleTodayMatches(chatId, messageId);
            break;
          
          case 'manual_results':
            await this.handleManualResults(chatId, messageId);
            break;
          
          case 'automation_panel':
            await this.handleAutomationPanel(chatId, messageId);
            break;
          
          case 'schedule_panel':
            await this.handleSchedulePanel(chatId, messageId);
            break;
          
          case 'settings_panel':
            await this.handleSettingsPanel(chatId, messageId);
            break;
          
          case 'analytics_panel':
            await this.handleAnalyticsPanel(chatId, messageId);
            break;
          
          case 'coupons_panel':
            await this.handleCouponsPanel(chatId, messageId);
            break;
          
          case 'scrape_website_panel':
            await this.handleScrapeWebsitePanel(chatId, messageId);
            break;
          
          case 'compare_data_panel':
            await this.handleCompareDataPanel(chatId, messageId);
            break;
          
          case 'advanced_tools_panel':
            await this.handleAdvancedToolsPanel(chatId, messageId);
            break;
          
          case 'stop_system':
            await this.handleStopSystem(chatId, messageId);
            break;
          
          case 'restart_system':
            await this.handleRestartSystem(chatId, messageId);
            break;
          
          case 'commands_list':
            await this.handleCommandsList(chatId, messageId);
            break;

          // Navigation callbacks
          case 'back_to_main_menu':
            // Re-trigger the help command to show main menu
            const helpMsg = { chat: { id: chatId }, from: { id: callbackQuery.from.id } };
            try {
              await this.bot.deleteMessage(chatId, messageId);
            } catch (deleteError) {
              // Ignore delete errors, just continue
            }
            // Send fresh main menu
            await this.setupHelpCommand().then(() => {
              // Simulate help command call
              const fakeMsg = { chat: { id: chatId }, from: { id: callbackQuery.from.id } };
              return this.bot.sendMessage(chatId, 
                `${this.getStatusIndicator()} <b>GIZEBETS ADMIN CONTROL PANEL</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `👋 Welcome back to main menu!`, 
                { parse_mode: 'HTML' }
              );
            });
            break;

          // Confirmation callbacks
          case 'confirm_send_promo':
            await this.bot.editMessageText('🎉 Sending promo to channel...', {
              chat_id: chatId,
              message_id: messageId
            });
            try {
              const response = await axios.post(`${this.baseUrl}/api/manual/promo`);
              await this.bot.editMessageText(
                `✅ Promo sent successfully!\n📺 Channel: ${this.channelId}`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to send promo: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'confirm_send_bonus':
            await this.bot.editMessageText('🎁 Sending bonus to channel...', {
              chat_id: chatId,
              message_id: messageId
            });
            try {
              const response = await axios.post(`${this.baseUrl}/api/manual/bonus`);
              await this.bot.editMessageText(
                `✅ Bonus sent successfully!\n📺 Channel: ${this.channelId}`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to send bonus: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'confirm_send_daily_results':
            await this.bot.editMessageText('📊 Posting daily results to channel...', {
              chat_id: chatId,
              message_id: messageId
            });
            try {
              const response = await axios.post(`${this.baseUrl}/api/manual/results`);
              await this.bot.editMessageText(
                `✅ Daily results posted successfully!\n📺 Channel: ${this.channelId}`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to post daily results: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'confirm_stop_system':
            await this.bot.editMessageText('🛑 Stopping system...', {
              chat_id: chatId,
              message_id: messageId
            });
            try {
              const response = await axios.post(`${this.baseUrl}/api/bot/stop`);
              await this.bot.editMessageText(
                `✅ System stopped successfully!\n🔴 All processes are now inactive.`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to stop system: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'confirm_restart_system':
            await this.bot.editMessageText('🔄 Restarting system...', {
              chat_id: chatId,
              message_id: messageId
            });
            try {
              const response = await axios.post(`${this.baseUrl}/api/bot/restart`);
              await this.bot.editMessageText(
                `✅ System restarted successfully!\n🟢 All processes are now active.`,
                { chat_id: chatId, message_id: messageId }
              );
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Failed to restart system: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          // Quick action callbacks
          case 'start_scraping':
            await this.bot.editMessageText('🕷️ Starting website scraping...', {
              chat_id: chatId,
              message_id: messageId
            });
            try {
              const response = await axios.get(`${this.baseUrl}/api/scrape-gizebets`);
              const data = response.data;
              let message = `🕷️ <b>SCRAPING COMPLETED</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              message += `✅ Status: ${data.success ? 'Success' : 'Failed'}\n`;
              message += `📄 Title: ${data.analysis?.title || 'N/A'}\n`;
              message += `📏 Size: ${(data.analysis?.totalLength || 0).toLocaleString()} chars\n`;
              message += `⚽ Football Terms: ${data.analysis?.footballTermsFound?.length || 0}\n`;
              
              await this.bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 Back to Scraping', callback_data: 'scrape_website_panel' }
                    ]
                  ]
                }
              });
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Scraping failed: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          case 'start_comparison':
            await this.bot.editMessageText('📊 Starting data comparison...', {
              chat_id: chatId,
              message_id: messageId
            });
            try {
              const response = await axios.get(`${this.baseUrl}/api/compare-data`);
              const data = response.data;
              let message = `📊 <b>COMPARISON COMPLETED</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              message += `📡 API: ${data.sources?.api?.status === 'success' ? '✅' : '❌'} (${data.sources?.api?.matchesCount || 0} matches)\n`;
              message += `🌐 Website: ${data.sources?.website?.status === 'success' ? '✅' : '❌'}\n`;
              message += `🏆 Recommendation: ${data.comparison?.quality?.recommendation || 'N/A'}\n`;
              
              await this.bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 Back to Comparison', callback_data: 'compare_data_panel' }
                    ]
                  ]
                }
              });
            } catch (error) {
              await this.bot.editMessageText(
                `❌ Comparison failed: ${error.message}`,
                { chat_id: chatId, message_id: messageId }
              );
            }
            break;

          default:
            console.log(`⚠️ Unhandled callback action: ${action}`);
            await this.bot.editMessageText(`❓ Unknown action: ${action}\n\nPlease try again or contact support.`, {
              chat_id: chatId,
              message_id: messageId
            });
        }

      } catch (error) {
        console.error('❌ Error handling callback query:', error);
        try {
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Error processing request',
            show_alert: true
          });
        } catch (answerError) {
          console.error('❌ Error answering callback query:', answerError);
        }
      }
    });
  }

  // 🌐 Setup Axios interceptors for better API stability
  setupAxiosInterceptors() {
    // Request interceptor
    axios.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        config.params = config.params || {};
        config.params._t = Date.now();
        
        // Set timeout if not specified
        if (!config.timeout) {
          config.timeout = 15000;
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Axios request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    axios.interceptors.response.use(
      (response) => {
        // Log successful API calls
        if (response.config.url && response.config.url.includes('/api/')) {
          console.log(`✅ API call successful: ${response.config.method?.toUpperCase()} ${response.config.url}`);
        }
        return response;
      },
      async (error) => {
        const config = error.config;
        
        // Log API errors
        if (config && config.url && config.url.includes('/api/')) {
          console.error(`❌ API call failed: ${config.method?.toUpperCase()} ${config.url} - ${error.message}`);
        }

        // Handle specific error cases
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.log('⏰ Request timeout - will retry with longer timeout');
          await this.updateSystemStatus('API Timeout', false, `Timeout on ${config?.url}`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
          console.log('🌐 Network error - connectivity issue');
          await this.updateSystemStatus('Network Error', false, error.message);
        } else if (error.response && error.response.status >= 500) {
          console.log('🚨 Server error - API endpoint issue');
          await this.updateSystemStatus('Server Error', false, `Status: ${error.response.status}`);
        }

        return Promise.reject(error);
      }
    );
  }

  // 💓 Setup heartbeat monitor for bot stability
  setupHeartbeat() {
    console.log('💓 Setting up bot heartbeat monitor...');
    
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Heartbeat every 2 minutes
    this.heartbeatInterval = setInterval(async () => {
      try {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - this.lastHeartbeat;

        // If more than 5 minutes since last heartbeat, restart
        if (timeSinceLastHeartbeat > 300000) { // 5 minutes
          console.log('💔 Bot heartbeat timeout detected, restarting...');
          await this.restartBot();
          return;
        }

        // Send heartbeat
        if (this.isPollingActive) {
          try {
            const botInfo = await this.bot.getMe();
            this.lastHeartbeat = now;
            this.reconnectAttempts = 0; // Reset on successful heartbeat
            console.log(`💓 Bot heartbeat OK - @${botInfo.username}`);
          } catch (heartbeatError) {
            console.error('💔 Heartbeat failed:', heartbeatError.message);
            this.reconnectAttempts++;
            
            // If too many failed attempts, restart
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              console.log('💔 Too many heartbeat failures, restarting bot...');
              await this.restartBot();
            }
          }
        }
      } catch (error) {
        console.error('💔 Heartbeat monitor error:', error);
      }
    }, 120000); // Every 2 minutes
  }

  // 🔄 Restart bot function with circuit breaker
  async restartBot() {
    try {
      const now = Date.now();
      
      // Check circuit breaker
      if (this.circuitBreakerOpen) {
        console.log('🚨 Circuit breaker is open - skipping restart to prevent loops');
        return false;
      }
      
      // Reset restart count if window expired
      if (now - this.lastRestartTime > this.restartWindow) {
        this.restartCount = 0;
      }
      
      // Check if we've exceeded max restarts in window
      if (this.restartCount >= this.maxRestarts) {
        console.log(`🚨 Too many restarts (${this.restartCount}/${this.maxRestarts}) - opening circuit breaker for 1 hour`);
        this.circuitBreakerOpen = true;
        
        // Auto-close circuit breaker after 1 hour
        setTimeout(() => {
          this.circuitBreakerOpen = false;
          this.restartCount = 0;
          console.log('✅ Circuit breaker closed - bot can restart again');
        }, this.restartWindow);
        
        await this.notifyAdmins('🚨 **BOT CIRCUIT BREAKER ACTIVATED**', 
          `⚠️ Too many automatic restarts detected\n` +
          `🔒 Bot restart protection activated for 1 hour\n` +
          `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n` +
          `💡 Manual restart still available via web interface`
        );
        return false;
      }
      
      console.log(`🔄 Restarting bot (${this.restartCount + 1}/${this.maxRestarts})...`);
      
      // Update restart tracking
      this.restartCount++;
      this.lastRestartTime = now;
      
      // Stop current instance
      await this.stop();
      
      // Wait a bit longer to prevent rapid restarts
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Restart
      const started = await this.start();
      
      if (started) {
        console.log('✅ Bot restarted successfully');
        // Notify admins about restart
        await this.notifyAdmins('🔄 **BOT RESTARTED**', 
          `🔄 Bot was automatically restarted (${this.restartCount}/${this.maxRestarts})\n` +
          `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n` +
          `🤖 All systems are now operational`
        );
        return true;
      } else {
        console.error('❌ Failed to restart bot');
        return false;
      }
    } catch (error) {
      console.error('❌ Error during bot restart:', error);
      return false;
    }
  }

  // 🚨 Enhanced error handler for the bot
  setupErrorHandler() {
    this.bot.on('polling_error', async (error) => {
      console.error('❌ Polling error:', error);
      
      // Handle specific error codes
      if (error.code === 'EFATAL' || error.code === 'ETELEGRAM') {
        console.log('🔄 Critical polling error, attempting restart...');
        await this.restartBot();
      } else if (error.code === 409) {
        console.log('⚠️ Conflict error (409) - another instance is running');
        this.isPollingActive = false;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
        console.log('🌐 Network error, will retry...');
        // Network errors are usually temporary
      }
      
      await this.updateSystemStatus('Bot Polling', false, error.message);
    });

    this.bot.on('error', async (error) => {
      console.error('❌ Bot error:', error);
      await this.updateSystemStatus('Bot General', false, error.message);
    });

    // Enhanced webhook error handling
    this.bot.on('webhook_error', async (error) => {
      console.error('❌ Webhook error:', error);
      await this.updateSystemStatus('Bot Webhook', false, error.message);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      // Don't exit process in production
    });

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit process in production
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('📟 SIGTERM received, gracefully shutting down...');
      await this.gracefulShutdown();
    });

    process.on('SIGINT', async () => {
      console.log('📟 SIGINT received, gracefully shutting down...');
      await this.gracefulShutdown();
    });
  }

  // 🛑 Graceful shutdown
  async gracefulShutdown() {
    try {
      console.log('🛑 Starting graceful shutdown...');
      
      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Stop bot
      await this.stop();
      
      console.log('✅ Graceful shutdown completed');
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
    }
  }

  // 🚀 Start the bot command system
  async start() {
    try {
      console.log('🚀 Starting GizeBets Bot Commands...');

      // Double-check if already polling (safety check)
      if (this.isPollingActive) {
        console.log('⚠️ Bot is already polling, skipping start');
        return true;
      }

      // Set up commands with Telegram
      await this.setupBotCommands();

      // Set up command handlers
      this.setupSendPromoCommand();
      this.setupSendBonusCommand();
      this.setupPredictionsCommand();
      this.setupResultsCommand();
      this.setupStatusCommand();
      this.setupHelpCommand();
      this.setupStopCommand();
      this.setupRestartCommand();
      
      // New Live Match Management Commands
      this.setupActiveMatchesCommand();
      this.setupUpcomingMatchesCommand();
      this.setupTodayMatchesCommand();
      this.setupSendLiveCommand();
      this.setupLiveResultsCommand();
      
      // New Automation Control Commands
      this.setupAutomationCommand();
      this.setupScheduleCommand();
      this.setupSettingsCommand();
      
      // New Analytics & Management Commands
      this.setupAnalyticsCommand();
      this.setupCouponsCommand();
      this.setupScrapeWebsiteCommand();
      this.setupCompareDataCommand();

      // Set up callback handlers
      this.setupCallbackHandlers();

      // Set up error handling
      this.setupErrorHandler();

      // Start polling with enhanced stability and safety checks
      if (!this.isPollingActive) {
        try {
          // Stop any existing polling first (in case of cleanup issues)
          await this.bot.stopPolling();
          console.log('🔄 Cleaned up any existing polling');
        } catch (cleanupError) {
          // Ignore cleanup errors - this is just a safety measure
        }

        // Configure bot with enhanced stability options
        this.bot.setMaxListeners(20); // Increase listener limit
        
        // Start polling with basic options first (simplified for stability)
        await this.bot.startPolling();
        
        this.isPollingActive = true;
        console.log('✅ Bot polling started successfully with enhanced stability');
      }

      // Get bot info
      const botInfo = await this.bot.getMe();
      console.log(`✅ Bot @${botInfo.username} is ready for admin commands!`);
      console.log(`📋 Commands: /sendpromo, /sendbonus, /predictions, /results, /status, /help`);
      console.log(`🔒 Admin users: ${this.adminUsers.length > 0 ? this.adminUsers.join(', ') : 'None configured'}`);

      // Set initial system status and notify admins
      this.systemStatus.isOnline = true;
      this.lastHeartbeat = Date.now(); // Initialize heartbeat
      
      await this.notifyAdmins('🟢 **SYSTEM STARTUP**', `✅ GizeBets Bot is now online!\n🤖 Bot: @${botInfo.username}\n🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n📊 All systems operational\n💓 Heartbeat monitoring active`);

      return true;
    } catch (error) {
      console.error('❌ Error starting bot commands:', error);
      this.isPollingActive = false; // Reset flag on error
      return false;
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

module.exports = GizeBotCommands;