// AI Image Generator for GizeBets
// Generates images for betting predictions using OpenAI DALL-E

const { OpenAI } = require('openai');

class ImageGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Generate image for football predictions
  async generatePredictionImage(matches) {
    try {
      if (!matches || matches.length === 0) {
        return null;
      }

      // Take the first match for the main image
      const mainMatch = matches[0];
      const homeTeam = mainMatch.homeTeam?.name || mainMatch.homeTeam;
      const awayTeam = mainMatch.awayTeam?.name || mainMatch.awayTeam;
      const competition = mainMatch.competition?.name || mainMatch.competition;

      const prompt = `Create a professional sports betting prediction image for ${homeTeam} vs ${awayTeam} in ${competition}. 
      
      Style: Modern, sleek sports graphics with vibrant colors.
      Include: Two team shields/logos represented abstractly, football/soccer field background, betting odds elements, professional typography.
      Colors: Blue and green gradients with white text.
      Mood: Exciting, professional, trustworthy betting atmosphere.
      Text overlay space: Leave room for text overlay in the center.
      
      No actual team logos or copyrighted content. Abstract geometric representations only.`;

      console.log('🎨 Generating prediction image with AI...');

      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid"
      });

      const imageUrl = response.data[0].url;
      console.log('✅ AI image generated successfully');
      
      return imageUrl;

    } catch (error) {
      console.error('❌ Error generating AI image:', error);
      return null; // Return null so the system continues without image
    }
  }

  // Generate image for live predictions
  async generateLiveImage(liveMatches) {
    try {
      if (!liveMatches || liveMatches.length === 0) {
        return null;
      }

      const mainMatch = liveMatches[0];
      const homeTeam = mainMatch.homeTeam;
      const awayTeam = mainMatch.awayTeam;
      const score = `${mainMatch.homeScore}-${mainMatch.awayScore}`;
      const minute = mainMatch.minute;

      const prompt = `Create a dynamic LIVE sports betting image for ${homeTeam} vs ${awayTeam} currently ${score} at ${minute} minutes.
      
      Style: High-energy, real-time sports graphics with bright, pulsing colors.
      Include: Live scoreboard elements, countdown timer graphics, football field with action, energy effects.
      Colors: Red and orange gradients with white text, indicating LIVE action.
      Mood: Urgent, exciting, in-the-moment betting opportunity.
      Elements: "LIVE" indicator, score display area, dynamic background.
      
      No actual team logos or copyrighted content. Abstract geometric representations only.`;

      console.log('🔴 Generating LIVE prediction image with AI...');

      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024", 
        quality: "standard",
        style: "vivid"
      });

      const imageUrl = response.data[0].url;
      console.log('✅ AI LIVE image generated successfully');
      
      return imageUrl;

    } catch (error) {
      console.error('❌ Error generating AI LIVE image:', error);
      return null;
    }
  }

  // Generate image for results
  async generateResultsImage(results) {
    try {
      if (!results || results.length === 0) {
        return null;
      }

      const prompt = `Create a professional sports results summary image showing multiple football match results.
      
      Style: Clean, modern scoreboard design with celebration elements.
      Include: Multiple score displays, trophy icons, confetti effects, results grid layout.
      Colors: Gold and blue gradients with white text, celebrating successful predictions.
      Mood: Victory, success, professional analysis achievement.
      Elements: Results table layout, celebration graphics, professional sports typography.
      
      No actual team logos or copyrighted content. Abstract geometric representations only.`;

      console.log('📊 Generating results image with AI...');

      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid"
      });

      const imageUrl = response.data[0].url;
      console.log('✅ AI results image generated successfully');
      
      return imageUrl;

    } catch (error) {
      console.error('❌ Error generating AI results image:', error);
      return null;
    }
  }

  // Generate promotional image
  async generatePromoImage(promoCode) {
    try {
      const prompt = `Create an attractive promotional betting bonus image for code "${promoCode}".
      
      Style: Luxury, premium promotional design with golden elements.
      Include: Bonus code display, gift box or reward imagery, premium typography, call-to-action elements.
      Colors: Gold, purple, and white gradients with elegant design.
      Mood: Exclusive, valuable, limited-time opportunity.
      Elements: Promo code highlight, bonus percentage, urgency indicators.
      
      Professional betting promotion aesthetic, no gambling addiction imagery.`;

      console.log('🎁 Generating promo image with AI...');

      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard", 
        style: "vivid"
      });

      const imageUrl = response.data[0].url;
      console.log('✅ AI promo image generated successfully');
      
      return imageUrl;

    } catch (error) {
      console.error('❌ Error generating AI promo image:', error);
      return null;
    }
  }
}

module.exports = ImageGenerator;