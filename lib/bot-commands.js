// 🚀 GizeBets Modular Bot Commands - Clean & Organized Architecture
// This replaces the monolithic bot-commands.js with a modular approach

const ContentCommands = require('./bot-modules/content-commands');
const SystemCommands = require('./bot-modules/system-commands');
const LiveCommands = require('./bot-modules/live-commands');
const AdminCommands = require('./bot-modules/admin-commands');
const AutomationCommands = require('./bot-modules/automation-commands');
const HelpCommand = require('./bot-modules/help-command');

class GizeBotCommands {
  constructor() {
    // Initialize all command modules
    this.contentCommands = new ContentCommands();
    this.systemCommands = new SystemCommands();
    this.liveCommands = new LiveCommands();
    this.adminCommands = new AdminCommands();
    this.automationCommands = new AutomationCommands();
    this.helpCommand = new HelpCommand();

    // Use the base bot instance (they all inherit from BaseBotCommands)
    this.bot = this.contentCommands.bot;
    this.channelId = this.contentCommands.channelId;
    this.adminUsers = this.contentCommands.adminUsers;
    this.baseUrl = this.contentCommands.baseUrl;
    this.isPollingActive = this.contentCommands.isPollingActive;
    this.systemStatus = this.contentCommands.systemStatus;
    this.metrics = this.contentCommands.metrics;

    // Legacy compatibility properties
    this.heartbeatInterval = this.contentCommands.heartbeatInterval;
    this.lastHeartbeat = this.contentCommands.lastHeartbeat;
    this.webhookManager = this.contentCommands.webhookManager;

    console.log('🧩 Modular Bot Commands initialized');
  }

  // 📝 Set bot commands using official Telegram API
  async setupBotCommands() {
    try {
      console.log('🤖 Setting up bot commands...');
      
      // Define commands according to Telegram Bot API standards
      const commands = [
        // Content Management
        { command: 'predictions', description: '⚽ Send match predictions manually' },
        { command: 'sendpromo', description: '🎁 Send promotional message' },
        { command: 'results', description: '📊 Send match results' },
        
        // Live Matches Management
        { command: 'active_matches', description: '🔴 Show current active matches' },
        { command: 'upcoming_matches', description: '⏰ Show upcoming matches (next 2-3 hours)' },
        { command: 'today_matches', description: '📅 Today\'s matches with content schedule' },
        { command: 'send_live', description: '📺 Send predictions for live matches' },
        { command: 'live_results', description: '⚡ Post live match results' },
        
        // Automation Control
        { command: 'automation', description: '🤖 Control automation settings' },
        { command: 'schedule', description: '⏰ Manage posting schedule' },
        { command: 'settings', description: '⚙️ System configuration' },
        
        // Analytics & Monitoring
        { command: 'analytics', description: '📊 View channel analytics' },
        { command: 'coupons', description: '🎫 Manage promotional coupons' },
        { command: 'scrape_website', description: '🕷️ Scrape GizeBets website for data' },
        { command: 'compare_data', description: '📊 Compare API vs Website data' },
        { command: 'status', description: '📈 Get system status' },
        
        // System Control
        { command: 'stop', description: '🛑 Stop system processes' },
        { command: 'restart', description: '🔄 Restart bot system' },
        { command: 'force_stop', description: '🔥 Force stop all bot instances' },
        { command: 'health', description: '🏥 Detailed health check' },
        { command: 'help', description: '❓ Show admin panel' }
      ];

      // Register commands with Telegram using setMyCommands
      console.log('🔧 About to register commands with Telegram...');
      console.log('🔧 Commands to register:', commands.length);
      await this.bot.setMyCommands(commands);
      console.log('✅ Bot commands registered successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Error setting up bot commands:', error.message);
      console.error('❌ Full error:', error);
      return false;
    }
  }

  // 🔧 Setup all command handlers from modules
  setupAllCommands() {
    console.log('🔧 Setting up all command handlers...');

    // Content commands
    this.contentCommands.setupContentCommands();
    
    // System commands
    this.systemCommands.setupSystemCommands();
    
    // Live commands
    this.liveCommands.setupLiveCommands();
    
    // Admin commands
    this.adminCommands.setupAdminCommands();
    
    // Automation commands
    this.automationCommands.setupAutomationCommands();
    
    // Help command
    this.helpCommand.setupHelpCommand();

    // Setup callback handlers
    this.setupCallbackHandlers();

    console.log('✅ All command handlers set up successfully');
  }

