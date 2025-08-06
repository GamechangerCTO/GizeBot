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
  async generateSingleMatchPrediction(match, matchIndex, totalMatches, promoCode = 'WIN10') {
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
      
      // Add match number and time info - dynamic header based on actual number of matches
      const timeStr = this.formatTime(match.kickoffTime);
      const header = `🎯 MATCH ${matchIndex + 1}/${totalMatches} | ⏰ ${timeStr}`;
      
      // Only add promo on last match to avoid spam
      if (matchIndex === totalMatches - 1) {
        content += `\n\n💎 Use code: ${promoCode} | 🔗 ${this.websiteUrl}`;
      }
      
      return `${header}\n${content}`;

    } catch (error) {
      console.error('Error generating single match prediction:', error);
      return this.getFallbackSinglePrediction(match, matchIndex, totalMatches, promoCode);
    }
  }

  // Generate predictions for available matches - returns array of individual predictions
  async generateTop5Predictions(matches, promoCode = 'WIN10') {
    try {
      const predictions = [];
      const totalMatches = Math.min(5, matches.length); // Max 5, but could be less
      
      console.log(`🎯 Generating predictions for ${totalMatches} matches (out of ${matches.length} available)`);
      
      // Generate prediction for each available match individually
      for (let i = 0; i < totalMatches; i++) {
        const prediction = await this.generateSingleMatchPrediction(matches[i], i, totalMatches, promoCode);
        predictions.push(prediction);
        
        // Small delay between AI calls to avoid rate limiting
        if (i < totalMatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return predictions;

    } catch (error) {
      console.error('Error generating predictions:', error);
      return this.getFallbackPredictions(matches, promoCode);
    }
  }

  // Generate Live Match Predictions - for currently active matches
  async generateLivePredictions(liveMatches, promoCode = 'LIVE10') {
    try {
      const predictions = [];
      const totalLiveMatches = Math.min(3, liveMatches.length); // Max 3 live predictions
      
      console.log(`🔴 Generating live predictions for ${totalLiveMatches} matches (out of ${liveMatches.length} live)`);
      
      // Generate prediction for each live match individually
      for (let i = 0; i < totalLiveMatches; i++) {
        const match = liveMatches[i];
        const prediction = await this.generateSingleLivePrediction(match, i, totalLiveMatches, promoCode);
        predictions.push(prediction);
        
        // Small delay between AI calls
        if (i < totalLiveMatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return predictions;

    } catch (error) {
      console.error('Error generating live predictions:', error);
      return this.getFallbackLivePredictions(liveMatches, promoCode);
    }
  }

  // Generate individual live match prediction
  async generateSingleLivePrediction(match, matchIndex, totalLiveMatches, promoCode = 'LIVE10') {
    try {
      const prompt = `
You are a professional live sports betting analyst for GizeBets Telegram channel.

LIVE MATCH ANALYSIS:
${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}
Status: ${match.status} (${match.minute}' minutes)
Competition: ${match.competition}

Create a LIVE BETTING prediction (max 4 lines) focusing on:
1. In-play betting recommendation based on current score
2. Next goal scorer or final result prediction
3. Brief confidence level and reasoning
4. Quick live analysis

Keep it urgent and exciting for live betting!
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: "You are a live sports betting expert. Write ONLY in English. Focus on in-play betting opportunities. Keep predictions urgent and concise (max 4 lines)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      let content = response.choices[0].message.content.trim();
      
      // Add live match header - dynamic based on actual number of live matches
      const header = `🔴 LIVE MATCH ${matchIndex + 1}/${totalLiveMatches} | ${match.minute}' MIN`;
      const scoreUpdate = `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`;
      
      // Only add promo on last live match
      if (matchIndex === totalLiveMatches - 1) {
        content += `\n\n⚡ Live code: ${promoCode} | 🔗 ${this.websiteUrl}`;
      }
      
      return `${header}\n${scoreUpdate}\n${content}`;

    } catch (error) {
      console.error('Error generating single live prediction:', error);
      return this.getFallbackSingleLivePrediction(match, matchIndex, totalLiveMatches, promoCode);
    }
  }

  // Fallback live predictions
  getFallbackLivePredictions(liveMatches, promoCode = 'LIVE10') {
    if (!liveMatches || liveMatches.length === 0) {
      return [`🔴 LIVE BETTING\n📺 No live matches available right now\n⚡ Live code: ${promoCode} | 🔗 ${this.websiteUrl}`];
    }

    const predictions = [];
    const totalLiveMatches = Math.min(3, liveMatches.length);
    
    liveMatches.slice(0, totalLiveMatches).forEach((match, index) => {
      const prediction = this.getFallbackSingleLivePrediction(match, index, totalLiveMatches, promoCode);
      predictions.push(prediction);
    });
    
    return predictions;
  }

  // Fallback single live prediction
  getFallbackSingleLivePrediction(match, matchIndex, totalLiveMatches, promoCode = 'LIVE10') {
    const header = `🔴 LIVE MATCH ${matchIndex + 1}/${totalLiveMatches} | ${match.minute}' MIN`;
    const scoreUpdate = `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`;
    let content = `🏆 ${match.competition}\n🎯 Next Goal: Both teams scoring | Confidence: Medium\n⚡ Live betting opportunity!`;
    
    // Only add promo on last live match
    if (matchIndex === totalLiveMatches - 1) {
      content += `\n\n⚡ Live code: ${promoCode} | 🔗 ${this.websiteUrl}`;
    }
    
    return `${header}\n${scoreUpdate}\n${content}`;
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

  // Generate Live Results - for recently finished matches
  async generateLiveResults(recentResults, promoCode = 'RESULTS10') {
    try {
      if (!recentResults || recentResults.length === 0) {
        return `⚡ <b>LIVE RESULTS UPDATE</b>\n\n📊 No recent results available\n\n🔗 Full Results: ${this.websiteUrl}`;
      }

      const prompt = `
You are a professional sports results analyst for GizeBets Telegram channel.

RECENT MATCH RESULTS:
${recentResults.map(result => 
  `${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam} (${result.competition})`
).join('\n')}

Create an exciting LIVE RESULTS update in English with:
1. Brief commentary on surprising results or standout performances
2. Key highlights from the matches
3. Any upset results or notable scores
4. Keep it engaging and informative
5. Max 6-7 lines total

Make it feel fresh and immediate!
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: "You are a sports results expert. Write ONLY in English. Focus on key highlights and surprises from recent results. Keep it exciting and brief."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      let content = response.choices[0].message.content.trim();
      
      // Format results with header
      let formattedResults = `⚡ <b>LIVE RESULTS UPDATE</b>\n\n`;
      
      // Add individual results
      recentResults.forEach(result => {
        formattedResults += `⚽ <b>${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam}</b>\n`;
        formattedResults += `🏆 ${result.competition}\n\n`;
      });
      
      // Add AI commentary
      formattedResults += `💬 <i>${content}</i>\n\n`;
      
      // Add footer
      formattedResults += `🎁 Claim bonus with code: ${promoCode}\n`;
      formattedResults += `🔗 Full Analysis: ${this.websiteUrl}`;
      
      return formattedResults;

    } catch (error) {
      console.error('Error generating live results:', error);
      return this.getFallbackLiveResults(recentResults, promoCode);
    }
  }

  // Fallback live results
  getFallbackLiveResults(recentResults, promoCode = 'RESULTS10') {
    let content = `⚡ <b>LIVE RESULTS UPDATE</b>\n\n`;
    
    if (recentResults && recentResults.length > 0) {
      recentResults.forEach(result => {
        content += `⚽ <b>${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam}</b>\n`;
        content += `🏆 ${result.competition}\n\n`;
      });
      
      content += `💬 <i>Great matches with exciting results! Check our analysis for betting insights.</i>\n\n`;
    } else {
      content += `📊 No recent results available at the moment\n\n`;
    }
    
    content += `🎁 Claim bonus with code: ${promoCode}\n`;
    content += `🔗 Full Analysis: ${this.websiteUrl}`;
    
    return content;
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
You are a creative marketing expert for GizeBets, a premium sports betting platform.

BONUS DETAILS:
- Offer: ${bonusOffer}
- Code: ${promoCode}
- Platform: ${this.websiteUrl}

Create an IRRESISTIBLE English promo message that:

1. 🎯 POWERFUL opening that creates instant excitement
2. 💰 Crystal clear bonus value with specific benefits
3. 🚀 Strong urgency without being pushy  
4. 📱 Simple 3-step claim process
5. 🔥 Emotional appeal to big winners
6. ✨ Perfect emoji usage (strategic, not spam)
7. 🎲 Written for smart, serious bettors

CRITICAL REQUIREMENTS:
- Write 8-12 engaging sentences with rich content
- Use "YOU" to make it highly personal
- Include SPECIFIC benefits and outcomes
- Add EMOTIONAL hooks and excitement
- Include SUCCESS stories and winning mindset
- Make them feel like an INSIDER getting exclusive access
- Use action words and power phrases
- Include the promo code as the GOLDEN KEY
- Create urgency with specific time limits
- End with strong call-to-action

CONTENT STYLE:
- Write like a successful bettor sharing winning secrets
- Include specific scenarios and examples
- Use numbers and percentages to show value
- Create vivid imagery of success and winning
- Make it feel like premium insider information

MANDATORY LANGUAGE RULES:
- WRITE ONLY IN ENGLISH - NO EXCEPTIONS
- IGNORE any context about Ethiopia or Amharic 
- NO Amharic characters: ፉ, ት, ቦ, ል, ን, ስ, etc.
- Use Latin alphabet ONLY: A-Z, a-z
- Example output should look like: "Get ready to WIN BIG with our exclusive bonus!"
- NEVER output: ፉትቦል or ቦናስ or any similar characters
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an ENGLISH marketing expert. ABSOLUTE RULE: Output ONLY English text. The website gizebets.et serves English customers. NEVER use Amharic script (ፉ,ት,ቦ,ል characters). Write engaging promotional content in perfect English. Output example: 'Ready to WIN? Grab your exclusive 200% bonus now!'"
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
  getFallbackSinglePrediction(match, matchIndex, totalMatches, promoCode = 'WIN10') {
    const homeTeam = match.homeTeam?.name || match.homeTeam;
    const awayTeam = match.awayTeam?.name || match.awayTeam;
    const competition = match.competition?.name || match.competition;
    const timeStr = this.formatTime(match.kickoffTime);
    
    const predictions = ['Over 2.5 Goals', 'Both Teams to Score', 'Home Win', 'Draw', 'Away Win'];
    const header = `🎯 MATCH ${matchIndex + 1}/${totalMatches} | ⏰ ${timeStr}`;
    let content = `⚽ ${homeTeam} vs ${awayTeam}\n🏆 ${competition}\n🎯 ${predictions[matchIndex]} | Confidence: Medium\n💡 Solid betting opportunity`;
    
    // Only add promo on last match
    if (matchIndex === totalMatches - 1) {
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
    const totalMatches = Math.min(5, matches.length);
    
    matches.slice(0, totalMatches).forEach((match, index) => {
      const prediction = this.getFallbackSinglePrediction(match, index, totalMatches, promoCode);
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
    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleTimeString('am-ET', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Africa/Addis_Ababa'
    });
  }

  formatDate(date) {
    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('am-ET', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      timeZone: 'Africa/Addis_Ababa'
    });
  }
}

module.exports = ContentGenerator;