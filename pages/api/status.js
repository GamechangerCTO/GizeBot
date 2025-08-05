// API Endpoint to check GizeBets system status
// GET /api/status - Get current system status and statistics

import { scheduler } from './start';
const botAutoStart = require('../../lib/bot-auto-start');

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

    // Get system status
    const systemStatus = scheduler ? scheduler.getStatus() : {
      isRunning: false,
      dailyStats: { predictionsPosted: 0, resultsPosted: 0, promosPosted: 0, errors: 0 },
      message: 'System not initialized'
    };

    // Get current time in Ethiopia timezone
    const now = new Date();
    const ethiopianTime = now.toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Get click analytics if available
    const clickStats = scheduler ? scheduler.telegram.getClickStats() : {};

    // Calculate next scheduled times
    const nextScheduled = calculateNextScheduledTimes();

    const response = {
      success: true,
      timestamp: now.toISOString(),
      ethiopianTime: ethiopianTime,
      system: {
        status: systemStatus.isRunning ? 'running' : 'stopped',
        uptime: systemStatus.isRunning ? 'Active' : 'Inactive',
        ...systemStatus
      },
      analytics: {
        clickTracking: clickStats,
        totalClicks: Object.values(clickStats).reduce((sum, stat) => sum + stat.totalClicks, 0),
        totalMessages: Object.values(clickStats).reduce((sum, stat) => sum + stat.totalMessages, 0)
      },
      schedule: nextScheduled,
      endpoints: {
        start: '/api/start',
        stop: '/api/stop',
        manualPredictions: '/api/manual/predictions',
        manualResults: '/api/manual/results', 
        manualPromo: '/api/manual/promo',
        manualBonus: '/api/manual/bonus',
        analytics: '/api/analytics'
      },
      channelInfo: {
        channelId: process.env.CHANNEL_ID || '@gizebetgames',
        language: 'Amharic (am)',
        timezone: 'Africa/Addis_Ababa',
        features: [
          'Daily Top 5 Predictions',
          'Daily Results Summary',
          'Promotional Messages',
          'Click Tracking',
          'Manual Commands'
        ]
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error getting system status:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get system status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function calculateNextScheduledTimes() {
  const now = new Date();
  const ethiopianNow = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Addis_Ababa"}));
  
  const schedules = {
    predictions: calculateNextPredictionTime(ethiopianNow),
    results: calculateNextResultsTime(ethiopianNow),
    morningPromo: calculateNextTime(ethiopianNow, 10, 0), // 10 AM
    afternoonPromo: calculateNextTime(ethiopianNow, 14, 0), // 2 PM
    eveningPromo: calculateNextTime(ethiopianNow, 18, 0), // 6 PM
    analytics: calculateNextTime(ethiopianNow, 0, 0) // Midnight
  };

  return schedules;
}

function calculateNextPredictionTime(now) {
  // Predictions run every 2 hours from 8 AM to 8 PM
  const predictionHours = [8, 10, 12, 14, 16, 18, 20];
  const currentHour = now.getHours();
  
  for (const hour of predictionHours) {
    if (hour > currentHour) {
      const next = new Date(now);
      next.setHours(hour, 0, 0, 0);
      return next.toISOString();
    }
  }
  
  // Next day at 8 AM
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(8, 0, 0, 0);
  return next.toISOString();
}

function calculateNextResultsTime(now) {
  // Results at 11 PM daily
  const next = new Date(now);
  if (now.getHours() >= 23) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(23, 0, 0, 0);
  return next.toISOString();
}

function calculateNextTime(now, hour, minute) {
  const next = new Date(now);
  if (now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute)) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}