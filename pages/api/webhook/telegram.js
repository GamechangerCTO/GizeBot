// Telegram Webhook Handler - Improved Direct Processing

const SimpleBotCommands = require('../../../lib/simple-bot-commands');

// Keep a global instance to avoid recreating
let botInstance = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    console.log('📨 Telegram webhook received:', JSON.stringify(update, null, 2));
    
    // Debug logging
    if (update.callback_query) {
      console.log('🔍 DEBUG: Callback query detected:', update.callback_query.data);
      console.log('🔍 DEBUG: Chat ID:', update.callback_query.message.chat.id);
    }

    // Initialize bot instance if needed
    if (!botInstance) {
      console.log('🤖 Initializing Simple Bot Commands for webhook...');
      botInstance = new SimpleBotCommands();
      console.log('✅ Bot commands initialized for webhook mode');
    }

    // Process different types of updates DIRECTLY
    if (update.message) {
      console.log('💬 Processing message update directly...');
      
      // Check if this is a command message
      const msg = update.message;
      const text = msg.text || '';
      
      // Process commands directly instead of emitting events
      if (text.startsWith('/start') || text.startsWith('/menu')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.showMainMenu(msg.chat.id);
        }
      } else if (text.startsWith('/predictions')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handlePredictionsCommand(msg);
        }
      } else if (text.startsWith('/promo')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handlePromoCommand(msg);
        }
      } else if (text.startsWith('/results')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleResultsCommand(msg);
        }
      } else if (text.startsWith('/status')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleStatusCommand(msg);
        }
      } else if (text.startsWith('/today')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleTodayCommand(msg);
        }
      } else if (text.startsWith('/live')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleLiveCommand(msg);
        }
      } else if (text.startsWith('/help')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleHelpCommand(msg);
        }
      } else if (text.startsWith('/analytics')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleAnalyticsCommand(msg);
        }
      }
    }

    if (update.callback_query) {
      console.log('🔘 Processing callback query directly...');
      
      const callbackQuery = update.callback_query;
      const action = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      // Acknowledge the callback immediately
      await botInstance.bot.answerCallbackQuery(callbackQuery.id);

      // Handle different actions directly
      try {
        switch (action) {
          case 'cmd_menu':
            await botInstance.bot.editMessageText(
              '🔄 <i>Refreshing menu...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.showMainMenu(chatId);
            break;

          case 'cmd_predictions':
            console.log('🔍 DEBUG: Processing cmd_predictions callback');
            await botInstance.bot.editMessageText(
              '⚽ <i>Sending predictions...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.executePredictions(chatId);
            break;

          case 'cmd_promo':
            await botInstance.bot.editMessageText(
              '🎁 <i>Sending promo...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.executePromo(chatId);
            break;

          case 'cmd_results':
            await botInstance.bot.editMessageText(
              '📊 <i>Sending results...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.executeResults(chatId);
            break;

          case 'cmd_live':
            await botInstance.bot.editMessageText(
              '🔴 <i>Fetching live matches...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.showLiveMatches(chatId);
            break;

          case 'cmd_today':
            await botInstance.bot.editMessageText(
              '📅 <i>Loading today\'s games...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.showTodayGames(chatId);
            break;

          case 'cmd_status':
            await botInstance.bot.editMessageText(
              '📈 <i>Checking system status...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.showSystemStatus(chatId);
            break;

          case 'cmd_analytics':
            await botInstance.bot.editMessageText(
              '📊 <i>מקבל נתוני אנליטיקות...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.showAnalyticsReport(chatId);
            break;

          default:
            await botInstance.bot.sendMessage(chatId, '❓ Unknown action');
        }
      } catch (error) {
        console.error('❌ Callback error:', error);
        await botInstance.bot.sendMessage(chatId, '❌ Error: ' + error.message);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
      updateType: update.message ? 'message' : update.callback_query ? 'callback_query' : 'other'
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}