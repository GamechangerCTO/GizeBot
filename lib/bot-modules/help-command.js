// ❓ Help Command Module - Admin panel and help system
const BaseBotCommands = require('./base-bot');

class HelpCommand extends BaseBotCommands {
  constructor() {
    super();
  }

  // ❓ Handle /help command with advanced admin panel
  setupHelpCommand() {
    this.bot.onText(/\/help/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;

        // Create comprehensive admin panel
        const adminPanel = {
          text: `🎮 **GizeBets Admin Control Panel**\n\n` +
                `🤖 Welcome, Admin! Here are your available commands:\n\n` +
                `**📝 Content Management**\n` +
                `• /predictions - Send match predictions\n` +
                `• /sendpromo [type] - Send promotional message\n` +
                `• /results - Send match results\n` +
                `• /sendbonus ALL "message" - Send bonus message\n\n` +
                `**🔴 Live Matches**\n` +
                `• /active_matches - Show current live matches\n` +
                `• /upcoming_matches - Show next 2-3 hours\n` +
                `• /today_matches - Today's schedule\n` +
                `• /send_live - Send live predictions\n` +
                `• /live_results - Post live results\n\n` +
                `**🔧 System Control**\n` +
                `• /status - Quick system status\n` +
                `• /health - Detailed health check\n` +
                `• /restart - Restart bot system\n` +
                `• /stop - Stop system\n` +
                `• /force_stop - Emergency stop\n\n` +
                `**📊 Analytics & Admin**\n` +
                `• /analytics - Channel analytics\n` +
                `• /coupons [action] - Manage coupons\n` +
                `• /scrape_website - Update data\n` +
                `• /compare_data - Data accuracy check\n\n` +
                `**⚙️ Automation**\n` +
                `• /automation [action] - Control automation\n` +
                `• /schedule [action] - Manage schedules\n` +
                `• /settings [action] - System settings\n\n` +
                `🌍 **Current Time:** ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })} (ET)`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⚽ Send Predictions', callback_data: 'quick_predictions' },
                { text: '🎁 Send Promo', callback_data: 'quick_promo' }
              ],
              [
                { text: '🔴 Live Matches', callback_data: 'quick_live_matches' },
                { text: '📊 System Status', callback_data: 'quick_status' }
              ],
              [
                { text: '🏥 Health Check', callback_data: 'quick_health' },
                { text: '📈 Analytics', callback_data: 'quick_analytics' }
              ],
              [
                { text: '⚙️ Settings', callback_data: 'quick_settings' },
                { text: '🔄 Restart Bot', callback_data: 'quick_restart' }
              ],
              [
                { text: '📋 Command List', callback_data: 'show_command_list' }
              ]
            ]
          }
        };

        await this.bot.sendMessage(chatId, adminPanel.text, {
          parse_mode: adminPanel.parse_mode,
          reply_markup: adminPanel.reply_markup
        });

      } catch (error) {
        console.error('❌ Error in help command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error showing admin panel: ' + error.message);
      }
    });
  }

  // 📋 Show detailed command list
  async showCommandList(chatId, messageId) {
    const commandsList = 
      `📋 **Complete Command Reference**\n\n` +
      `**Content Commands:**\n` +
      `/predictions - Generate and send match predictions\n` +
      `/sendpromo [football|casino|sports|special] - Send promotional content\n` +
      `/results - Send latest match results\n` +
      `/sendbonus ALL "Your message" - Send bonus message\n\n` +
      
      `**Live Match Commands:**\n` +
      `/active_matches - Show currently live matches\n` +
      `/upcoming_matches - Matches in next 2-3 hours\n` +
      `/today_matches - All matches scheduled today\n` +
      `/send_live - Send predictions for live matches\n` +
      `/live_results - Post results for completed live matches\n\n` +
      
      `**System Commands:**\n` +
      `/status - Basic system status and uptime\n` +
      `/health - Comprehensive health check with recommendations\n` +
      `/restart - Safely restart the bot system\n` +
      `/stop - Stop all system processes\n` +
      `/force_stop - Emergency stop (use if bot is stuck)\n\n` +
      
      `**Analytics Commands:**\n` +
      `/analytics - View channel performance analytics\n` +
      `/coupons [list|create|stats] - Manage promotional coupons\n` +
      `/scrape_website - Update data from GizeBets website\n` +
      `/compare_data - Compare API data with website data\n\n` +
      
      `**Automation Commands:**\n` +
      `/automation [status|enable|disable|reset] - Control automation\n` +
      `/schedule [view|reset|optimize] - Manage posting schedules\n` +
      `/settings [view|reset|backup|restore] - System configuration\n\n` +
      
      `**Tips:**\n` +
      `• Commands without parameters show current status\n` +
      `• Use /help to return to the main admin panel\n` +
      `• Emergency: Use /force_stop then /restart if bot gets stuck\n` +
      `• All times are in Ethiopian timezone (Africa/Addis_Ababa)`;

    await this.bot.editMessageText(commandsList, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔙 Back to Main Panel', callback_data: 'back_to_main_menu' }
          ]
        ]
      }
    });
  }
}

module.exports = HelpCommand;