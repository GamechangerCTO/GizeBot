// Telegram Bot Integration for GizeBets
// Handles sending messages and tracking interactions

const TelegramBot = require('node-telegram-bot-api');
const ImageGenerator = require('./image-generator.js');

class TelegramManager {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: false,
      request: {
        agentOptions: {
          keepAlive: true,
          family: 4
        }
      }
    });
    this.channelId = process.env.CHANNEL_ID; // @gizebetgames
    this.clickStats = new Map(); // Simple in-memory click tracking
    this.imageGenerator = new ImageGenerator(); // AI image generation
  }

  // Retry mechanism for network errors
  async retryRequest(fn, maxRetries = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Check if it's a network/TLS error that might benefit from retry
        if (error.code === 'EFATAL' || error.code === 'ECONNRESET' || 
            error.message.includes('TLS') || error.message.includes('network')) {
          console.log(`🔄 Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 1.5; // Exponential backoff
        } else {
          throw error; // Don't retry on non-network errors
        }
      }
    }
  }

  // Send predictions as separate messages with AI-generated image
  async sendPredictions(predictions, matches = null) {
    const messageIds = [];
    
    // If it's a string (old format), convert to array with single item
    if (typeof predictions === 'string') {
      predictions = [predictions];
    }
    
    try {
      // Generate AI image for the first prediction (if we have matches data)
      let imageUrl = null;
      if (matches && matches.length > 0) {
        console.log('🎨 Generating AI image for predictions...');
        imageUrl = await this.imageGenerator.generatePredictionImage(matches);
      }

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        
        await this.retryRequest(async () => {
          // Create keyboard for every message
      const keyboard = this.createPredictionsKeyboard();
      
          // Format each prediction message
          const formattedContent = this.formatSinglePredictionMessage(prediction);
          
          // Send first message with image (if available)
          if (i === 0 && imageUrl) {
            try {
              const message = await this.bot.sendPhoto(this.channelId, imageUrl, {
                caption: formattedContent,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
                }
              });
              
              console.log(`✅ Prediction ${i + 1}/${predictions.length} sent with AI image, Message ID: ${message.message_id}`);
              this.trackMessage('predictions', message.message_id, { matchNumber: i + 1, hasImage: true });
              messageIds.push(message.message_id);
            } catch (imageError) {
              console.log('⚠️ Failed to send with image, falling back to text:', imageError.message);
              // Fallback to regular text message
              const message = await this.bot.sendMessage(this.channelId, formattedContent, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                  inline_keyboard: keyboard
                }
              });
              
              console.log(`✅ Prediction ${i + 1}/${predictions.length} sent (fallback), Message ID: ${message.message_id}`);
              this.trackMessage('predictions', message.message_id, { matchNumber: i + 1, hasImage: false });
              messageIds.push(message.message_id);
            }
          } else {
            // Regular text message for subsequent predictions
            const message = await this.bot.sendMessage(this.channelId, formattedContent, {
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              reply_markup: {
                inline_keyboard: keyboard
              }
            });
            
            console.log(`✅ Prediction ${i + 1}/${predictions.length} sent, Message ID: ${message.message_id}`);
            this.trackMessage('predictions', message.message_id, { matchNumber: i + 1 });
            messageIds.push(message.message_id);
          }
        });
        
        // Add delay between messages to avoid rate limiting
        if (i < predictions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
        }
      }
      
      console.log(`✅ All ${predictions.length} predictions sent successfully`);
      return { messageIds, totalSent: predictions.length };
      
    } catch (error) {
      console.error('❌ Error sending predictions:', error);
      throw error;
    }
  }

  // Format single prediction message (supports both regular and live formats with dynamic numbering)
  formatSinglePredictionMessage(content) {
    const lines = content.split('\n');
    let formatted = '';
    
    lines.forEach((line) => {
      if ((line.includes('MATCH') && line.includes('/')) || (line.includes('LIVE MATCH') && line.includes('/'))) {
        // Header line with match number and time (regular or live) - supports dynamic numbering like 1/3, 2/2, etc.
        formatted += `<b>${line}</b>\n`;
        formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      } else if (line.includes('vs') && line.includes('⚽')) {
        // Match teams
        formatted += `<b>${line}</b>\n`;
      } else if (line.includes('-') && !line.includes('━') && !line.includes('🔗') && (line.match(/\d+-\d+/))) {
        // Live score line (e.g., "Manchester United 1-1 Liverpool") - using regex to detect score patterns
        formatted += `<b>⚽ ${line}</b>\n`;
      } else if (line.includes('🏆')) {
        // Competition
        formatted += `${line}\n`;
      } else if (line.includes('🎯')) {
        // Main prediction
        formatted += `<b>${line}</b>\n`;
      } else if (line.includes('💡') || line.includes('⚡')) {
        // Analysis/reasoning or live analysis
        formatted += `<i>${line}</i>\n`;
      } else if (line.includes('💎') || line.includes('🔗') || line.includes('Live code:')) {
        // Promo footer
        formatted += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        formatted += `<b>${line}</b>\n`;
      } else if (line.trim()) {
        formatted += `${line}\n`;
      }
    });
    
    return formatted.trim();
  }

  // Legacy format function for backward compatibility
  formatPredictionsMessage(content) {
    // If it's already formatted as single prediction, use new formatter
    if (content.includes('MATCH') && content.includes('/')) {
      return this.formatSinglePredictionMessage(content);
    }
    
    // Otherwise use old format
    let formatted = `<b>🎯 TODAY'S TOP BETTING PREDICTIONS</b>\n`;
    formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.includes('vs') && (line.includes('Premier League') || line.includes('La Liga') || line.includes('Champions League'))) {
        formatted += `<b>⚽ ${line}</b>\n`;
      } else if (line.includes('Prediction:') || line.includes('Confidence:')) {
        formatted += `<code>${line}</code>\n`;
      } else if (line.includes('🎁') || line.includes('💸') || line.includes('🔗')) {
          formatted += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        formatted += `${line}\n`;
      } else if (line.trim()) {
        formatted += `${line}\n`;
      } else {
        formatted += `\n`;
      }
    });
    
    return formatted;
  }

  // Send Live Predictions with AI-generated image
  async sendLivePredictions(predictions, liveMatches = null) {
    const messageIds = [];
    
    // If it's a string (old format), convert to array with single item
    if (typeof predictions === 'string') {
      predictions = [predictions];
    }
    
    try {
      // Generate AI image for live predictions
      let imageUrl = null;
      if (liveMatches && liveMatches.length > 0) {
        console.log('🔴 Generating AI image for LIVE predictions...');
        imageUrl = await this.imageGenerator.generateLiveImage(liveMatches);
      }

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        
        await this.retryRequest(async () => {
          // Create keyboard for every message
          const keyboard = this.createPredictionsKeyboard();
          
          // Format each prediction message
          const formattedContent = this.formatSinglePredictionMessage(prediction);
          
          // Send first message with LIVE image (if available)
          if (i === 0 && imageUrl) {
            try {
              const message = await this.bot.sendPhoto(this.channelId, imageUrl, {
                caption: formattedContent,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: keyboard
                }
              });
              
              console.log(`✅ LIVE Prediction ${i + 1}/${predictions.length} sent with AI image, Message ID: ${message.message_id}`);
              this.trackMessage('live-predictions', message.message_id, { matchNumber: i + 1, hasImage: true });
              messageIds.push(message.message_id);
            } catch (imageError) {
              console.log('⚠️ Failed to send LIVE with image, falling back to text:', imageError.message);
              // Fallback to regular text message
              const message = await this.bot.sendMessage(this.channelId, formattedContent, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                  inline_keyboard: keyboard
                }
              });
              
              console.log(`✅ LIVE Prediction ${i + 1}/${predictions.length} sent (fallback), Message ID: ${message.message_id}`);
              this.trackMessage('live-predictions', message.message_id, { matchNumber: i + 1, hasImage: false });
              messageIds.push(message.message_id);
            }
          } else {
            // Regular text message for subsequent predictions
            const message = await this.bot.sendMessage(this.channelId, formattedContent, {
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              reply_markup: {
                inline_keyboard: keyboard
              }
            });
            
            console.log(`✅ LIVE Prediction ${i + 1}/${predictions.length} sent, Message ID: ${message.message_id}`);
            this.trackMessage('live-predictions', message.message_id, { matchNumber: i + 1 });
            messageIds.push(message.message_id);
          }
        });
        
        // Add delay between messages to avoid rate limiting
        if (i < predictions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
        }
      }
      
      console.log(`✅ All ${predictions.length} LIVE predictions sent successfully`);
      return { messageIds, totalSent: predictions.length };
      
    } catch (error) {
      console.error('❌ Error sending LIVE predictions:', error);
      throw error;
    }
  }

  // Send Daily Results Message with enhanced formatting and AI image
  async sendResults(content, results = null) {
    return await this.retryRequest(async () => {
      const keyboard = this.createResultsKeyboard();
      
      // Enhanced formatting for results
      const formattedContent = this.formatResultsMessage(content);
      
      // Generate AI image for results
      let imageUrl = null;
      if (results && results.length > 0) {
        console.log('📊 Generating AI image for results...');
        imageUrl = await this.imageGenerator.generateResultsImage(results);
      }

      // Send with image if available
      if (imageUrl) {
        try {
          const message = await this.bot.sendPhoto(this.channelId, imageUrl, {
            caption: formattedContent,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });

          console.log('✅ Results sent with AI image, Message ID:', message.message_id);
          this.trackMessage('results', message.message_id, { hasImage: true });
          return message;
        } catch (imageError) {
          console.log('⚠️ Failed to send results with image, falling back to text:', imageError.message);
        }
      }

      // Fallback to regular text message
      const message = await this.bot.sendMessage(this.channelId, formattedContent, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        },
        disable_web_page_preview: true
      });

      console.log('✅ Results sent successfully, Message ID:', message.message_id);
      this.trackMessage('results', message.message_id, { hasImage: false });
      
      return message;
    });
  }

  // Format results message for better display
  formatResultsMessage(content) {
    let formatted = `<b>📊 DAILY MATCH RESULTS</b>\n`;
    formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (line.includes(' - ') && (line.includes('1') || line.includes('2') || line.includes('3'))) {
        // Match result line
        formatted += `<b>⚽ ${line}</b>\n`;
      } else if (line.includes('Full Results:') || line.includes('🔗')) {
        // Footer links
        formatted += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        formatted += `${line}\n`;
      } else if (line.trim()) {
        formatted += `${line}\n`;
      } else {
        formatted += `\n`;
      }
    });
    
    return formatted;
  }

  // Send Promo Message with enhanced formatting and AI image
  async sendPromo(content, promoCode) {
    return await this.retryRequest(async () => {
      const keyboard = this.createPromoKeyboard(promoCode);
      
      // Enhanced formatting for promos
      const formattedContent = this.formatPromoMessage(content, promoCode);
      
      // Generate AI image for promo with timeout protection
      let imageUrl = null;
      if (promoCode) {
        console.log('🎁 Generating AI image for promo...');
        try {
          // Add timeout wrapper to prevent hanging
          const imagePromise = this.imageGenerator.generatePromoImage(promoCode);
          imageUrl = await Promise.race([
            imagePromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Image generation timeout')), 25000) // 25 seconds
            )
          ]);
        } catch (error) {
          console.log('⚠️ Image generation failed or timed out:', error.message);
          imageUrl = null; // Will fallback to text
        }
      }

      // Send with image if available
      if (imageUrl) {
        try {
          const message = await this.bot.sendPhoto(this.channelId, imageUrl, {
            caption: formattedContent,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });

          console.log('✅ Promo sent with AI image, Message ID:', message.message_id);
          this.trackMessage('promo', message.message_id, { promoCode, hasImage: true });
          return message;
        } catch (imageError) {
          console.log('⚠️ Failed to send promo with image, falling back to text:', imageError.message);
        }
      }

      // Fallback to regular text message
      const message = await this.bot.sendMessage(this.channelId, formattedContent, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        },
        disable_web_page_preview: true
      });

      console.log('✅ Promo sent successfully, Message ID:', message.message_id);
      this.trackMessage('promo', message.message_id, { promoCode, hasImage: false });
      
      return message;
    });
  }

  // Format promo message - rich and attractive using Telegram features
  formatPromoMessage(content, promoCode) {
    let formatted = content;
    
    // Add striking header with emojis
    formatted = `🎉 <b><u>EXCLUSIVE OFFER</u></b> 🎉\n\n${formatted}`;
    
    // Make promo code super prominent with special formatting
    if (formatted.includes(promoCode)) {
      formatted = formatted.replace(
        new RegExp(`(${promoCode})`, 'g'), 
        `<code>🎁 ${promoCode} 🎁</code>`
      );
    }
    
    // Bold and highlight key phrases
    formatted = formatted.replace(/(\d+%\s*[Bb]onus)/g, '<b><u>$1</u></b>');
    formatted = formatted.replace(/(\d+%)/g, '<b>$1</b>');
    formatted = formatted.replace(/(bonus|Bonus|BONUS)/g, '<b><i>BONUS</i></b>');
    formatted = formatted.replace(/(exclusive|Exclusive|EXCLUSIVE)/g, '<b><i>EXCLUSIVE</i></b>');
    formatted = formatted.replace(/(limited|Limited|LIMITED)/g, '<b><u>LIMITED TIME</u></b>');
    
    // Add urgency footer with special formatting
    formatted += `\n\n⚡ <b><i>Act NOW - Limited spots available!</i></b> ⚡`;
    
    // Remove website link from content (will be in buttons)
    formatted = formatted.replace(/🔗\s*[^\n]+/g, '');
    
    return formatted.trim();
  }

  // Send Custom Bonus Message (for manual commands)
  async sendBonus(content, bonusCode = 'SPECIAL') {
    try {
      const keyboard = this.createBonusKeyboard(bonusCode);
      
      const message = await this.bot.sendMessage(this.channelId, content, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });

      console.log('✅ Bonus sent successfully, Message ID:', message.message_id);
      this.trackMessage('bonus', message.message_id, { bonusCode });
      
      return message;
    } catch (error) {
      console.error('❌ Error sending bonus:', error);
      throw error;
    }
  }

  // Create Predictions Keyboard with tracking
  createPredictionsKeyboard() {
    return [
      [
        {
          text: '🎯 Live Scores',
          url: this.createTrackingUrl('https://gizebets.et/live', 'predictions_live')
        },
        {
          text: '📊 More Tips',
          url: this.createTrackingUrl('https://gizebets.et/tips', 'predictions_tips')
        }
      ],
      [
        {
          text: '💰 Win Today!',
          url: this.createTrackingUrl('https://gizebets.et/bonus', 'predictions_bonus')
        }
      ]
    ];
  }

  // Create Results Keyboard
  createResultsKeyboard() {
    return [
      [
        {
          text: '📈 Detailed Analysis',
          url: this.createTrackingUrl('https://gizebets.et/results', 'results_detailed')
        },
        {
          text: '⚽ Live Scores',
          url: this.createTrackingUrl('https://gizebets.et/live', 'results_live')
        }
      ],
      [
        {
          text: '🎁 Tomorrow\'s Bonus',
          url: this.createTrackingUrl('https://gizebets.et/tomorrow', 'results_tomorrow')
        }
      ]
    ];
  }

  // Create Promo Keyboard - attractive and action-oriented
  createPromoKeyboard(promoCode) {
    return [
      [
        {
          text: `🎁 CLAIM ${promoCode} 🎁`,
          url: this.createTrackingUrl(`https://gizebets.et/bonus?code=${promoCode}`, `promo_${promoCode}`)
        }
      ],
      [
        {
          text: '🚀 GET BONUS NOW',
          url: this.createTrackingUrl('https://gizebets.et/register', 'promo_register')
        },
        {
          text: '📱 MOBILE APP',
          url: this.createTrackingUrl('https://gizebets.et/app', 'promo_app')
        }
      ],
      [
        {
          text: '💰 CHECK ALL BONUSES',
          url: this.createTrackingUrl('https://gizebets.et/promotions', 'promo_all')
        }
      ]
    ];
  }

  // Create Bonus Keyboard
  createBonusKeyboard(bonusCode) {
    return [
      [
        {
          text: `💰 Claim ${bonusCode}`,
          url: this.createTrackingUrl(`https://gizebets.et/bonus?code=${bonusCode}`, `bonus_${bonusCode}`)
        }
      ],
      [
        {
          text: '🎮 Sports Betting',
          url: this.createTrackingUrl('https://gizebets.et/sports', 'bonus_sports')
        },
        {
          text: '🎰 Casino Games',
          url: this.createTrackingUrl('https://gizebets.et/casino', 'bonus_casino')
        }
      ]
    ];
  }

  // Create tracking URL with UTM parameters
  createTrackingUrl(baseUrl, trackingId) {
    const url = new URL(baseUrl);
    url.searchParams.set('utm_source', 'telegram');
    url.searchParams.set('utm_medium', 'gizebot');
    url.searchParams.set('utm_campaign', 'daily_auto');
    url.searchParams.set('utm_content', trackingId);
    url.searchParams.set('track_id', trackingId);
    
    return url.toString();
  }

  // Track message for analytics
  trackMessage(type, messageId, metadata = {}) {
    const timestamp = new Date().toISOString();
    const trackingData = {
      type,
      messageId,
      timestamp,
      clicks: 0,
      ...metadata
    };
    
    this.clickStats.set(messageId, trackingData);
    
    // Log for analytics
    console.log(`📊 Tracking ${type} message:`, {
      messageId,
      timestamp,
      metadata
    });
  }

  // Get click statistics
  getClickStats() {
    const stats = {};
    
    for (const [messageId, data] of this.clickStats.entries()) {
      if (!stats[data.type]) {
        stats[data.type] = {
          totalMessages: 0,
          totalClicks: 0,
          messages: []
        };
      }
      
      stats[data.type].totalMessages++;
      stats[data.type].totalClicks += data.clicks;
      stats[data.type].messages.push({
        messageId,
        timestamp: data.timestamp,
        clicks: data.clicks
      });
    }
    
    return stats;
  }

  // Manual command: Send promo to all
  async executePromoCommand(promoType = 'football') {
    try {
      console.log(`🎯 Executing manual promo command: ${promoType}`);
      
      const promoMessages = {
        football: {
          content: `⚽ ፉትቦል ልዩ ቦናስ! ⚽

🔥 100% የመጀመሪያ ቦናስ!
🎁 ኮድ: FOOTBALL100
⏰ ዛሬ ብቻ!

💰 አሁኑኑ ይመዝገቡ እና ድርብ ገንዘብ ያግኙ!

🔗 gizebets.et/football`,
          code: 'FOOTBALL100'
        },
        casino: {
          content: `🎰 ካሲኖ መጋቢት ቦናስ! 🎰

🎁 200% + 50 ነፃ ስፒን!
🔑 ኮድ: CASINO200
⭐ ዛሬ እና ነገ ብቻ!

🎮 በሁሉም ታዋቂ ጨዋታዎች ይሸንፉ!

🔗 gizebets.et/casino`,
          code: 'CASINO200'
        }
      };
      
      const promo = promoMessages[promoType] || promoMessages.football;
      return await this.sendPromo(promo.content, promo.code);
      
    } catch (error) {
      console.error('❌ Error executing promo command:', error);
      throw error;
    }
  }

  // Manual command: Send bonus to all
  async executeBonusCommand(bonusText) {
    try {
      console.log('🎁 Executing manual bonus command');
      
      const content = `🎉 ልዩ ቦናስ ማስታወቂያ! 🎉

${bonusText}

⏰ ውሱን ጊዜ ብቻ!
🔥 አሁኑኑ ይጠቀሙ

💸 gizebets.et/bonus
📱 ወይም በቴሌግራም ቦታችን ላይ ይመዝገቡ

#GizeBets #ቦናስ #ያሸንፉ`;

      return await this.sendBonus(content, 'SPECIAL');
      
    } catch (error) {
      console.error('❌ Error executing bonus command:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const me = await this.bot.getMe();
      console.log('✅ Telegram bot connected:', me.username);
      return true;
    } catch (error) {
      console.error('❌ Telegram connection failed:', error);
      return false;
    }
  }
}

module.exports = TelegramManager;