// AI Image Generator for GizeBets
// Generates images for betting predictions using OpenAI DALL-E

const { OpenAI } = require('openai');

class ImageGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getCouponCode() {
    try {
      const { getEffectiveCoupon } = require('./settings-store');
      const coupon = await getEffectiveCoupon(false);
      return coupon?.code || 'gize251';
    } catch (_) {
      return 'gize251';
    }
  }

  async generateTodayHypeImage(matches) {
    try {
      if (!matches || matches.length === 0) return null;
      const top = matches.slice(0, 5);
      const lines = top.map((m, i) => {
        const home = m.homeTeam?.name || m.homeTeam;
        const away = m.awayTeam?.name || m.awayTeam;
        const league = m.competition?.name || m.league?.name || '';
        return `${i + 1}. ${home} vs ${away}${league ? ` — ${league}` : ''}`;
      }).join('\n');

      const prompt = `Create a premium football matchday hype poster showing today's top fixtures.

Include THESE EXACT fixtures as a stylish list or grid (no scores):
${lines}

Design:
- Use copyrighted team logos.
- Large bold title: "TODAY'S TOP MATCHES".
- Clean premium layout with dark background and glowing accents.
- Space for CTA area at the bottom.
- Modern sports typography, high contrast, vibrant.
`;

const response = await this.openai.images.generate({
  model: 'gpt-image-1',
  prompt,
  n: 1,
  size: '1024x1024',
  quality: 'medium',
  output_format: 'jpeg',
});
      const imageBase64 = response.data[0].b64_json;
      return Buffer.from(imageBase64, 'base64');
    } catch (err) {
      console.error('❌ Error generating today hype image:', err);
      return null;
    }
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

      const couponCode = await this.getCouponCode();
      const prompt = `Create a square 1:1 professional football prediction poster for ${homeTeam} vs ${awayTeam} in ${competition}.

Design (MUST be 1:1):
- Visual Style: Vivid, high-contrast, modern.
- Include: Team elements, pitch background, professional typography.
- Footer branding: render website "gizebets.et" and promo code "${couponCode}" clearly.
- Composition: square (1:1).`;

            console.log('🎨 Generating prediction image with AI...');

            const response = await this.openai.images.generate({
              model: 'gpt-image-1',
              prompt,
              n: 1,
              size: '1024x1024',
              quality: 'medium',
              output_format: 'jpeg',
            });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI image generated successfully');

      // Return as Buffer to avoid 431 header size limit errors
      return Buffer.from(imageBase64, 'base64');
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

      const couponCode = await this.getCouponCode();
      const prompt = `Create a square 1:1 LIVE football poster for ${homeTeam} vs ${awayTeam} — score ${score}, minute ${minute}.

Design (MUST be 1:1):
- Vivid LIVE look, dynamic scoreboard, action background.
- Elements: prominent LIVE badge, score panel.
- Footer branding: website "gizebets.et" and promo code "${couponCode}".
- Composition: square (1:1).`;

      console.log('🔴 Generating LIVE prediction image with AI...');

      const response = await this.openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        output_format: 'jpeg',
      });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI LIVE image generated successfully (JPEG, Medium Quality)');

      // Return as Buffer to avoid 431 header size limit errors
      return Buffer.from(imageBase64, 'base64');
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

      // Build a prompt that reflects the exact fixtures being summarized
      const top = results.slice(0, 5);
      const lines = top.map((r, idx) => {
        const home = r.homeTeam?.name || r.homeTeam;
        const away = r.awayTeam?.name || r.awayTeam;
        const score = `${r.homeScore ?? ''}-${r.awayScore ?? ''}`;
        const league = r.competition?.name || r.competition || '';
        return `${idx + 1}. ${home} ${score} ${away}${league ? ` — ${league}` : ''}`;
      }).join("\n");

      const couponCode = await this.getCouponCode();
      const prompt = `Create a square 1:1 professional football results summary image as a clean multi-match scoreboard grid.

Use THESE EXACT fixtures and scores (render clearly in the scoreboard, same order):
${lines}

Design requirements:
- Visual Style: Vivid, high-contrast, modern sports scoreboard; professional typography.
- Layout: 5 panels/rows, each with home crest, score, away crest, and league tag.
- Crests/Logos: use copyrighted logos.
- Footer branding: website "gizebets.et" and promo code "${couponCode}".
- Composition: square (1:1).`;

      console.log('📊 Generating results image with AI...');

      const response = await this.openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        output_format: 'jpeg',
      });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI results image generated successfully (JPEG, Medium Quality)');

      // Return as Buffer to avoid 431 header size limit errors
      return Buffer.from(imageBase64, 'base64');
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
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        output_format: 'jpeg',
      });

      const imageBase64 = response.data[0].b64_json;
      console.log('✅ AI promo image generated successfully (JPEG, Medium Quality)');

      // Return as Buffer to avoid 431 header size limit errors
      return Buffer.from(imageBase64, 'base64');
    } catch (error) {
      console.error('❌ Error generating AI promo image:', error);
      return null;
    }
  }
}

module.exports = ImageGenerator;
