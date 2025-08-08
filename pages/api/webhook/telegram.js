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
      
      // Wizard flow (step-by-step input capture)
      const { getState, setState, clearState } = require('../../../lib/wizard-state');
      const st = await getState(msg.chat.id);
      if (st) {
        // New: handle awaited manual inputs for wizard (mobile-friendly)
        if (st.awaiting) {
          const { setState, clearState } = require('../../../lib/wizard-state');
          if (st.type === 'buttons') {
            if (st.awaiting === 'b1_text') {
              st.data = st.data || {}; st.data.b1 = st.data.b1 || {}; st.data.b1.text = text;
              st.awaiting = null; st.step = 2; await setState(msg.chat.id, st);
              await botInstance.bot.sendMessage(msg.chat.id, '🧩 Choose URL for Button 1', {
                reply_markup: { inline_keyboard: [[
                  { text: 'Football', callback_data: 'wiz:buttons:2:url:https://gizebets.et/league?sportId=0' },
                  { text: 'Live', callback_data: 'wiz:buttons:2:url:https://gizebets.et/live' }
                ], [{ text: 'Promo', callback_data: 'wiz:buttons:2:url:https://gizebets.et/promo-campaigns' }],
                [{ text: '✍️ Type URL', callback_data: 'wiz:buttons:2:url:custom' }]] }
              });
              return res.status(200).json({ success: true });
            }
            if (st.awaiting === 'b1_url') {
              st.data = st.data || {}; st.data.b1 = st.data.b1 || {}; st.data.b1.url = text;
              st.awaiting = null; st.step = 99; await setState(msg.chat.id, st);
              await botInstance.bot.sendMessage(msg.chat.id, '📦 Save scope?', {
                reply_markup: { inline_keyboard: [[
                  { text: '✅ Persist', callback_data: 'wiz:buttons:scope:persist' },
                  { text: '🕘 Once', callback_data: 'wiz:buttons:scope:once' }
                ]] }
              });
              return res.status(200).json({ success: true });
            }
          }
          if (st.type === 'coupon') {
            if (st.awaiting === 'coupon_code') {
              st.data = st.data || {}; st.data.code = text; st.awaiting = null; st.step = 2;
              await setState(msg.chat.id, st);
              await botInstance.bot.sendMessage(msg.chat.id, '🎟️ Choose offer', {
                reply_markup: { inline_keyboard: [[
                  { text: '100 ETB Bonus', callback_data: 'wiz:coupon:2:offer:100 ETB Bonus' },
                  { text: 'Free Bet', callback_data: 'wiz:coupon:2:offer:Free Bet' }
                ], [{ text: 'Boost 10%', callback_data: 'wiz:coupon:2:offer:Boost 10%' }],
                [{ text: '✍️ Type offer', callback_data: 'wiz:coupon:2:offer:custom' }]] }
              });
              return res.status(200).json({ success: true });
            }
            if (st.awaiting === 'coupon_offer') {
              st.data = st.data || {}; st.data.offer = text; st.awaiting = null; st.step = 3;
              await setState(msg.chat.id, st);
              await botInstance.bot.sendMessage(msg.chat.id, '📦 Save scope?', {
                reply_markup: { inline_keyboard: [[
                  { text: '✅ Persist', callback_data: 'wiz:coupon:3:scope:persist' },
                  { text: '🕘 Once', callback_data: 'wiz:coupon:3:scope:once' }
                ]] }
              });
              return res.status(200).json({ success: true });
            }
          }
        }

        if (st.type === 'buttons') {
          const { setButtons } = require('../../../lib/settings-store');
          if (st.step === 1) {
            st.data.b1 = { text: text };
            st.step = 2;
            await setState(msg.chat.id, st);
            await botInstance.bot.sendMessage(msg.chat.id, '🧩 Step 2/4: Enter URL for Button 1');
            return res.status(200).json({ success: true });
          } else if (st.step === 2) {
            st.data.b1.url = text;
            st.step = 3;
            await setState(msg.chat.id, st);
            await botInstance.bot.sendMessage(msg.chat.id, '🧩 Step 3/4: Enter text for Button 2 (or type skip)');
            return res.status(200).json({ success: true });
          } else if (st.step === 3) {
            if (text.toLowerCase() !== 'skip') st.data.b2 = { text };
            st.step = 4;
            await setState(msg.chat.id, st);
            await botInstance.bot.sendMessage(msg.chat.id, st.data.b2 ? '🧩 Step 4/4: Enter URL for Button 2 (or type skip)' : '🧩 Step 4/4: Enter text for Button 3 (or type skip)');
            return res.status(200).json({ success: true });
          } else if (st.step === 4) {
            if (st.data.b2 && text.toLowerCase() !== 'skip') st.data.b2.url = text;
            else if (!st.data.b2 && text.toLowerCase() !== 'skip') st.data.b3 = { text };
            // finalize collect remaining if any
            const buttons = [];
            if (st.data.b1?.text && st.data.b1?.url) buttons.push(st.data.b1);
            if (st.data.b2?.text && st.data.b2?.url) buttons.push(st.data.b2);
            if (st.data.b3?.text && st.data.b3?.url) buttons.push(st.data.b3);
            await setButtons(buttons, 'persist');
            await clearState(msg.chat.id);
            await botInstance.bot.sendMessage(msg.chat.id, '✅ Buttons updated (persist).');
            return res.status(200).json({ success: true });
          }
        }
        if (st.type === 'coupon') {
          const { setCoupon } = require('../../../lib/settings-store');
          if (st.step === 1) {
            st.data.code = text;
            st.step = 2;
            await setState(msg.chat.id, st);
            await botInstance.bot.sendMessage(msg.chat.id, '🎟️ Step 2/3: Enter offer text');
            return res.status(200).json({ success: true });
          } else if (st.step === 2) {
            st.data.offer = text;
            st.step = 3;
            await setState(msg.chat.id, st);
            await botInstance.bot.sendMessage(msg.chat.id, '🎯 Scope? Reply with: once or persist');
            return res.status(200).json({ success: true });
          } else if (st.step === 3) {
            const scope = text.toLowerCase().startsWith('o') ? 'once' : 'persist';
            await setCoupon({ code: st.data.code, offer: st.data.offer }, scope);
            await clearState(msg.chat.id);
            await botInstance.bot.sendMessage(msg.chat.id, `✅ Coupon updated (${scope}).`);
            return res.status(200).json({ success: true });
          }
        }
      }

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
      } else if (text.startsWith('/summary')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleSummaryCommand(msg);
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
      } else if (text.startsWith('/buttons')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleButtonsConfig(msg);
        }
      } else if (text.startsWith('/coupon')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.handleCouponConfig(msg);
        }
      } else if (text.startsWith('/emergency_stop') || text.startsWith('/stop')) {
        if (botInstance.checkAdminAccess(msg)) {
          await botInstance.emergencyStop(msg.chat.id);
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

      // Debounce: ignore repeated clicks on same action within short window
      try {
        const { isRateLimited, setRateLimit } = require('../../../lib/storage');
        const debounceKey = `cb:${chatId}:${action}`;
        if (await isRateLimited(debounceKey)) {
          // Silently ignore spams to avoid flooding
          return res.status(200).json({ success: true, message: 'debounced' });
        }
        await setRateLimit(debounceKey, 5); // 5 seconds debounce per action per chat
      } catch (e) {
        console.log('⚠️ debounce not available:', e.message);
      }

      // Handle different actions directly
      try {
        // Wizard actions prefixed with wiz:
        if (action.startsWith('wiz:')) {
          const { getState, setState, clearState } = require('../../../lib/wizard-state');
          const st = await getState(chatId);
          // Generic text selection helper
          if (action.startsWith('wiz:text:')) {
            const choice = action.replace('wiz:text:', '');
            if (choice === 'custom') {
              st.awaiting = 'b1_text'; await setState(chatId, st);
              return await botInstance.bot.sendMessage(chatId, '✍️ Type text for Button 1');
            }
            st.data = st.data || {}; st.data.b1 = st.data.b1 || {}; st.data.b1.text = choice;
            st.awaiting = null; st.step = 2; await setState(chatId, st);
            return await botInstance.bot.sendMessage(chatId, '🧩 Choose URL for Button 1', {
              reply_markup: { inline_keyboard: [[
                { text: 'Football', callback_data: 'wiz:buttons:2:url:https://gizebets.et/league?sportId=0' },
                { text: 'Live', callback_data: 'wiz:buttons:2:url:https://gizebets.et/live' }
              ], [{ text: 'Promo', callback_data: 'wiz:buttons:2:url:https://gizebets.et/promo-campaigns' }],
              [{ text: '✍️ Type URL', callback_data: 'wiz:buttons:2:url:custom' }]] }
            });
          }
          if (action.startsWith('wiz:buttons:2:url:')) {
            const url = action.replace('wiz:buttons:2:url:', '');
            if (url === 'custom') {
              st.awaiting = 'b1_url'; await setState(chatId, st);
              return await botInstance.bot.sendMessage(chatId, '✍️ Type URL for Button 1');
            }
            st.data = st.data || {}; st.data.b1 = st.data.b1 || {}; st.data.b1.url = url;
            st.step = 99; await setState(chatId, st);
            return await botInstance.bot.sendMessage(chatId, '📦 Save scope?', {
              reply_markup: { inline_keyboard: [[
                { text: '✅ Persist', callback_data: 'wiz:buttons:scope:persist' },
                { text: '🕘 Once', callback_data: 'wiz:buttons:scope:once' }
              ]] }
            });
          }
          if (action.startsWith('wiz:buttons:scope:')) {
            const scope = action.endsWith(':once') ? 'once' : 'persist';
            const { setButtons } = require('../../../lib/settings-store');
            const buttons = [];
            if (st?.data?.b1?.text && st?.data?.b1?.url) buttons.push(st.data.b1);
            if (st?.data?.b2?.text && st?.data?.b2?.url) buttons.push(st.data.b2);
            if (st?.data?.b3?.text && st?.data?.b3?.url) buttons.push(st.data.b3);
            await setButtons(buttons, scope);
            await clearState(chatId);
            return await botInstance.bot.sendMessage(chatId, `✅ Buttons updated (${scope}).`);
          }
          if (action.startsWith('wiz:coupon:2:offer:')) {
            const offer = action.replace('wiz:coupon:2:offer:', '');
            if (offer === 'custom') {
              st.awaiting = 'coupon_offer'; await setState(chatId, st);
              return await botInstance.bot.sendMessage(chatId, '✍️ Type offer text');
            }
            st.data = st.data || {}; st.data.offer = offer; st.step = 3; await setState(chatId, st);
            return await botInstance.bot.sendMessage(chatId, '📦 Save scope?', {
              reply_markup: { inline_keyboard: [[
                { text: '✅ Persist', callback_data: 'wiz:coupon:3:scope:persist' },
                { text: '🕘 Once', callback_data: 'wiz:coupon:3:scope:once' }
              ]] }
            });
          }
          if (action.startsWith('wiz:coupon:3:scope:')) {
            const scope = action.endsWith(':once') ? 'once' : 'persist';
            const { setCoupon } = require('../../../lib/settings-store');
            await setCoupon({ code: st?.data?.code, offer: st?.data?.offer }, scope);
            await clearState(chatId);
            return await botInstance.bot.sendMessage(chatId, `✅ Coupon updated (${scope}).`);
          }
        }

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

          case 'cmd_summary':
            await botInstance.bot.editMessageText(
              '📋 <i>Sending summary...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.executeSummary(chatId);
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
          case 'cmd_buttons':
            await botInstance.startButtonsWizard(chatId, messageId);
            break;
          case 'cmd_coupon':
            await botInstance.startCouponWizard(chatId, messageId);
            break;

          case 'cmd_analytics':
            await botInstance.bot.editMessageText(
              '📊 <i>Loading analytics data...</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.showAnalyticsReport(chatId);
            break;

          case 'cmd_emergency_stop':
            await botInstance.bot.editMessageText(
              '🆘 <i>EMERGENCY STOP ACTIVATED!</i>',
              { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
            );
            await botInstance.emergencyStop(chatId);
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