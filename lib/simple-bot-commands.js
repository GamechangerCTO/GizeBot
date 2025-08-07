// 🤖 GizeBets Simple Bot Commands - Clean & Direct
// All essential commands in one file - no complex modules!

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

class SimpleBotCommands {
  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('❌ TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    this.channelId = process.env.CHANNEL_ID;
    
    // Admin users - from environment variable or default
    this.adminUsers = this.parseAdminUsers();

    console.log('🤖 Simple Bot Commands initialized');
  }

  // 🔧 Parse admin users from environment
  parseAdminUsers() {
    const adminIds = [];
    
    // Try to get from environment variable
    if (process.env.ADMIN_USER_IDS) {
      const envIds = process.env.ADMIN_USER_IDS.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      adminIds.push(...envIds);
    }
    
    // Add default test admin if no IDs found
    if (adminIds.length === 0) {
      adminIds.push(2024477887); // Test admin
      console.log('⚠️ No ADMIN_USER_IDS found, using default test admin');
    }
    
    console.log('🔑 Admin users:', adminIds);
    return adminIds;
  }

  // 🔐 Check if user is admin
  isAdmin(userId) {
    return this.adminUsers.includes(userId);
  }

  // 🔐 Admin verification with user-friendly message
  checkAdminAccess(msg) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, 
        '❌ Access denied. This bot is for authorized admins only.\n\n' +
        '🔑 To get access, contact the system administrator with your user ID: ' + msg.from.id
      );
      return false;
    }
    return true;
  }

  // 🏠 Main Menu - The heart of the bot
  async showMainMenu(chatId) {
    const menuText = `🎮 <b>GizeBets Admin Control</b> 🎮

🔥 <i>Choose your action:</i>

📝 <b>Content Management:</b>
• Send predictions, promos, results

🔴 <b>Live & Today:</b>  
• Check live matches & today's games

⚙️ <b>System:</b>
• Monitor status & health

👤 <b>Admin:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })} (ET)`;

    const keyboard = [
      [
        { text: '⚽ Send Predictions', callback_data: 'cmd_predictions' },
        { text: '🎁 Send Promo', callback_data: 'cmd_promo' }
      ],
      [
        { text: '📊 Send Results', callback_data: 'cmd_results' },
        { text: '🔴 Live Matches', callback_data: 'cmd_live' }
      ],
      [
        { text: '📅 Today Games', callback_data: 'cmd_today' },
        { text: '📈 System Status', callback_data: 'cmd_status' }
      ],
      [
        { text: '🔄 Refresh Menu', callback_data: 'cmd_menu' }
      ]
    ];

    return await this.bot.sendMessage(chatId, menuText, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  // 📝 Setup all command handlers
  setupCommands() {
    console.log('🔧 Setting up simple bot commands...');

    // /start and /menu commands
    this.bot.onText(/\/start|\/menu/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.showMainMenu(msg.chat.id);
    });

    // /predictions command
    this.bot.onText(/\/predictions/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handlePredictionsCommand(msg);
    });

    // /promo command
    this.bot.onText(/\/promo/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handlePromoCommand(msg);
    });

    // /results command
    this.bot.onText(/\/results/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handleResultsCommand(msg);
    });

    // /status command
    this.bot.onText(/\/status/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handleStatusCommand(msg);
    });

    // /today command
    this.bot.onText(/\/today/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handleTodayCommand(msg);
    });

    // /live command
    this.bot.onText(/\/live/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handleLiveCommand(msg);
    });

    // /help command
    this.bot.onText(/\/help/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handleHelpCommand(msg);
    });

    // Handle callback queries (button presses)
    this.setupCallbackHandlers();

    console.log('✅ Simple bot commands ready!');
  }

  // 🔘 Handle button presses
  setupCallbackHandlers() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      // Acknowledge the callback immediately
      await this.bot.answerCallbackQuery(callbackQuery.id);

      try {
        // Handle different actions
        switch (action) {
          case 'cmd_menu':
            await this.bot.editMessageText(
              '🔄 <i>Refreshing menu...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.showMainMenu(chatId);
            break;

          case 'cmd_predictions':
            await this.bot.editMessageText(
              '⚽ <i>Sending predictions...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.executePredictions(chatId);
            break;

          case 'cmd_promo':
            await this.bot.editMessageText(
              '🎁 <i>Sending promo...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.executePromo(chatId);
            break;

          case 'cmd_results':
            await this.bot.editMessageText(
              '📊 <i>Sending results...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.executeResults(chatId);
            break;

          case 'cmd_live':
            await this.bot.editMessageText(
              '🔴 <i>Fetching live matches...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.showLiveMatches(chatId);
            break;

          case 'cmd_today':
            await this.bot.editMessageText(
              '📅 <i>Loading today\'s games...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.showTodayGames(chatId);
            break;

          case 'cmd_status':
            await this.bot.editMessageText(
              '📈 <i>Checking system status...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.showSystemStatus(chatId);
            break;

          default:
            await this.bot.sendMessage(chatId, '❓ Unknown action');
        }
      } catch (error) {
        console.error('❌ Callback error:', error);
        await this.bot.sendMessage(chatId, '❌ Error: ' + error.message);
      }
    });
  }

  // ⚽ Execute predictions via API
  async executePredictions(chatId) {
    try {

      
      // Determine base URL
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://gize-bot.vercel.app';

      // Call the manual predictions API
      const response = await axios.post(`${baseUrl}/api/manual/predictions`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-bot-internal': 'true'
        },
        timeout: 60000 // 60 seconds timeout
      });

      if (response.data.success) {
        await this.bot.sendMessage(chatId, 
          `✅ <b>Predictions sent successfully!</b>\n\n` +
          `📊 <b>Status:</b> ${response.data.message || 'Completed'}\n` +
          `📝 <b>Channel:</b> @gizebetgames\n` +
          `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`,
          { parse_mode: 'HTML' }
        );
      } else {
        await this.bot.sendMessage(chatId, '❌ Failed to send predictions: ' + (response.data.message || 'Unknown error'));
      }

    } catch (error) {
      console.error('❌ Predictions API error:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to send predictions: ' + error.message);
    }
  }

  // 🎁 Execute promo via API
  async executePromo(chatId) {
    try {

      
      // Determine base URL
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://gize-bot.vercel.app';

      // Call the manual promo API
      const response = await axios.post(`${baseUrl}/api/manual/promo`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-bot-internal': 'true'
        },
        timeout: 60000 // 60 seconds timeout
      });

      if (response.data.success) {
        await this.bot.sendMessage(chatId, 
          `✅ <b>Promo sent successfully!</b>\n\n` +
          `🎁 <b>Type:</b> Football\n` +
          `📝 <b>Channel:</b> @gizebetgames\n` +
          `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`,
          { parse_mode: 'HTML' }
        );
      } else {
        await this.bot.sendMessage(chatId, '❌ Failed to send promo: ' + (response.data.message || 'Unknown error'));
      }

    } catch (error) {
      console.error('❌ Promo API error:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to send promo: ' + error.message);
    }
  }

  // 📊 Execute results via API
  async executeResults(chatId) {
    try {

      
      // Determine base URL
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://gize-bot.vercel.app';

      // Call the manual results API
      const response = await axios.post(`${baseUrl}/api/manual/results`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-bot-internal': 'true'
        },
        timeout: 60000 // 60 seconds timeout
      });

      if (response.data.success) {
        await this.bot.sendMessage(chatId, 
          `✅ <b>Results sent successfully!</b>\n\n` +
          `📊 <b>Status:</b> ${response.data.message || 'Completed'}\n` +
          `📝 <b>Channel:</b> @gizebetgames\n` +
          `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`,
          { parse_mode: 'HTML' }
        );
      } else {
        await this.bot.sendMessage(chatId, '❌ Failed to send results: ' + (response.data.message || 'Unknown error'));
      }

    } catch (error) {
      console.error('❌ Results API error:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to send results: ' + error.message);
    }
  }

  // 🔴 Show live matches
  async showLiveMatches(chatId) {
    try {
      const FootballAPI = require('./football-api');
      const footballAPI = new FootballAPI();

      const liveMatches = await footballAPI.getLiveMatches();

      if (liveMatches.length === 0) {
        return await this.bot.sendMessage(chatId, 
          '🔴 <b>No Live Matches</b>\n\n' +
          '❌ No matches are currently being played.\n\n' +
          '⏰ Check back later!',
          { parse_mode: 'HTML' }
        );
      }

      let message = '🔴 <b>LIVE MATCHES</b> 🔴\n\n';
      
      liveMatches.slice(0, 5).forEach((match, index) => {
        const score = match.score || { home: 0, away: 0 };
        message += `${index + 1}. <b>${match.teams.home.name}</b> ` +
                  `${score.home}-${score.away} ` +
                  `<b>${match.teams.away.name}</b>\n` +
                  `   🏆 ${match.league.name}\n` +
                  `   ⏱️ ${match.status}\n\n`;
      });

      message += `📊 <b>Total:</b> ${liveMatches.length} live matches\n` +
                `⏰ <b>Updated:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('❌ Live matches error:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to get live matches: ' + error.message);
    }
  }

  // 📅 Show today's games
  async showTodayGames(chatId) {
    try {
      const FootballAPI = require('./football-api');
      const footballAPI = new FootballAPI();

      const todayMatches = await footballAPI.getTodayMatches();

      if (todayMatches.length === 0) {
        return await this.bot.sendMessage(chatId, 
          '📅 <b>No Games Today</b>\n\n' +
          '❌ No scheduled matches for today.\n\n' +
          '🔄 Try again tomorrow!',
          { parse_mode: 'HTML' }
        );
      }

      let message = '📅 <b>TODAY\'S GAMES</b> 📅\n\n';
      
      todayMatches.slice(0, 10).forEach((match, index) => {
        const kickoff = new Date(match.kickoffTime);
        const time = kickoff.toLocaleTimeString('en-US', { 
          timeZone: 'Africa/Addis_Ababa',
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        message += `${index + 1}. <b>${match.teams.home.name}</b> vs <b>${match.teams.away.name}</b>\n` +
                  `   🏆 ${match.league.name}\n` +
                  `   ⏰ ${time} ET\n\n`;
      });

      message += `📊 <b>Total:</b> ${todayMatches.length} games today\n` +
                `📅 <b>Date:</b> ${new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('❌ Today games error:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to get today\'s games: ' + error.message);
    }
  }

  // 📈 Show system status
  async showSystemStatus(chatId) {
    try {
      // Basic system status check
      const status = {
        timestamp: new Date().toISOString(),
        ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }),
        botOnline: true,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };

      const uptimeHours = Math.floor(status.uptime / 3600);
      const uptimeMinutes = Math.floor((status.uptime % 3600) / 60);

      const message = `📈 <b>SYSTEM STATUS</b> 📈\n\n` +
                     `🤖 <b>Bot:</b> ✅ Online\n` +
                     `⏰ <b>Time:</b> ${status.ethiopianTime} (ET)\n` +
                     `🕐 <b>Uptime:</b> ${uptimeHours}h ${uptimeMinutes}m\n` +
                     `💾 <b>Memory:</b> ${Math.round(status.memoryUsage.used / 1024 / 1024)}MB\n\n` +
                     `📱 <b>Channel:</b> @gizebetgames\n` +
                     `🌍 <b>Timezone:</b> Africa/Addis_Ababa\n` +
                     `🔧 <b>Version:</b> Simple Bot v1.0\n\n` +
                     `✅ All systems operational`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('❌ Status error:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to get status: ' + error.message);
    }
  }

  // 🚀 Start the bot
  async start() {
    try {
      this.setupCommands();
      
      // Set bot commands in Telegram
      await this.setBotCommands();
      
      // Set webhook or start polling based on environment
      if (process.env.VERCEL === '1') {
        console.log('🌐 Bot running in webhook mode (Vercel)');
      } else {
        await this.bot.startPolling();
        console.log('🚀 Bot polling started successfully');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      return false;
    }
  }

  // 🛑 Stop the bot
  async stop() {
    try {
      await this.bot.stopPolling();
      console.log('🛑 Bot stopped successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop bot:', error);
      return false;
    }
  }

  // 🎯 Command handlers for direct calls
  async handlePredictionsCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, '⚽ Processing predictions...');
    await this.executePredictions(msg.chat.id);
  }

  async handlePromoCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, '🎁 Processing promo...');
    await this.executePromo(msg.chat.id);
  }

  async handleResultsCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, '📊 Processing results...');
    await this.executeResults(msg.chat.id);
  }

  async handleStatusCommand(msg) {
    await this.showSystemStatus(msg.chat.id);
  }

  async handleTodayCommand(msg) {
    await this.showTodayGames(msg.chat.id);
  }

  async handleLiveCommand(msg) {
    await this.showLiveMatches(msg.chat.id);
  }

  async handleHelpCommand(msg) {
    const helpMessage = `🤖 <b>GizeBets Admin Bot - Commands List</b>\n\n` +
      `🏠 <b>/start</b> or <b>/menu</b> - Main menu with buttons\n` +
      `❓ <b>/help</b> - Show this commands list\n\n` +
      `⚽ <b>/predictions</b> - Send match predictions to channel\n` +
      `📊 <b>/results</b> - Send match results to channel\n` +
      `🎁 <b>/promo</b> - Send promo message to channel\n\n` +
      `🔴 <b>/live</b> - View live matches now\n` +
      `📅 <b>/today</b> - View today's games\n` +
      `📈 <b>/status</b> - Check system status\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 <b>Only authorized admins can use this bot</b>\n` +
      `📱 <b>Channel:</b> @gizebetgames\n` +
      `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

    await this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'HTML' });
  }

  // 📝 Set official bot commands in Telegram
  async setBotCommands() {
    try {
      const commands = [
        { command: 'start', description: '🏠 Main Menu - Home Page' },
        { command: 'menu', description: '🏠 Main Menu - Home Page' },
        { command: 'help', description: '❓ Help - Commands List' },
        { command: 'predictions', description: '⚽ Send Match Predictions' },
        { command: 'results', description: '📊 Send Match Results' },
        { command: 'promo', description: '🎁 Send Promo Message' },
        { command: 'live', description: '🔴 Live Matches Now' },
        { command: 'today', description: '📅 Today Games' },
        { command: 'status', description: '📈 System Status' }
      ];

      await this.bot.setMyCommands(commands);
      console.log('✅ Bot commands set successfully in Telegram');
      
      // Also set commands for private chats with admins
      for (const adminId of this.adminUsers) {
        try {
          await this.bot.setMyCommands(commands, {
            scope: { type: 'chat', chat_id: adminId }
          });
          console.log(`✅ Commands set for admin ${adminId}`);
        } catch (error) {
          console.log(`⚠️ Could not set commands for admin ${adminId}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to set bot commands:', error);
    }
  }

  // 🗑️ Clear old commands (helper function)
  async clearBotCommands() {
    try {
      await this.bot.setMyCommands([]);
      console.log('✅ Bot commands cleared');
    } catch (error) {
      console.error('❌ Failed to clear bot commands:', error);
    }
  }
}

module.exports = SimpleBotCommands;