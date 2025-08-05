// 🔴 Live Commands Module - Active matches, Live predictions, Live results
const BaseBotCommands = require('./base-bot');
const FootballAPI = require('../football-api');

class LiveCommands extends BaseBotCommands {
  constructor() {
    super();
    this.footballAPI = new FootballAPI();
  }

  // 🔴 Handle /active_matches command
  setupActiveMatchesCommand() {
    this.bot.onText(/\/active_matches/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Fetching active matches...`);

        let liveMatches;
        try {
          liveMatches = await this.footballAPI.getLiveMatches();
          await this.updateSystemStatus('Live Matches API', true);
        } catch (apiError) {
          await this.updateSystemStatus('Live Matches API', false, apiError.message);
          throw apiError;
        }

        if (liveMatches && liveMatches.length > 0) {
          let matchList = `🔴 **ACTIVE MATCHES** (${liveMatches.length})\n\n`;
          
          liveMatches.slice(0, 8).forEach((match, index) => {
            const homeTeam = match.teams?.home?.name || 'Unknown';
            const awayTeam = match.teams?.away?.name || 'Unknown';
            const score = match.score?.fulltime ? 
              `${match.score.fulltime.home}-${match.score.fulltime.away}` : '0-0';
            const league = match.league?.name || 'Unknown League';
            const minute = match.fixture?.status?.elapsed || 'Live';

            matchList += `${index + 1}. **${homeTeam}** vs **${awayTeam}**\n`;
            matchList += `   📊 Score: ${score} (${minute}')\n`;
            matchList += `   🏆 ${league}\n\n`;
          });

          if (liveMatches.length > 8) {
            matchList += `... and ${liveMatches.length - 8} more matches\n\n`;
          }

          matchList += `⏰ Updated: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

          await this.bot.sendMessage(chatId, matchList, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, 
            `🔴 No active matches found right now.\n\n` +
            `⏰ Checked at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
          );
        }

      } catch (error) {
        console.error('❌ Error in active_matches command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching active matches: ' + error.message);
      }
    });
  }

  // ⏰ Handle /upcoming_matches command
  setupUpcomingMatchesCommand() {
    this.bot.onText(/\/upcoming_matches/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Fetching upcoming matches...`);

        const response = await this.makeApiCall('/api/upcoming-matches', {}, { method: 'GET' });

        if (response.data.success && response.data.matches && response.data.matches.length > 0) {
          const matches = response.data.matches;
          let matchList = `⏰ **UPCOMING MATCHES** (${matches.length})\n\n`;
          
          matches.slice(0, 10).forEach((match, index) => {
            const homeTeam = match.teams?.home?.name || 'Unknown';
            const awayTeam = match.teams?.away?.name || 'Unknown';
            const kickoff = new Date(match.fixture?.date);
            const ethiopianTime = kickoff.toLocaleString('en-US', { 
              timeZone: 'Africa/Addis_Ababa',
              hour: '2-digit',
              minute: '2-digit'
            });
            const league = match.league?.name || 'Unknown League';

            matchList += `${index + 1}. **${homeTeam}** vs **${awayTeam}**\n`;
            matchList += `   🕐 Kickoff: ${ethiopianTime} (ET)\n`;
            matchList += `   🏆 ${league}\n\n`;
          });

          matchList += `⏰ Next ${matches.length} matches in the next 2-3 hours\n`;
          matchList += `📅 Updated: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

          await this.bot.sendMessage(chatId, matchList, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, 
            `⏰ No upcoming matches in the next 2-3 hours.\n\n` +
            `📅 Checked at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
          );
        }

      } catch (error) {
        console.error('❌ Error in upcoming_matches command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching upcoming matches: ' + error.message);
      }
    });
  }

  // 📺 Handle /send_live command
  setupSendLiveCommand() {
    this.bot.onText(/\/send_live/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        
        // Create inline keyboard for confirmation
        await this.bot.sendMessage(chatId, 
          `📺 **Send LIVE Match Predictions?**\n\n` +
          `This will send predictions for currently active matches to the channel.\n` +
          `⚠️ Make sure there are live matches happening now.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Yes, Send LIVE Predictions', callback_data: 'confirm_send_live_predictions' },
                  { text: '❌ Cancel', callback_data: 'cancel_operation' }
                ]
              ]
            }
          }
        );

      } catch (error) {
        console.error('❌ Error in send_live command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error setting up live predictions: ' + error.message);
      }
    });
  }

  // ⚡ Handle /live_results command
  setupLiveResultsCommand() {
    this.bot.onText(/\/live_results/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '⚡ Posting live match results...');

        const response = await this.makeApiCall('/api/manual/live-results');

        if (response.data.success) {
          await this.bot.sendMessage(chatId, 
            `✅ Live results posted successfully!\n` +
            `📧 Message ID: ${response.data.messageId}\n` +
            `🎯 Matches: ${response.data.matchCount || 'N/A'}\n` +
            `⏰ Posted at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to post live results: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in live_results command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error posting live results: ' + error.message);
      }
    });
  }

  // 📅 Handle /today_matches command
  setupTodayMatchesCommand() {
    this.bot.onText(/\/today_matches/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, `${this.getStatusIndicator()} Fetching today's matches...`);

        const response = await this.makeApiCall('/api/today-matches', {}, { method: 'GET' });

        if (response.data.success && response.data.matches && response.data.matches.length > 0) {
          const matches = response.data.matches;
          let matchList = `📅 **TODAY'S MATCHES** (${matches.length})\n\n`;
          
          matches.slice(0, 15).forEach((match, index) => {
            const homeTeam = match.teams?.home?.name || 'Unknown';
            const awayTeam = match.teams?.away?.name || 'Unknown';
            const kickoff = new Date(match.fixture?.date);
            const ethiopianTime = kickoff.toLocaleString('en-US', { 
              timeZone: 'Africa/Addis_Ababa',
              hour: '2-digit',
              minute: '2-digit'
            });
            const league = match.league?.name || 'Unknown League';
            const status = match.fixture?.status?.short || 'NS';

            matchList += `${index + 1}. **${homeTeam}** vs **${awayTeam}**\n`;
            matchList += `   🕐 ${ethiopianTime} (ET) - ${status}\n`;
            matchList += `   🏆 ${league}\n\n`;
          });

          if (matches.length > 15) {
            matchList += `... and ${matches.length - 15} more matches\n\n`;
          }

          matchList += `📊 Content will be posted throughout the day\n`;
          matchList += `📅 Updated: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

          await this.bot.sendMessage(chatId, matchList, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, 
            `📅 No matches scheduled for today.\n\n` +
            `📅 Checked at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
          );
        }

      } catch (error) {
        console.error('❌ Error in today_matches command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching today\'s matches: ' + error.message);
      }
    });
  }

  // 📊 Get status indicator for UI
  getStatusIndicator() {
    if (this.systemStatus.isOnline && this.systemStatus.consecutiveErrors === 0) {
      return '🟢';
    } else if (this.systemStatus.consecutiveErrors < 5) {
      return '🟡';
    } else {
      return '🔴';
    }
  }

  // 🔧 Setup all live commands
  setupLiveCommands() {
    this.setupActiveMatchesCommand();
    this.setupUpcomingMatchesCommand();
    this.setupSendLiveCommand();
    this.setupLiveResultsCommand();
    this.setupTodayMatchesCommand();
  }
}

module.exports = LiveCommands;