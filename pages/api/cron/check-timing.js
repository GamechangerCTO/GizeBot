// Check timing cron - runs every 30 minutes
// Checks if it's time to send predictions based on today's match schedule

const ContentGenerator = require('../../../lib/content-generator');
const TelegramManager = require('../../../lib/telegram');
const fs = require('fs').promises;
const path = require('path');

export default async function handler(req, res) {
  // Only allow GET requests from Vercel Cron
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is a legitimate cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('⏰ Checking if it\'s time to send predictions...');
    
    // Load today's schedule
    let scheduleData;
    try {
      const scheduleFile = path.join(process.cwd(), 'temp', 'daily-schedule.json');
      const fileContent = await fs.readFile(scheduleFile, 'utf8');
      scheduleData = JSON.parse(fileContent);
    } catch (error) {
      console.log('⚠️ No schedule file found, skipping timing check');
      return res.status(200).json({
        success: true,
        message: 'No daily schedule found, run daily-setup first',
        action: 'skipped'
      });
    }

    // Check if schedule is for today
    const today = new Date().toISOString().split('T')[0];
    if (scheduleData.date !== today) {
      console.log('⚠️ Schedule is not for today, skipping');
      return res.status(200).json({
        success: true,
        message: 'Schedule is outdated, waiting for new daily setup',
        scheduleDate: scheduleData.date,
        currentDate: today,
        action: 'skipped'
      });
    }

    const now = new Date();
    const ethiopianTime = new Date().toLocaleString("en-US", {timeZone: "Africa/Addis_Ababa"});
    const currentHour = new Date(ethiopianTime).getHours();

    // Only run during active hours (7 AM - 10 PM Ethiopian time)
    if (currentHour < 7 || currentHour > 22) {
      return res.status(200).json({
        success: true,
        message: 'Outside active hours, skipping check',
        currentHour: currentHour,
        ethiopianTime: ethiopianTime,
        action: 'skipped'
      });
    }

    // Check if any matches need predictions now
    const matchesNeedingPredictions = scheduleData.predictionTimes.filter(timing => {
      const predictionTime = new Date(timing.predictionTime);
      const timeDiff = predictionTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      // Send predictions if we're within 15 minutes of the optimal time
      return minutesDiff >= -15 && minutesDiff <= 15;
    });

    if (matchesNeedingPredictions.length === 0) {
      const nextPrediction = scheduleData.predictionTimes.find(timing => {
        const predictionTime = new Date(timing.predictionTime);
        return predictionTime.getTime() > now.getTime();
      });

      return res.status(200).json({
        success: true,
        message: 'No predictions needed right now',
        nextPrediction: nextPrediction ? {
          match: `${nextPrediction.homeTeam} vs ${nextPrediction.awayTeam}`,
          predictionTime: nextPrediction.predictionTime,
          minutesUntil: Math.round((new Date(nextPrediction.predictionTime).getTime() - now.getTime()) / (1000 * 60))
        } : null,
        ethiopianTime: ethiopianTime,
        action: 'waiting'
      });
    }

    // We have matches that need predictions - send them!
    console.log(`🎯 Sending predictions for ${matchesNeedingPredictions.length} matches`);

    // Load settings for website URL and promo codes
    let settings;
    try {
      const { systemSettings } = await import('../settings');
      settings = systemSettings;
    } catch (error) {
      console.log('⚠️ Using default settings');
      settings = {
        websiteUrl: 'gizebets.et',
        promoCodes: ['WIN10', 'BONUS20', 'SPECIAL'],
        autoPosting: { dynamicTiming: true }
      };
    }

    // Initialize content generator and telegram
    const contentGenerator = new ContentGenerator(settings.websiteUrl);
    const telegram = new TelegramManager();

    // Generate and send predictions
    const randomPromoCode = settings.promoCodes[Math.floor(Math.random() * settings.promoCodes.length)];
    const content = await contentGenerator.generateTop5Predictions(scheduleData.matches, randomPromoCode);
    const message = await telegram.sendPredictions(content);

    console.log('✅ Dynamic predictions sent successfully');

    res.status(200).json({
      success: true,
      message: 'Predictions sent successfully',
      matchesCovered: matchesNeedingPredictions.map(m => `${m.homeTeam} vs ${m.awayTeam}`),
      messageId: message.message_id,
      promoCode: randomPromoCode,
      ethiopianTime: ethiopianTime,
      executedAt: new Date().toISOString(),
      action: 'sent'
    });

  } catch (error) {
    console.error('❌ Check timing error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to check timing and send predictions',
      error: error.message,
      ethiopianTime: new Date().toLocaleString("en-US", {timeZone: "Africa/Addis_Ababa"}),
      executedAt: new Date().toISOString(),
      action: 'error'
    });
  }
}