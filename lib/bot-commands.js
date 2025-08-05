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
      // Add admin user IDs here (get your ID from @userinfobot)
      // Example: 123456789,
    ];
    
    this.baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';
    
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

        // Call the status API
        const response = await axios.get(`${this.baseUrl}/api/status`);

        if (response.data.success) {
          const status = response.data;
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

      const adminPanel = `🤖 <b>GIZEBETS ADMIN CONTROL PANEL</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👋 Welcome Admin! Choose a section to manage:\n\n` +
        `📊 <b>System Status:</b> ${await this.getSystemStatus()}\n` +
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
      const response = await axios.get(`${this.baseUrl}/api/status`);
      return response.data.status?.isRunning ? '✅ Active' : '❌ Stopped';
    } catch (error) {
      return '⚠️ Unknown';
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
        const botStopResponse = await axios.delete(`${this.baseUrl}/api/bot/commands`);

        if (stopResponse.data.success && botStopResponse.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ System stopped successfully!\n` +
            `🛑 Main System: Stopped\n` +
            `🤖 Bot Commands: Stopping after this message\n` +
            `⏰ Stopped at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n` +
            `💡 Use the dashboard to restart the system.`
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

        // Stop current bot
        await this.stop();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Restart bot
        const started = await this.start();
        
        if (started) {
          await this.bot.sendMessage(chatId, 
            `✅ Bot commands restarted successfully!\n` +
            `🤖 Status: Active\n` +
            `⏰ Restarted at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to restart bot commands');
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
        await this.bot.sendMessage(chatId, '🔍 Fetching active matches...');

        // Get live matches data
        const response = await axios.get(`${this.baseUrl}/api/live-matches`);
        const liveMatches = response.data.matches || [];

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

        await this.bot.sendMessage(chatId, matchesList, { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '📺 Send Live Predictions', callback_data: 'send_live_predictions' },
              { text: '⚡ Post Results', callback_data: 'post_live_results' }
            ]]
          }
        });

      } catch (error) {
        console.error('❌ Error in active_matches command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching live matches: ' + error.message);
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
        
        // Get current automation status
        const statusResponse = await axios.get(`${this.baseUrl}/api/status`);
        const isRunning = statusResponse.data.status?.isRunning || false;

        const automationMenu = `🤖 <b>AUTOMATION CONTROL PANEL</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 Current Status: ${isRunning ? '✅ Active' : '❌ Stopped'}\n` +
          `⏰ Auto Predictions: Every 2 hours (8 AM - 8 PM)\n` +
          `📊 Auto Results: Daily at 11 PM\n` +
          `🎁 Auto Promos: 10 AM, 2 PM, 6 PM\n\n` +
          `Choose an action:`;

        await this.bot.sendMessage(chatId, automationMenu, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: isRunning ? '🛑 Stop Auto' : '▶️ Start Auto', callback_data: isRunning ? 'stop_automation' : 'start_automation' },
                { text: '⏰ Edit Schedule', callback_data: 'edit_schedule' }
              ],
              [
                { text: '🎯 Manual Trigger', callback_data: 'manual_trigger' },
                { text: '📊 View Logs', callback_data: 'view_logs' }
              ]
            ]
          }
        });

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
        
        const scheduleMenu = `⏰ <b>POSTING SCHEDULE MANAGER</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎯 <b>Current Schedule:</b>\n` +
          `• Predictions: Every 2 hours (8 AM - 8 PM)\n` +
          `• Results: Daily at 11 PM\n` +
          `• Promos: 10 AM, 2 PM, 6 PM\n` +
          `• Analytics: Midnight\n\n` +
          `🔧 <b>Timezone:</b> Africa/Addis_Ababa (GMT+3)`;

        await this.bot.sendMessage(chatId, scheduleMenu, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🎯 Edit Predictions', callback_data: 'edit_predictions_schedule' },
                { text: '📊 Edit Results', callback_data: 'edit_results_schedule' }
              ],
              [
                { text: '🎁 Edit Promos', callback_data: 'edit_promos_schedule' },
                { text: '🌍 Change Timezone', callback_data: 'change_timezone' }
              ]
            ]
          }
        });

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
        
        const settingsMenu = `⚙️ <b>SYSTEM CONFIGURATION</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📺 <b>Channel:</b> ${this.channelId}\n` +
          `🤖 <b>Bot:</b> @${process.env.BOT_USERNAME || 'Africansportbot'}\n` +
          `🌐 <b>Website:</b> gizebets.et\n` +
          `🔑 <b>API Status:</b> ✅ Connected\n` +
          `💬 <b>Language:</b> English\n\n` +
          `Choose a setting to modify:`;

        await this.bot.sendMessage(chatId, settingsMenu, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🎨 Message Format', callback_data: 'message_format' },
                { text: '🌐 Website URL', callback_data: 'website_url' }
              ],
              [
                { text: '🔑 API Keys', callback_data: 'api_keys' },
                { text: '👥 Admin Users', callback_data: 'admin_users' }
              ],
              [
                { text: '📊 Analytics', callback_data: 'analytics_settings' },
                { text: '🎯 Promo Codes', callback_data: 'promo_codes' }
              ]
            ]
          }
        });

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

        const response = await axios.get(`${this.baseUrl}/api/analytics`);
        const analytics = response.data.analytics || {};

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
      this.setupSendLiveCommand();
      this.setupLiveResultsCommand();
      
      // New Automation Control Commands
      this.setupAutomationCommand();
      this.setupScheduleCommand();
      this.setupSettingsCommand();
      
      // New Analytics Command
      this.setupAnalyticsCommand();

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