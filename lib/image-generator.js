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
      
      Visual Style: Vivid, hyper-real and dramatic style with vibrant colors and high contrast.
      Include: Two team shields/logos represented abstractly, football/soccer field background, betting odds elements, professional typography.
      Colors: Blue and green gradients with white text.
      Mood: Exciting, professional, trustworthy betting atmosphere.
      Text overlay space: Leave room for text overlay in the center.
      
      No actual team logos or copyrighted content. Abstract geometric representations only.`;

      console.log('🎨 Generating prediction image with AI...');

      const response = await this.openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "JPEG"
      });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI image generated successfully (JPEG, Medium Quality)');
      
      return `data:image/jpeg;base64,${imageBase64}`;

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
      
      Visual Style: Vivid, hyper-real and dramatic style with bright, pulsing colors and high contrast.
      Include: Live scoreboard elements, countdown timer graphics, football field with action, energy effects.
      Colors: Red and orange gradients with white text, indicating LIVE action.
      Mood: Urgent, exciting, in-the-moment betting opportunity.
      Elements: "LIVE" indicator, score display area, dynamic background.
      
      Include team logos.`;

      console.log('🔴 Generating LIVE prediction image with AI...');

      const response = await this.openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "JPEG"
      });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI LIVE image generated successfully (JPEG, Medium Quality)');
      
      return `data:image/jpeg;base64,${imageBase64}`;

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
      like a score board with multiple matches.
      
      Visual Style: Vivid, hyper-real and dramatic style with vibrant colors and high contrast.
      Include: Multiple score displays, trophy icons, confetti effects, results grid layout.
      Colors: Gold and blue gradients with white text, celebrating successful predictions.
      Mood: Victory, success, professional analysis achievement.
      Elements: Results table layout, celebration graphics, professional sports typography.
      
      Include team logos.`;

      console.log('📊 Generating results image with AI...');

      const response = await this.openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "JPEG"
      });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI results image generated successfully (JPEG, Medium Quality)');
      
      return `data:image/jpeg;base64,${imageBase64}`;

    } catch (error) {
      console.error('❌ Error generating AI results image:', error);
      return null;
    }
  }

  // Generate promotional image
  async generatePromoImage(promoCode) {
    try {
      const prompt = `Generate a modern professional promo image for a premium betting platform.

Background
- Smooth vertical gradient from rich green (#00A650) to black with subtle diagonal streaks.

Foreground
- Confident young African man and woman smiling while entering promo code "${promoCode}" on a smartphone.
- Floating digital-cash icons and faint banknote overlays that suggest winnings.

Key Elements
- Large badge "${promoCode}" beside a prominent textbox showing "${promoCode}".
- Gift-box or ribbon icon near the bonus badge.
- Small countdown-timer icon to imply urgency.
- Clear call-to-action button ("Claim bonus") beneath the code.

Branding
- Website name "gizebets.et" in bold sans-serif at the top center.
- Optional tagline under the brand: "Play smart - win big".

Colors & Typography
- Green-to-black palette with crisp white text for contrast; gold accent on the bonus badge.
- Bold modern display fonts for headings, clean sans-serif for body copy.

Visual Style
- Vivid, hyper-real and dramatic style with vibrant colors and high contrast.
- Professional, trustworthy, aspirational, premium mood.
- Realistic lighting, high resolution, balanced composition.
- Exclude any references to gambling addiction or disclaimers.
`;

      console.log('🎁 Generating promo image with AI...');

      const response = await this.openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "JPEG"
      });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI promo image generated successfully (JPEG, Medium Quality)');
      
      return `data:image/jpeg;base64,${imageBase64}`;

    } catch (error) {
      console.error('❌ Error generating AI promo image:', error);
      return null;
    }
  }
}

module.exports = ImageGenerator;
