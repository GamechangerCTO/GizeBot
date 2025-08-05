// 🎯 Content Commands Module - Predictions, Promos, Results
const BaseBotCommands = require('./base-bot');

class ContentCommands extends BaseBotCommands {
  constructor() {
    super();
  }

  // 🎁 Handle /sendpromo command
  setupSendPromoCommand() {
    this.bot.onText(/\/sendpromo(?:\s+(.+))?/, async (msg, match) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        const category = match[1] || 'football'; // Default to football

        await this.bot.sendMessage(chatId, '🎁 Sending promotional message...');

        const response = await this.makeApiCall('/api/manual/promo', {
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

        const response = await this.makeApiCall('/api/manual/bonus', {
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

        const response = await this.makeApiCall('/api/manual/predictions');

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
        await this.bot.sendMessage(chatId, '📊 Sending match results...');

        const response = await this.makeApiCall('/api/manual/results');

        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Results sent successfully!\n` +
            `📧 Message ID: ${response.data.messageId}\n` +
            `🎯 Matches: ${response.data.matchCount || 'N/A'}\n` +
            `⏰ Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
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

  // 🔧 Setup all content commands
  setupContentCommands() {
    this.setupSendPromoCommand();
    this.setupSendBonusCommand();
    this.setupPredictionsCommand();
    this.setupResultsCommand();
  }
}

module.exports = ContentCommands;