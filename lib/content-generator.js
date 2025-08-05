// Content Generator for GizeBets - ALL CONTENT IN ENGLISH
// Generates dynamic automated posts for the GizeBets Telegram channel

const { OpenAI } = require('openai');

class ContentGenerator {
  constructor(websiteUrl = 'gizebets.et') {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.websiteUrl = websiteUrl;
  }

  // Generate individual match prediction (focused and concise)
  async generateSingleMatchPrediction(match, matchIndex, promoCode = 'WIN10') {
    try {
      const hasDetailedData = match.homeTeamData && match.awayTeamData;
      
      let matchAnalysis;
      if (hasDetailedData) {
        matchAnalysis = this.formatEnhancedMatchData(match);
      } else {
        matchAnalysis = `${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam} - ${match.competition?.name || match.competition} - ${this.formatTime(match.kickoffTime)}`;
      }

      const prompt = `
You are a professional sports betting analyst for GizeBets Telegram channel.

MATCH ANALYSIS:
${matchAnalysis}

Create a CONCISE English betting prediction (max 4 lines) with:
1. ONE primary betting recommendation (1X2, Over/Under, or BTTS)
2. Brief confidence level (High/Medium/Low) 
3. Quick reasoning (1 sentence)
4. Expected outcome

Keep it short, focused, and professional for serious bettors.
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: "You are a professional sports betting analyst. Write ONLY in English. Keep predictions concise (max 4 lines). Focus on ONE main bet per match."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.6
      });

      let content = response.choices[0].message.content.trim();
      
      // Add match number and time info
      const timeStr = this.formatTime(match.kickoffTime);
      const header = `🎯 MATCH ${matchIndex + 1}/5 | ⏰ ${timeStr}`;
      
      // Only add promo on last match to avoid spam
      if (matchIndex === 4) {
        content += `\n\n💎 Use code: ${promoCode} | 🔗 ${this.websiteUrl}`;
      }
      
      return `${header}\n${content}`;

    } catch (error) {
      console.error('Error generating single match prediction:', error);
      return this.getFallbackSinglePrediction(match, matchIndex, promoCode);
    }
  }

  // Generate Top 5 Match Predictions - returns array of individual predictions
  async generateTop5Predictions(matches, promoCode = 'WIN10') {
    try {
      const predictions = [];
      
      // Generate prediction for each match individually
      for (let i = 0; i < Math.min(5, matches.length); i++) {
        const prediction = await this.generateSingleMatchPrediction(matches[i], i, promoCode);
        predictions.push(prediction);
        
        // Small delay between AI calls to avoid rate limiting
        if (i < matches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return predictions;

    } catch (error) {
      console.error('Error generating predictions:', error);
      return this.getFallbackPredictions(matches, promoCode);
    }
  }

  // Format enhanced match data for AI analysis
  formatEnhancedMatchData(match) {
    if (!match.homeTeamData || !match.awayTeamData) {
      return `${match.homeTeam.name} vs ${match.awayTeam.name} - ${match.competition.name}`;
    }

    const homeStats = match.homeTeamData.stats;
    const awayStats = match.awayTeamData.stats;
    const factors = match.predictionFactors;

    return `🏆 ${match.homeTeam.name} vs ${match.awayTeam.name} (${match.competition.name})
⏰ ${this.formatTime(match.kickoffTime)}
🏠 Home Form: ${match.homeTeamData.form} (${homeStats.winPercentage}% wins, ${homeStats.averageGoalsFor} goals/game)
✈️ Away Form: ${match.awayTeamData.form} (${awayStats.winPercentage}% wins, ${awayStats.averageGoalsFor} goals/game)
🆚 H2H: ${factors.h2hTrend} (${match.headToHead.totalMatches} recent matches)
⚽ Expected Goals: ${factors.goalExpectancy}
🎯 Risk Level: ${factors.riskLevel}`;
  }

  // Generate Daily Results in English
  async generateDailyResults(results) {
    try {
      const resultsList = results.map(result => 
        `${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam}`
      ).join('\n');

      const prompt = `
You are a sports results reporter for GizeBets Telegram channel.

Today's Results:
${resultsList}

Create engaging English content with:

1. Present today's match results in an attractive format
2. Brief commentary on key results
3. Highlight outstanding performances or surprise results
4. Mention upcoming matches preview
5. Use engaging emojis
6. Include the website ${this.websiteUrl}

Keep it informative and engaging for sports betting enthusiasts.
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sports results reporter for GizeBets. Write ONLY in English. Your content should be informative and engaging for sports betting enthusiasts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.6
      });

