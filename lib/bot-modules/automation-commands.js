// ⚙️ Automation Commands Module - Schedule, Settings, Automation Control
const BaseBotCommands = require('./base-bot');

class AutomationCommands extends BaseBotCommands {
  constructor() {
    super();
  }

  // 🤖 Handle /automation command
  setupAutomationCommand() {
    this.bot.onText(/\/automation(?:\s+(.+))?/, async (msg, match) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        const action = match[1] || 'status'; // Default to status

        await this.bot.sendMessage(chatId, '🤖 Managing automation settings...');

        const response = await this.makeApiCall('/api/automation', {
          action: action
        });

        if (response.data.success) {
          if (action === 'status') {
            const automation = response.data.automation;
            
            let automationMessage = `🤖 **Automation Status**\n\n`;
            automationMessage += `🔧 **System Status:**\n`;
            automationMessage += `• Scheduler: ${automation.scheduler?.status || 'Unknown'}\n`;
            automationMessage += `• Auto-Predictions: ${automation.predictions?.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
            automationMessage += `• Auto-Results: ${automation.results?.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
            automationMessage += `• Auto-Promos: ${automation.promos?.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n`;
            
            automationMessage += `⏰ **Schedule Status:**\n`;
            automationMessage += `• Predictions: ${automation.predictions?.nextRun || 'Not scheduled'}\n`;
            automationMessage += `• Results: ${automation.results?.nextRun || 'Not scheduled'}\n`;
            automationMessage += `• Promos: ${automation.promos?.nextRun || 'Not scheduled'}\n\n`;
            
            automationMessage += `💡 **Commands:**\n`;
            automationMessage += `• /automation enable - Enable all automation\n`;
            automationMessage += `• /automation disable - Disable all automation\n`;
            automationMessage += `• /automation reset - Reset all schedules`;
            
            await this.bot.sendMessage(chatId, automationMessage, { parse_mode: 'Markdown' });
          } else {
            await this.bot.sendMessage(chatId, 
              `✅ Automation ${action} completed successfully!\n` +
              `📊 Result: ${response.data.message || 'Success'}\n` +
              `⏰ Updated at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
            );
          }
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to manage automation: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in automation command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error managing automation: ' + error.message);
      }
    });
  }

  // ⏰ Handle /schedule command
  setupScheduleCommand() {
    this.bot.onText(/\/schedule(?:\s+(.+))?/, async (msg, match) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        const action = match[1] || 'view'; // Default to view

        await this.bot.sendMessage(chatId, '⏰ Managing posting schedule...');

        const response = await this.makeApiCall('/api/schedule', {
          action: action
        });

        if (response.data.success) {
          if (action === 'view') {
            const schedule = response.data.schedule;
            
            let scheduleMessage = `⏰ **Content Posting Schedule**\n\n`;
            
            scheduleMessage += `⚽ **Predictions:**\n`;
            if (schedule.predictions && schedule.predictions.length > 0) {
              schedule.predictions.forEach((time, index) => {
                scheduleMessage += `• ${time} (Ethiopian Time)\n`;
              });
            } else {
              scheduleMessage += `• Not scheduled\n`;
            }
            scheduleMessage += `\n`;
            
            scheduleMessage += `📊 **Results:**\n`;
            if (schedule.results && schedule.results.length > 0) {
              schedule.results.forEach((time, index) => {
                scheduleMessage += `• ${time} (Ethiopian Time)\n`;
              });
            } else {
              scheduleMessage += `• Not scheduled\n`;
            }
            scheduleMessage += `\n`;
            
            scheduleMessage += `🎁 **Promotions:**\n`;
            if (schedule.promos && schedule.promos.length > 0) {
              schedule.promos.forEach((time, index) => {
                scheduleMessage += `• ${time} (Ethiopian Time)\n`;
              });
            } else {
              scheduleMessage += `• Not scheduled\n`;
            }
            scheduleMessage += `\n`;
            
            scheduleMessage += `🌍 **Timezone:** Africa/Addis_Ababa\n`;
            scheduleMessage += `📅 **Current Time:** ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n`;
            
            scheduleMessage += `💡 **Commands:**\n`;
            scheduleMessage += `• /schedule reset - Reset all schedules\n`;
            scheduleMessage += `• /schedule optimize - Optimize timing based on analytics`;
            
            await this.bot.sendMessage(chatId, scheduleMessage, { parse_mode: 'Markdown' });
          } else {
            await this.bot.sendMessage(chatId, 
              `✅ Schedule ${action} completed successfully!\n` +
              `📊 Result: ${response.data.message || 'Success'}\n` +
              `⏰ Updated at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
            );
          }
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to manage schedule: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in schedule command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error managing schedule: ' + error.message);
      }
    });
  }

  // ⚙️ Handle /settings command
  setupSettingsCommand() {
    this.bot.onText(/\/settings(?:\s+(.+))?/, async (msg, match) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        const action = match[1] || 'view'; // Default to view

        await this.bot.sendMessage(chatId, '⚙️ Managing system settings...');

        const response = await this.makeApiCall('/api/settings/update', {
          action: action
        });

        if (response.data.success) {
          if (action === 'view') {
            const settings = response.data.settings;
            
            let settingsMessage = `⚙️ **System Settings**\n\n`;
            
            settingsMessage += `🤖 **Bot Configuration:**\n`;
            settingsMessage += `• Language: ${settings.language || 'Amharic'}\n`;
            settingsMessage += `• Timezone: ${settings.timezone || 'Africa/Addis_Ababa'}\n`;
            settingsMessage += `• Channel: ${settings.channel || '@gizebetgames'}\n`;
            settingsMessage += `• Debug Mode: ${settings.debug ? '✅ Enabled' : '❌ Disabled'}\n\n`;
            
            settingsMessage += `📊 **Content Settings:**\n`;
            settingsMessage += `• Prediction Format: ${settings.predictionFormat || 'Standard'}\n`;
            settingsMessage += `• Include Odds: ${settings.includeOdds ? '✅ Yes' : '❌ No'}\n`;
            settingsMessage += `• Image Generation: ${settings.generateImages ? '✅ Enabled' : '❌ Disabled'}\n`;
            settingsMessage += `• Auto-Translate: ${settings.autoTranslate ? '✅ Enabled' : '❌ Disabled'}\n\n`;
            
            settingsMessage += `🔧 **API Settings:**\n`;
            settingsMessage += `• Football API: ${settings.footballApi?.status || 'Unknown'}\n`;
            settingsMessage += `• OpenAI API: ${settings.openaiApi?.status || 'Unknown'}\n`;
            settingsMessage += `• Rate Limits: ${settings.rateLimits || 'Default'}\n\n`;
            
            settingsMessage += `💡 **Commands:**\n`;
            settingsMessage += `• /settings reset - Reset to defaults\n`;
            settingsMessage += `• /settings backup - Backup current settings\n`;
            settingsMessage += `• /settings restore - Restore from backup`;
            
            await this.bot.sendMessage(chatId, settingsMessage, { parse_mode: 'Markdown' });
          } else {
            await this.bot.sendMessage(chatId, 
              `✅ Settings ${action} completed successfully!\n` +
              `📊 Result: ${response.data.message || 'Success'}\n` +
              `⏰ Updated at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
            );
          }
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to manage settings: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in settings command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error managing settings: ' + error.message);
      }
    });
  }

  // 🔧 Setup all automation commands
  setupAutomationCommands() {
    this.setupAutomationCommand();
    this.setupScheduleCommand();
    this.setupSettingsCommand();
  }
}

module.exports = AutomationCommands;