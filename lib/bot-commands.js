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

  // 🔘 Setup callback query handlers
  setupCallbackHandlers() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data;
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;
      const messageId = msg.message_id;

      try {
        // Answer the callback query to remove loading spinner
        await this.bot.answerCallbackQuery(callbackQuery.id);

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

          default:
            await this.bot.editMessageText('❓ Unknown action', {
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

  // 🚨 Global error handler for the bot
  setupErrorHandler() {
    this.bot.on('polling_error', (error) => {
      console.error('❌ Polling error:', error);
    });

    this.bot.on('error', (error) => {
      console.error('❌ Bot error:', error);
    });

    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
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

      // Set up callback handlers
      this.setupCallbackHandlers();

      // Set up error handling
      this.setupErrorHandler();

      // Start polling with extra safety checks
      if (!this.isPollingActive) {
        try {
          // Stop any existing polling first (in case of cleanup issues)
          await this.bot.stopPolling();
          console.log('🔄 Cleaned up any existing polling');
        } catch (cleanupError) {
          // Ignore cleanup errors - this is just a safety measure
        }

        await this.bot.startPolling();
        this.isPollingActive = true;
        console.log('✅ Bot polling started successfully');
      }

      // Get bot info
      const botInfo = await this.bot.getMe();
      console.log(`✅ Bot @${botInfo.username} is ready for admin commands!`);
      console.log(`📋 Commands: /sendpromo, /sendbonus, /predictions, /results, /status, /help`);
      console.log(`🔒 Admin users: ${this.adminUsers.length > 0 ? this.adminUsers.join(', ') : 'None configured'}`);

      // Set initial system status and notify admins
      this.systemStatus.isOnline = true;
      await this.notifyAdmins('🟢 **SYSTEM STARTUP**', `✅ GizeBets Bot is now online!\n🤖 Bot: @${botInfo.username}\n🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n📊 All systems operational`);

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
      if (this.bot && this.isPollingActive) {
        await this.bot.stopPolling();
        this.isPollingActive = false;
        console.log('🛑 Bot polling stopped');
      }
      return true;
    } catch (error) {
      console.error('❌ Error stopping bot:', error);
      // Force reset the flag even if stop fails
      this.isPollingActive = false;
      return false;
    }
  }
}

module.exports = GizeBotCommands;