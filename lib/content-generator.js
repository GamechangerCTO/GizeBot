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

  // Generate Top 5 Match Predictions in English with detailed analysis
  async generateTop5Predictions(matches, promoCode = 'WIN10') {
    try {
      // Check if we have enhanced match data
      const hasDetailedData = matches.length > 0 && matches[0].homeTeamData;
      
      let matchAnalysis;
      if (hasDetailedData) {
        matchAnalysis = matches.map(match => 
          this.formatEnhancedMatchData(match)
        ).join('\n\n');
      } else {
        matchAnalysis = matches.map(match => 
          `${match.homeTeam?.name || match.homeTeam} vs ${match.awayTeam?.name || match.awayTeam} - ${match.competition?.name || match.competition} - ${this.formatTime(match.kickoffTime)}`
        ).join('\n');
      }

      const prompt = `
You are a professional sports betting analyst for GizeBets Telegram channel.

${hasDetailedData ? 'DETAILED MATCH ANALYSIS' : 'TODAY\'S TOP 5 SELECTED MATCHES'}:
${matchAnalysis}

Create engaging English betting predictions with:

1. Specific betting recommendations for each match (1X2, Over/Under, BTTS)
2. Brief but professional reasoning based on the data provided
3. Confidence levels (High/Medium/Low) for each prediction
4. Expected goal ranges when applicable
5. Risk assessment for each bet
6. Use relevant emojis for visual appeal
7. Keep format: Match - Prediction - Confidence - Reasoning

Make this professional and data-driven for serious betting enthusiasts.
Website: ${this.websiteUrl}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: "You are a professional sports betting analyst for GizeBets. Write ONLY in English. Your predictions should be data-driven, professional, and include specific betting recommendations with confidence levels."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.6
      });

      let content = response.choices[0].message.content.trim();
      
      // Add promotional footer with dynamic promo code
      content += `\n\n🎁 Claim Today's Bonus!\n💸 Use code: ${promoCode}\n🔗 ${this.websiteUrl}`;
      
      return content;

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

  // Fallback content when AI fails
  getFallbackPredictions(matches, promoCode = 'WIN10') {
    let content = '⚽ Today\'s Top 5 Match Predictions ⚽\n\n';
    
    matches.slice(0, 5).forEach((match, index) => {
      const predictions = ['Over 2.5 Goals', 'Both Teams to Score', 'Home Win', 'Draw', 'Away Win'];
      content += `${index + 1}. ${match.homeTeam} vs ${match.awayTeam}\n`;
      content += `🎯 Prediction: ${predictions[index]}\n`;
      content += `🕐 Time: ${this.formatTime(match.kickoffTime)}\n\n`;
    });
    
    content += `🎁 Claim Today's Bonus!\n💸 Use code: ${promoCode}\n🔗 ${this.websiteUrl}`;
    return content;
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