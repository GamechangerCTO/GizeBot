// 📊 Admin Commands Module - Analytics, Coupons, Website Scraping
const BaseBotCommands = require('./base-bot');

class AdminCommands extends BaseBotCommands {
  constructor() {
    super();
  }

  // 📊 Handle /analytics command
  setupAnalyticsCommand() {
    this.bot.onText(/\/analytics/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '📊 Fetching channel analytics...');

        const response = await this.makeApiCall('/api/analytics', {}, { method: 'GET' });

        if (response.data.success) {
          const analytics = response.data.data;
          
          let analyticsMessage = `📊 **Channel Analytics Report**\n\n`;
          analyticsMessage += `📈 **Channel Growth:**\n`;
          analyticsMessage += `• Subscribers: ${analytics.subscribers || 'N/A'}\n`;
          analyticsMessage += `• Growth Rate: ${analytics.growthRate || 'N/A'}\n`;
          analyticsMessage += `• Active Users: ${analytics.activeUsers || 'N/A'}\n\n`;
          
          analyticsMessage += `📝 **Content Performance:**\n`;
          analyticsMessage += `• Posts Today: ${analytics.postsToday || 0}\n`;
          analyticsMessage += `• Avg Views: ${analytics.avgViews || 'N/A'}\n`;
          analyticsMessage += `• Engagement Rate: ${analytics.engagement || 'N/A'}\n\n`;
          
          analyticsMessage += `🎯 **Top Performing Content:**\n`;
          if (analytics.topPosts && analytics.topPosts.length > 0) {
            analytics.topPosts.slice(0, 3).forEach((post, index) => {
              analyticsMessage += `${index + 1}. ${post.type}: ${post.views} views\n`;
            });
          } else {
            analyticsMessage += `No data available\n`;
          }
          
          analyticsMessage += `\n⏰ **Report Time:** ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

          await this.bot.sendMessage(chatId, analyticsMessage, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to fetch analytics: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in analytics command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error fetching analytics: ' + error.message);
      }
    });
  }

  // 🎫 Handle /coupons command
  setupCouponsCommand() {
    this.bot.onText(/\/coupons(?:\s+(.+))?/, async (msg, match) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        const action = match[1] || 'list'; // Default to list

        await this.bot.sendMessage(chatId, `🎫 Managing promotional coupons...`);

        const response = await this.makeApiCall('/api/coupons', {
          action: action
        });

        if (response.data.success) {
          if (action === 'list') {
            const coupons = response.data.coupons || [];
            let couponMessage = `🎫 **Active Promotional Coupons** (${coupons.length})\n\n`;
            
            if (coupons.length > 0) {
              coupons.slice(0, 10).forEach((coupon, index) => {
                couponMessage += `${index + 1}. **${coupon.code}**\n`;
                couponMessage += `   💰 Offer: ${coupon.offer}\n`;
                couponMessage += `   📅 Valid until: ${coupon.expiry}\n`;
                couponMessage += `   📊 Used: ${coupon.used}/${coupon.maxUses}\n\n`;
              });
            } else {
              couponMessage += `No active coupons found.\n\n`;
            }
            
            couponMessage += `💡 **Commands:**\n`;
            couponMessage += `• /coupons list - Show all coupons\n`;
            couponMessage += `• /coupons create - Create new coupon\n`;
            couponMessage += `• /coupons stats - View usage statistics`;
            
            await this.bot.sendMessage(chatId, couponMessage, { parse_mode: 'Markdown' });
          } else {
            await this.bot.sendMessage(chatId, 
              `✅ Coupon operation (${action}) completed successfully!\n` +
              `📊 Result: ${response.data.message || 'Success'}\n` +
              `⏰ Updated at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`
            );
          }
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to manage coupons: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in coupons command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error managing coupons: ' + error.message);
      }
    });
  }

  // 🕷️ Handle /scrape_website command
  setupScrapeWebsiteCommand() {
    this.bot.onText(/\/scrape_website/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '🕷️ Scraping GizeBets website for latest data...');

        const response = await this.makeApiCall('/api/scrape-gizebets');

        if (response.data.success) {
          const scrapeData = response.data.data;
          
          let scrapeMessage = `🕷️ **Website Scraping Results**\n\n`;
          scrapeMessage += `📊 **Data Collected:**\n`;
          scrapeMessage += `• Matches Found: ${scrapeData.matchesFound || 0}\n`;
          scrapeMessage += `• Odds Updated: ${scrapeData.oddsUpdated || 0}\n`;
          scrapeMessage += `• Promotions: ${scrapeData.promotions || 0}\n`;
          scrapeMessage += `• Bonuses: ${scrapeData.bonuses || 0}\n\n`;
          
          scrapeMessage += `⏱️ **Processing Time:** ${scrapeData.processingTime || 'N/A'}\n`;
          scrapeMessage += `📅 **Last Update:** ${scrapeData.lastUpdate || 'N/A'}\n\n`;
          
          if (scrapeData.errors && scrapeData.errors.length > 0) {
            scrapeMessage += `⚠️ **Warnings:**\n`;
            scrapeData.errors.slice(0, 3).forEach((error, index) => {
              scrapeMessage += `${index + 1}. ${error}\n`;
            });
            scrapeMessage += `\n`;
          }
          
          scrapeMessage += `✅ **Status:** Data successfully scraped and processed\n`;
          scrapeMessage += `⏰ **Completed:** ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

          await this.bot.sendMessage(chatId, scrapeMessage, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to scrape website: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in scrape_website command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error scraping website: ' + error.message);
      }
    });
  }

  // 📊 Handle /compare_data command
  setupCompareDataCommand() {
    this.bot.onText(/\/compare_data/, async (msg) => {
      if (!this.checkAdminAccess(msg)) return;

      try {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '📊 Comparing API data with website data...');

        const response = await this.makeApiCall('/api/compare-data');

        if (response.data.success) {
          const comparison = response.data.comparison;
          
          let compareMessage = `📊 **Data Comparison Report**\n\n`;
          compareMessage += `🔍 **API vs Website Analysis:**\n\n`;
          
          compareMessage += `⚽ **Match Data:**\n`;
          compareMessage += `• API Matches: ${comparison.api?.matches || 0}\n`;
          compareMessage += `• Website Matches: ${comparison.website?.matches || 0}\n`;
          compareMessage += `• Match Rate: ${comparison.matchAccuracy || 'N/A'}%\n\n`;
          
          compareMessage += `💰 **Odds Comparison:**\n`;
          compareMessage += `• API Odds: ${comparison.api?.odds || 0}\n`;
          compareMessage += `• Website Odds: ${comparison.website?.odds || 0}\n`;
          compareMessage += `• Accuracy: ${comparison.oddsAccuracy || 'N/A'}%\n\n`;
          
          if (comparison.discrepancies && comparison.discrepancies.length > 0) {
            compareMessage += `⚠️ **Discrepancies Found:**\n`;
            comparison.discrepancies.slice(0, 5).forEach((disc, index) => {
              compareMessage += `${index + 1}. ${disc.type}: ${disc.description}\n`;
            });
            compareMessage += `\n`;
          } else {
            compareMessage += `✅ **No Major Discrepancies Found**\n\n`;
          }
          
          compareMessage += `📈 **Data Quality Score:** ${comparison.qualityScore || 'N/A'}/100\n`;
          compareMessage += `⏰ **Analysis Time:** ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

          await this.bot.sendMessage(chatId, compareMessage, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, '❌ Failed to compare data: ' + response.data.message);
        }

      } catch (error) {
        console.error('❌ Error in compare_data command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ Error comparing data: ' + error.message);
      }
    });
  }

  // 🔧 Setup all admin commands
  setupAdminCommands() {
    this.setupAnalyticsCommand();
    this.setupCouponsCommand();
    this.setupScrapeWebsiteCommand();
    this.setupCompareDataCommand();
  }
}

module.exports = AdminCommands;