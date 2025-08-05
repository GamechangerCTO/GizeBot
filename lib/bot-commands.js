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
        {
          command: 'sendpromo',
          description: '🎁 Send promotional message immediately'
        },
        {
          command: 'sendbonus',
          description: '💰 Send bonus code to all users'
        },
        {
          command: 'predictions',
          description: '⚽ Send match predictions manually'
        },
        {
          command: 'results',
          description: '📊 Send match results'
        },
        {
          command: 'status',
          description: '📈 Get system status'
        },
        {
          command: 'help',
          description: '❓ Show all available commands'
        },
        {
          command: 'stop',
          description: '🛑 Stop system processes'
        },
        {
          command: 'restart',
          description: '🔄 Restart bot commands'
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

  // ❓ Handle /help command
  setupHelpCommand() {
    this.bot.onText(/\/help/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      const helpMessage = `
🤖 **GizeBets Admin Commands**

**Promotional Commands:**
🎁 \`/sendpromo [category]\` - Send promotional message
   Example: \`/sendpromo football\`

💰 \`/sendbonus ALL "message"\` - Send bonus code to all users  
   Example: \`/sendbonus ALL "Use code WIN10 now 🎁"\`

**Content Commands:**
⚽ \`/predictions\` - Send match predictions manually
📊 \`/results\` - Send match results

**System Commands:**
📈 \`/status\` - Get system status and uptime
🛑 \`/stop\` - Stop system processes
🔄 \`/restart\` - Restart bot commands
❓ \`/help\` - Show this help message

**Bot:** Sportbot (@Africansportbot)
**Access:** Admin only (@tamee_t, @Pizzakitfo)
**Channel:** @gizebetgames
**Timezone:** Africa/Addis_Ababa
      `;

      await this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
    });
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