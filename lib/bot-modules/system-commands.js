// 🔧 System Commands Module - Stop, Restart, Health, Status
const BaseBotCommands = require('./base-bot');

class SystemCommands extends BaseBotCommands {
  constructor() {
    super();
  }

  // 📈 Handle /status command
  setupStatusCommand() {
    this.bot.onText(/\/status/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;

        // Get status data directly
        const status = {
          success: true,
          timestamp: new Date().toISOString(),
          ethiopianTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }),
          system: {
            status: "running",
            uptime: "Active", 
            isRunning: true,
            dailyStats: {
              predictionsPosted: 0,
              resultsPosted: 0,
              promosPosted: 0,
              errors: 0
            },
            nextScheduled: {
              predictions: "Every 2 hours (8 AM - 8 PM)",
              results: "Daily at 11 PM", 
              promos: "10 AM, 2 PM, 6 PM",
              analytics: "Midnight"
            },
            timezone: "Africa/Addis_Ababa"
          }
        };

        if (status.success) {
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
        await this.bot.sendMessage(msg.chat.id, '❌ Error getting status: ' + error.message);
      }
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
        const stopResponse = await this.makeApiCall('/api/stop');
        
        // Stop bot commands
        const botStopResponse = await this.makeApiCall('/api/bot/stop', {
          reason: `Stop requested by admin ${msg.from.first_name} (${msg.from.id})`
        });

        if (stopResponse.data.success && botStopResponse.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ System stopped successfully!\n` +
            `🛑 Main System: ${stopResponse.data.message}\n` +
            `🤖 Bot Commands: ${botStopResponse.data.message}\n` +
            `⏰ Stopped at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n` +
            `💡 Use /restart or the dashboard to restart the system.`
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

        const restartResponse = await this.makeApiCall('/api/bot/restart', {
          reason: `Restart requested by admin ${msg.from.first_name} (${msg.from.id})`
        });
        
        if (restartResponse.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Bot commands restarted successfully!\n` +
            `🤖 Status: ${restartResponse.data.data.isNowRunning ? 'Active' : 'Failed'}\n` +
            `🔄 Previous state: ${restartResponse.data.data.wasActive ? 'Active' : 'Inactive'}\n` +
            `⏰ Restarted at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n` +
            `📝 ${restartResponse.data.message}`
          );
        } else {
          await this.bot.sendMessage(chatId, 
            `❌ Failed to restart bot commands\n` +
            `📝 ${restartResponse.data.message || 'Unknown error'}`
          );
        }

      } catch (error) {
        console.error('❌ Error in restart command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error restarting: ' + error.message);
      }
    });
  }

  // 🔥 Handle /force_stop command
  setupForceStopCommand() {
    this.bot.onText(/\/force_stop/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '🔥 Force stopping ALL bot instances...');

        const forceStopResponse = await this.makeApiCall('/api/bot/stop', {
          reason: `Force stop requested by admin ${msg.from.first_name} (${msg.from.id})`,
          force: true
        });
        
        if (forceStopResponse.data.success) {
          await this.bot.sendMessage(chatId, 
            `🔥 Force stop completed!\n` +
            `🛑 All instances stopped: ${forceStopResponse.data.data.wasRunning ? 'Yes' : 'None were running'}\n` +
            `🧹 Cleanup: ${forceStopResponse.data.data.forceStop || 'Completed'}\n` +
            `⏰ Stopped at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}\n\n` +
            `💡 All bot instances have been forcefully stopped.\n` +
            `✅ Use /restart to start fresh.`
          );
        } else {
          await this.bot.sendMessage(chatId, 
            `❌ Force stop failed\n` +
            `📝 ${forceStopResponse.data.message || 'Unknown error'}`
          );
        }

      } catch (error) {
        console.error('❌ Error in force_stop command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error during force stop: ' + error.message);
      }
    });
  }

  // 🏥 Handle /health command
  setupHealthCommand() {
    this.bot.onText(/\/health/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '🏥 Running comprehensive health check...');

        const healthResponse = await this.makeApiCall('/api/bot/health', {}, { method: 'GET' });
        const health = healthResponse.data;
        
        let statusMessage = `🏥 **Bot Health Report**\n\n`;
        
        // Overall health
        statusMessage += `🌡️ **Overall Health:** ${health.health === 'healthy' ? '✅ Healthy' : health.health === 'unhealthy' ? '⚠️ Issues Detected' : '❌ Critical'}\n\n`;
        
        // Service status
        statusMessage += `🔧 **Service Status:**\n`;
        statusMessage += `• Running: ${health.service?.isRunning ? '✅' : '❌'}\n`;
        statusMessage += `• Uptime: ${health.service?.uptime || 'N/A'}\n`;
        statusMessage += `• Restart Attempts: ${health.service?.reconnectAttempts || 0}\n\n`;
        
        // Bot status
        statusMessage += `🤖 **Bot Status:**\n`;
        statusMessage += `• Online: ${health.bot?.isOnline ? '✅' : '❌'}\n`;
        statusMessage += `• Consecutive Errors: ${health.bot?.consecutiveErrors || 0}\n`;
        statusMessage += `• Last Success: ${health.bot?.lastApiSuccess ? new Date(health.bot.lastApiSuccess).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }) : 'Never'}\n\n`;
        
        // Telegram connection
        statusMessage += `📡 **Telegram:**\n`;
        statusMessage += `• Connected: ${health.telegram?.connected ? '✅' : '❌'}\n`;
        statusMessage += `• Polling: ${health.telegram?.polling ? '✅' : '❌'}\n`;
        statusMessage += `• Commands Ready: ${health.telegram?.commandsReady ? '✅' : '❌'}\n\n`;
        
        // Auto-started info
        if (health.autoStarted) {
          statusMessage += `🔄 **Auto-Started:** Bot was down and has been restarted\n\n`;
        }
        
        // Recommendations
        if (health.health !== 'healthy') {
          statusMessage += `💡 **Recommendations:**\n`;
          if (!health.service?.isRunning) {
            statusMessage += `• Use /restart to restart the bot\n`;
          }
          if (!health.telegram?.polling) {
            statusMessage += `• Check for polling conflicts (409 errors)\n`;
            statusMessage += `• Use /force_stop then /restart if needed\n`;
          }
          if ((health.bot?.consecutiveErrors || 0) > 10) {
            statusMessage += `• Too many errors detected - consider restart\n`;
          }
        }
        
        statusMessage += `\n⏰ **Report Time:** ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

        await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('❌ Error in health command:', error);
        await this.bot.sendMessage(msg.chat.id, 
          `❌ Health check failed: ${error.message}\n\n` +
          `💡 Try these commands:\n` +
          `• /restart - Restart the bot\n` +
          `• /force_stop - Force stop all instances\n` +
          `• /status - Basic status check`
        );
      }
    });
  }

  // 🔧 Setup all system commands
  setupSystemCommands() {
    this.setupStatusCommand();
    this.setupStopCommand();
    this.setupRestartCommand();
    this.setupForceStopCommand();
    this.setupHealthCommand();
  }
}

module.exports = SystemCommands;