  // 🔘 Setup callback query handlers
  setupCallbackHandlers() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data;
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;
      const messageId = msg.message_id;
      const queryAge = Date.now() - (callbackQuery.message.date * 1000);

      try {
        // Check if callback query is too old
        if (queryAge > 50000) {
          console.log(`⚠️ Callback query too old (${queryAge}ms), skipping answer`);
          return;
        }
        
        console.log(`🔘 Processing callback query: action="${action}", age=${queryAge}ms, chatId=${chatId}`);

        // Answer callback query immediately
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Processing...',
          show_alert: false
        }).catch(err => {
          console.log(`⚠️ Failed to answer callback query: ${err.message}`);
        });

        // Handle different callback actions
          switch (action) {
          case 'quick_predictions':
            await this.contentCommands.makeApiCall('/api/manual/predictions');
            await this.bot.editMessageText('✅ Predictions sent to channel!', {
              chat_id: chatId, message_id: messageId
            });
            break;

          case 'quick_promo':
            await this.contentCommands.makeApiCall('/api/manual/promo', { category: 'football' });
            await this.bot.editMessageText('✅ Promo sent to channel!', {
              chat_id: chatId, message_id: messageId
            });
            break;

          case 'quick_live_matches':
            await this.bot.editMessageText('🔴 Fetching live matches...', {
              chat_id: chatId, message_id: messageId
            });
            // Delegate to live commands module
            setTimeout(() => {
              this.liveCommands.setupActiveMatchesCommand();
              this.bot.sendMessage(chatId, '/active_matches');
            }, 1000);
            break;

          case 'quick_status':
            const status = this.systemCommands.getStatus();
              await this.bot.editMessageText(
              `📊 **Quick Status**\n\n` +
              `🤖 Bot: ${status.isOnline ? '✅ Online' : '❌ Offline'}\n` +
              `⏰ Uptime: ${status.uptimeFormatted}\n` +
              `❌ Errors: ${status.consecutiveErrors}\n` +
              `📡 Polling: ${status.isPollingActive ? '✅ Active' : '❌ Inactive'}`,
              { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
            );
            break;

          case 'quick_health':
            await this.bot.editMessageText('🏥 Running health check...', {
              chat_id: chatId, message_id: messageId
            });
            // Trigger health check
            setTimeout(() => {
              this.bot.sendMessage(chatId, '/health');
            }, 1000);
            break;

          case 'quick_analytics':
            await this.bot.editMessageText('📊 Fetching analytics...', {
              chat_id: chatId, message_id: messageId
            });
            setTimeout(() => {
              this.bot.sendMessage(chatId, '/analytics');
            }, 1000);
            break;

          case 'quick_settings':
            await this.bot.editMessageText('⚙️ Loading settings...', {
              chat_id: chatId, message_id: messageId
            });
            setTimeout(() => {
              this.bot.sendMessage(chatId, '/settings');
            }, 1000);
            break;

          case 'quick_restart':
            await this.bot.editMessageText('🔄 Restarting bot...', {
              chat_id: chatId, message_id: messageId
            });
            setTimeout(() => {
              this.bot.sendMessage(chatId, '/restart');
            }, 1000);
            break;

          case 'show_command_list':
            await this.helpCommand.showCommandList(chatId, messageId);
            break;
          
          case 'back_to_main_menu':
            // Re-trigger help command
            setTimeout(() => {
              this.bot.sendMessage(chatId, '/help');
            }, 500);
              await this.bot.deleteMessage(chatId, messageId);
            break;

          case 'cancel_operation':
            await this.bot.editMessageText('❌ Operation cancelled.', {
              chat_id: chatId, message_id: messageId
            });
            break;

          default:
            console.log(`❓ Unknown callback action: ${action}`);
            await this.bot.editMessageText('❓ Unknown action.', {
              chat_id: chatId, message_id: messageId
            });
        }

      } catch (error) {
        console.error('❌ Error in callback handler:', error);
        try {
          await this.bot.editMessageText('❌ Error processing request.', {
            chat_id: chatId, message_id: messageId
          });
        } catch (editError) {
          console.error('❌ Failed to edit error message:', editError);
        }
      }
    });
  }

  // 🚀 Start the bot commands system
  async startBotCommands() {
    try {
      console.log('🚀 Starting GizeBets Bot Commands...');
      console.log('🔧 Token check:', !!process.env.TELEGRAM_BOT_TOKEN);
      console.log('🔧 About to setup bot commands...');

      // Set up commands with Telegram
      await this.setupBotCommands();
      console.log('✅ Bot commands setup completed');

      // Set up all command handlers
      this.setupAllCommands();

      // Start bot communication
      if (this.contentCommands.useWebhook) {
        console.log('🌐 Setting up WEBHOOK mode...');
        await this.setupWebhook();
      } else {
        console.log('🔧 Starting POLLING mode...');
        await this.contentCommands.webhookManager.prepareForPolling();
        console.log('✅ No webhook configured, ready for polling');
        
        // ✅ Correct syntax for startPolling (parameters at top level)
        await this.bot.startPolling({
          interval: 2000,
          timeout: 10,
          allowed_updates: ['message', 'callback_query']
        });
      }
      
      this.isPollingActive = true;
      this.contentCommands.isPollingActive = true;
      this.systemCommands.isPollingActive = true;
      this.liveCommands.isPollingActive = true;
      this.adminCommands.isPollingActive = true;
      this.automationCommands.isPollingActive = true;
      this.helpCommand.isPollingActive = true;

      console.log('✅ Bot polling started successfully with enhanced stability');

      // Notify admin
      console.log(`✅ Bot @${this.bot.options.username || 'GizeBetsBot'} is ready for admin commands!`);
      console.log('📋 Commands: /sendpromo, /sendbonus, /predictions, /results, /status, /help');
      console.log('🔒 Admin users:', this.adminUsers);

      // Send startup notification to admins
      await this.contentCommands.notifyAdmins(
        '🚀 **BOT STARTED**', 
        '✅ GizeBets Bot is now online and ready!\n🕐 ' + new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
      );

      return true;

    } catch (error) {
      console.error('❌ Critical error starting bot commands:', error);
      this.isPollingActive = false;
      throw error;
    }
  }

  // 🔧 Start method (alias for compatibility)
  async start() {
    return await this.startBotCommands();
  }

  // 🛑 Stop the bot
  async stop() {
    console.log('🛑 Stopping modular bot...');
    
    // Stop all modules
    await Promise.all([
      this.contentCommands.stop(),
      this.systemCommands.stop(),
      this.liveCommands.stop(),
      this.adminCommands.stop(),
      this.automationCommands.stop(),
      this.helpCommand.stop()
    ]);

        this.isPollingActive = false;
    console.log('✅ Modular bot stopped');
        return true;
      }

  // 📊 Get status (delegate to base class)
  getStatus() {
    return this.contentCommands.getStatus();
  }

  // 📢 Notify admins (delegate to base class)
  async notifyAdmins(title, message) {
    return await this.contentCommands.notifyAdmins(title, message);
  }

  // 🔒 Check admin access (delegate to base class)
  checkAdminAccess(msg) {
    return this.contentCommands.checkAdminAccess(msg);
  }

  // 🛡️ Admin verification (delegate to base class)
  isAdmin(userId) {
    return this.contentCommands.isAdmin(userId);
  }

  // 🌐 Setup webhook for Vercel/Serverless environments
  async setupWebhook() {
    try {
      const webhookUrl = `${this.contentCommands.baseUrl}/api/webhook/telegram`;
      console.log('🌐 Setting webhook to:', webhookUrl);
      
      // Set the webhook
      const result = await this.bot.setWebHook(webhookUrl, {
        allowed_updates: ['message', 'callback_query'],
        max_connections: 40,
        drop_pending_updates: true
      });
      
      if (result) {
        console.log('✅ Webhook set successfully');
        
        // Verify webhook info
        const webhookInfo = await this.bot.getWebHookInfo();
        console.log('🔍 Webhook info:', {
          url: webhookInfo.url,
          has_custom_certificate: webhookInfo.has_custom_certificate,
          pending_update_count: webhookInfo.pending_update_count,
          max_connections: webhookInfo.max_connections
        });
        
      return true;
      } else {
        console.error('❌ Failed to set webhook');
        return false;
      }
    } catch (error) {
      console.error('❌ Error setting up webhook:', error);
      return false;
    }
  }
}

module.exports = GizeBotCommands;