      let content = response.choices[0].message.content.trim();
      
      // Add footer
      content += `\n\n📊 Full Results & Analysis\n🔗 ${this.websiteUrl}`;
      
      return content;

    } catch (error) {
      console.error('Error generating results:', error);
      return this.getFallbackResults(results);
    }
  }

  // Generate Daily Promo Message in English
  async generatePromoMessage(promoCode = 'WIN10', bonusOffer = '100% Bonus') {
    try {
      const prompt = `
You are a marketing specialist for GizeBets Telegram channel.

Today's Bonus: ${bonusOffer}
Code: ${promoCode}

Create engaging English promotional content with:

1. Exciting and compelling bonus announcement
2. Simple instructions on how to use the bonus
3. Create urgency (limited time offer)
4. Strong call to action
5. Use engaging emojis
6. Include the website ${this.websiteUrl}

Make this motivating and exciting for betting enthusiasts.
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a marketing specialist for GizeBets. Write ONLY in English. Your content should be engaging, exciting, and actionable for betting enthusiasts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.8
      });

      let content = response.choices[0].message.content.trim();
      
      // Ensure promo code and link are included
      if (!content.includes(promoCode)) {
        content += `\n\n🎁 Code: ${promoCode}`;
      }
      content += `\n🔗 ${this.websiteUrl}`;
      
      return content;

    } catch (error) {
      console.error('Error generating promo:', error);
      return this.getFallbackPromo(promoCode, bonusOffer);
    }
  }

  // Generate Custom Bonus Message
  generateBonusMessage(bonusText) {
    return `🎉 Special Bonus Announcement! 🎉

${bonusText}

⏰ Limited Time Only!
🔥 Claim Now

💸 ${this.websiteUrl}/bonus
📱 Or register on our platform

#GizeBets #Bonus #Win`;
  }

  // Fallback single prediction when AI fails
  getFallbackSinglePrediction(match, matchIndex, promoCode = 'WIN10') {
    const homeTeam = match.homeTeam?.name || match.homeTeam;
    const awayTeam = match.awayTeam?.name || match.awayTeam;
    const competition = match.competition?.name || match.competition;
    const timeStr = this.formatTime(match.kickoffTime);
    
    const predictions = ['Over 2.5 Goals', 'Both Teams to Score', 'Home Win', 'Draw', 'Away Win'];
    const header = `🎯 MATCH ${matchIndex + 1}/5 | ⏰ ${timeStr}`;
    let content = `⚽ ${homeTeam} vs ${awayTeam}\n🏆 ${competition}\n🎯 ${predictions[matchIndex]} | Confidence: Medium\n💡 Solid betting opportunity`;
    
    // Only add promo on last match
    if (matchIndex === 4) {
      content += `\n\n💎 Use code: ${promoCode} | 🔗 ${this.websiteUrl}`;
    }
    
    return `${header}\n${content}`;
  }

  // Fallback content when AI fails - returns array
  getFallbackPredictions(matches, promoCode = 'WIN10') {
    if (!matches || matches.length === 0) {
      return [`🎯 TOP BETTING PREDICTIONS\n📊 Premium predictions temporarily unavailable\n💎 Use code: ${promoCode} | 🔗 ${this.websiteUrl}`];
    }

    const predictions = [];
    matches.slice(0, 5).forEach((match, index) => {
      const prediction = this.getFallbackSinglePrediction(match, index, promoCode);
      predictions.push(prediction);
    });
    
    return predictions;
  }

  getFallbackResults(results) {
    let content = '📊 Today\'s Results 📊\n\n';
    
    results.forEach(result => {
      content += `${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam}\n`;
    });
    
    content += `\n🔗 Full Results: ${this.websiteUrl}`;
    return content;
  }

  getFallbackPromo(promoCode, bonusOffer) {
    return `🎁 Today's Special Bonus! 🎁

Get ${bonusOffer}!

💰 Code: ${promoCode}
⏰ Today Only!
🔥 Claim Now

🔗 ${this.websiteUrl}/bonus`;
  }

  // Utility functions
  formatTime(date) {
    return date.toLocaleTimeString('am-ET', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Africa/Addis_Ababa'
    });
  }

  formatDate(date) {
    return date.toLocaleDateString('am-ET', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      timeZone: 'Africa/Addis_Ababa'
    });
  }
}

module.exports = ContentGenerator;