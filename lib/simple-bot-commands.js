// 🤖 GizeBets Simple Bot Commands - Clean & Direct
// All essential commands in one file - no complex modules!

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

class SimpleBotCommands {
  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('❌ TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: false, // Disable polling for webhook mode
      request: {
        agentOptions: {
          keepAlive: true,
          family: 4
        }
      }
    });
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

  // 🔐 Admin verification with detailed logging and immediate feedback
  checkAdminAccess(msg) {
    const userId = msg.from.id;
    const userName = msg.from.first_name || msg.from.username || 'Unknown';
    
    console.log(`🔍 Access check: User ${userName} (${userId}) trying to access bot`);
    console.log(`👥 Admin users: ${this.adminUsers.join(', ')}`);
    console.log(`🔧 Admin users type check:`, this.adminUsers.map(id => typeof id));
    console.log(`🔧 User ID type check:`, typeof userId);
    
    // First, always send a response so user knows bot is working
    this.bot.sendMessage(msg.chat.id, '🤖 <i>Processing your request...</i>', { parse_mode: 'HTML' });
    
    if (!this.isAdmin(userId)) {
      console.log(`❌ Access DENIED for user ${userId}`);
      this.bot.sendMessage(msg.chat.id, 
        '❌ <b>Access Denied</b>\n\n' +
        '🔒 Only authorized admins can use this bot\n' +
        `📱 Your ID: ${userId}\n` +
        `👥 Admin IDs: ${this.adminUsers.join(', ')}\n` +
        '📱 Channel: @gizebetgames\n' +
        `⏰ Time: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`,
        { parse_mode: 'HTML' }
      );
      return false;
    }
    
    console.log(`✅ Access GRANTED for admin ${userId}`);
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
        { text: '📊 Analytics', callback_data: 'cmd_analytics' },
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

    // /analytics command
    this.bot.onText(/\/analytics/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;
      await this.handleAnalyticsCommand(msg);
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

          case 'cmd_analytics':
            await this.bot.editMessageText(
              '📊 <i>Loading analytics data...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await this.showAnalyticsReport(chatId);
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
        : 'https://gize-bot.vercel.app'; // Force correct URL, ignore VERCEL_URL env var

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
    console.log('🎁 Starting promo execution for chat:', chatId);
    try {
      // Determine base URL
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://gize-bot.vercel.app'; // Force correct URL, ignore VERCEL_URL env var

      console.log('🌐 Using base URL:', baseUrl);

      // Call the manual promo API
      console.log('📡 Making API call to manual promo...');
      const response = await axios.post(`${baseUrl}/api/manual/promo`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-bot-internal': 'true'
        },
        timeout: 60000 // 60 seconds timeout
      });

      console.log('📡 Promo API response:', response.data);

      if (response.data.success) {
        const successMessage = `✅ <b>Promo sent successfully!</b>\n\n` +
          `🎁 <b>Type:</b> Football\n` +
          `📝 <b>Channel:</b> @gizebetgames\n` +
          `📧 <b>Message ID:</b> ${response.data.result?.messageId || 'N/A'}\n` +
          `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;
        
        console.log('📤 Sending success message to chat:', chatId);
        await this.bot.sendMessage(chatId, successMessage, { parse_mode: 'HTML' });
        console.log('✅ Success message sent successfully');
      } else {
        const errorMessage = '❌ Failed to send promo: ' + (response.data.message || 'Unknown error');
        console.log('❌ Sending error message:', errorMessage);
        await this.bot.sendMessage(chatId, errorMessage);
      }

    } catch (error) {
      console.error('❌ Promo API error:', error);
      const errorMessage = '❌ Failed to send promo: ' + error.message;
      console.log('📤 Sending error message to chat:', chatId);
      try {
        await this.bot.sendMessage(chatId, errorMessage);
        console.log('❌ Error message sent successfully');
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }
    }
    console.log('🎁 Promo execution completed');
  }

  // 📊 Execute results via API
  async executeResults(chatId) {
    try {

      
      // Determine base URL
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://gize-bot.vercel.app'; // Force correct URL, ignore VERCEL_URL env var

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
        message += `${index + 1}. <b>${match.homeTeam}</b> ` +
                  `${match.homeScore}-${match.awayScore} ` +
                  `<b>${match.awayTeam}</b>\n` +
                  `   🏆 ${match.competition}\n` +
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
        
        message += `${index + 1}. <b>${match.homeTeam.name}</b> vs <b>${match.awayTeam.name}</b>\n` +
                  `   🏆 ${match.competition.name}\n` +
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

  // 📊 Show analytics report with click tracking
  async showAnalyticsReport(chatId) {
    try {
      // Check if system is running first
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://gize-bot.vercel.app'; // Force correct URL, ignore VERCEL_URL env var
      
      // Fetch analytics data from API
      const analyticsUrl = `${baseUrl}/api/analytics`;
      const axios = require('axios');
      
      const response = await axios.get(analyticsUrl);
      const data = response.data;
      
      if (!data.success) {
        await this.bot.sendMessage(chatId, 
                  '⚠️ <b>Analytics Not Available</b>\n\n' +
        'System needs to be running to view analytics data.\n' +
        'Start the system with /api/start and try again.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      // Build analytics message in Hebrew
      const overview = data.overview;
      const dailyStats = data.dailyStats;
      const topButtons = data.clickTracking.topButtons;
      
      let message = `📊 <b>GizeBets Analytics Report</b> 📊\n\n`;
      
      // System overview
      message += `🔥 <b>סקירה כללית:</b>\n`;
      message += `📡 סטטוס: ${overview.systemStatus}\n`;
      message += `📝 הודעות שנשלחו: ${overview.totalMessagesPosted}\n`;
      message += `👆 סה״כ קלקים: ${overview.totalClicks}\n`;
      message += `📈 אחוז קלקים ממוצע: ${overview.averageCTR}\n\n`;
      
      // Daily stats
      message += `📅 <b>נתוני היום:</b>\n`;
      message += `⚽ חיזויים: ${dailyStats.predictions.posted} (${dailyStats.predictions.clicks} קלקים)\n`;
      message += `📊 תוצאות: ${dailyStats.results.posted} (${dailyStats.results.clicks} קלקים)\n`;
      message += `🎁 פרומו: ${dailyStats.promos.posted} (${dailyStats.promos.clicks} קלקים)\n\n`;
      
      // Top performing content
      if (overview.topPerformingContent && overview.topPerformingContent.length > 0) {
        message += `🏆 <b>תוכן בעל הביצועים הטובים ביותר:</b>\n`;
        overview.topPerformingContent.slice(0, 3).forEach((content, index) => {
          const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
          message += `${emoji} ${content.type}: ${content.clicks} קלקים (${content.ctr})\n`;
        });
        message += '\n';
      }
      
      // Recent activity
      if (data.clickTracking.recentActivity && data.clickTracking.recentActivity.length > 0) {
        message += `🔔 <b>פעילות אחרונה:</b>\n`;
        data.clickTracking.recentActivity.slice(0, 5).forEach(activity => {
          const time = new Date(activity.timestamp).toLocaleTimeString('he-IL', {
            timeZone: 'Africa/Addis_Ababa',
            hour: '2-digit',
            minute: '2-digit'
          });
          message += `• ${activity.type} (${time}): ${activity.clicks} קלקים\n`;
        });
        message += '\n';
      }
      
      // Performance recommendations
      if (data.recommendations && data.recommendations.length > 0) {
        message += `💡 <b>המלצות:</b>\n`;
        data.recommendations.slice(0, 2).forEach(rec => {
          const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          message += `${priorityEmoji} ${rec.message}\n`;
        });
        message += '\n';
      }
      
      message += `⏰ <b>זמן עדכון:</b> ${new Date().toLocaleString('he-IL', { 
        timeZone: 'Africa/Addis_Ababa' 
      })}\n`;
      message += `🌍 <b>איזור זמן:</b> אתיופיה`;

      // Create interactive buttons
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Refresh Data', callback_data: 'cmd_analytics' },
            { text: '📈 System Status', callback_data: 'cmd_status' }
          ],
          [
            { text: '🏠 תפריט ראשי', callback_data: 'cmd_menu' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('❌ Analytics error:', error);
      
      let errorMessage = '❌ <b>Error Getting Analytics Data</b>\n\n';
      
      if (error.code === 'ECONNREFUSED' || error.response?.status === 400) {
        errorMessage += 'System is not currently active.\n';
        errorMessage += 'Start the system with:\n';
        errorMessage += '• /api/start\n';
        errorMessage += '• או לחץ על כפתור התפריט הראשי';
      } else {
        errorMessage += `Error: ${error.message}\n`;
        errorMessage += 'נסה שוב עוד כמה דקות.';
      }

      await this.bot.sendMessage(chatId, errorMessage, { parse_mode: 'HTML' });
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
        // Auto-setup webhook in production
        await this.setupWebhook();
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
    await this.bot.sendMessage(msg.chat.id, '⚽ <i>Processing predictions request...</i>', { parse_mode: 'HTML' });
    await this.executePredictions(msg.chat.id);
  }

  async handlePromoCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, '🎁 <i>Processing promo request...</i>', { parse_mode: 'HTML' });
    await this.executePromo(msg.chat.id);
  }

  async handleResultsCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, '📊 <i>Processing results request...</i>', { parse_mode: 'HTML' });
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
      `📈 <b>/status</b> - Check system status\n` +
      `📊 <b>/analytics</b> - View click analytics and stats\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 <b>Only authorized admins can use this bot</b>\n` +
      `📱 <b>Channel:</b> @gizebetgames\n` +
      `⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

    await this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'HTML' });
  }

  async handleAnalyticsCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, '📊 <i>מקבל נתוני אנליטיקות...</i>', { parse_mode: 'HTML' });
    await this.showAnalyticsReport(msg.chat.id);
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
        { command: 'status', description: '📈 System Status' },
        { command: 'analytics', description: '📊 Analytics & Click Stats' }
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

  // 🌐 Setup webhook automatically in production
  async setupWebhook() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN not configured');
        return false;
      }

      const baseUrl = `https://api.telegram.org/bot${token}`;
      const webhookUrl = process.env.VERCEL_URL 
        ? `https://gize-bot.vercel.app/api/webhook/telegram`
        : 'https://gize-bot.vercel.app/api/webhook/telegram'; // fallback

      console.log('🌐 Setting up webhook:', webhookUrl);

      const response = await fetch(`${baseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Webhook configured successfully');
        return true;
      } else {
        console.error('❌ Failed to configure webhook:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Webhook setup error:', error);
      return false;
    }
  }
}

module.exports = SimpleBotCommands;