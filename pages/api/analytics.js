// API Endpoint for GizeBets Analytics
// GET /api/analytics - Get click tracking and performance data

import { scheduler } from './start';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

    if (!scheduler) {
      return res.status(400).json({
        success: false,
        message: 'System not initialized. Please start the system first.',
        startEndpoint: '/api/start'
      });
    }

    // Get click statistics
    const clickStats = scheduler.telegram.getClickStats();
    const systemStatus = scheduler.getStatus();
    
    // Calculate performance metrics
    const performanceMetrics = calculatePerformanceMetrics(clickStats, systemStatus);
    
    // Get today's activity summary
    const todayActivity = getTodayActivity(systemStatus);
    
    // Generate analytics report
    const analyticsReport = {
      success: true,
      timestamp: new Date().toISOString(),
      ethiopianTime: new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa'
      }),
      overview: {
        systemStatus: systemStatus.isRunning ? 'Active' : 'Inactive',
        totalMessagesPosted: getTotalMessages(systemStatus),
        totalClicks: performanceMetrics.totalClicks,
        averageCTR: performanceMetrics.averageCTR,
        topPerformingContent: performanceMetrics.topContent
      },
      dailyStats: {
        today: todayActivity,
        predictions: {
          posted: systemStatus.dailyStats.predictionsPosted,
          clicks: getContentClicks(clickStats, 'predictions'),
          ctr: calculateCTR(systemStatus.dailyStats.predictionsPosted, getContentClicks(clickStats, 'predictions'))
        },
        results: {
          posted: systemStatus.dailyStats.resultsPosted,
          clicks: getContentClicks(clickStats, 'results'),
          ctr: calculateCTR(systemStatus.dailyStats.resultsPosted, getContentClicks(clickStats, 'results'))
        },
        promos: {
          posted: systemStatus.dailyStats.promosPosted,
          clicks: getContentClicks(clickStats, 'promo'),
          ctr: calculateCTR(systemStatus.dailyStats.promosPosted, getContentClicks(clickStats, 'promo'))
        }
      },
      clickTracking: {
        byContent: clickStats,
        topButtons: getTopButtons(clickStats),
        recentActivity: getRecentActivity(clickStats)
      },
      performance: {
        systemUptime: systemStatus.isRunning ? 'Active' : 'Inactive',
        errors: systemStatus.dailyStats.errors,
        successRate: calculateSuccessRate(systemStatus),
        averageEngagement: performanceMetrics.averageEngagement
      },
      recommendations: generateRecommendations(performanceMetrics, systemStatus)
    };

    res.status(200).json(analyticsReport);

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics report',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function calculatePerformanceMetrics(clickStats, systemStatus) {
  const totalClicks = Object.values(clickStats).reduce((sum, stat) => sum + stat.totalClicks, 0);
  const totalMessages = Object.values(clickStats).reduce((sum, stat) => sum + stat.totalMessages, 0);
  
  const averageCTR = totalMessages > 0 ? (totalClicks / totalMessages * 100).toFixed(2) : 0;
  
  // Find top performing content
  const topContent = Object.entries(clickStats)
    .sort((a, b) => b[1].totalClicks - a[1].totalClicks)
    .slice(0, 3)
    .map(([type, data]) => ({
      type,
      clicks: data.totalClicks,
      messages: data.totalMessages,
      ctr: data.totalMessages > 0 ? (data.totalClicks / data.totalMessages * 100).toFixed(2) : 0
    }));

  const averageEngagement = totalMessages > 0 ? (totalClicks / totalMessages).toFixed(2) : 0;

  return {
    totalClicks,
    totalMessages,
    averageCTR: `${averageCTR}%`,
    topContent,
    averageEngagement
  };
}

function getTodayActivity(systemStatus) {
  const total = systemStatus.dailyStats.predictionsPosted + 
                systemStatus.dailyStats.resultsPosted + 
                systemStatus.dailyStats.promosPosted;
  
  return {
    totalPosts: total,
    predictions: systemStatus.dailyStats.predictionsPosted,
    results: systemStatus.dailyStats.resultsPosted,
    promos: systemStatus.dailyStats.promosPosted,
    errors: systemStatus.dailyStats.errors
  };
}

function getTotalMessages(systemStatus) {
  return systemStatus.dailyStats.predictionsPosted + 
         systemStatus.dailyStats.resultsPosted + 
         systemStatus.dailyStats.promosPosted;
}

function getContentClicks(clickStats, contentType) {
  return clickStats[contentType] ? clickStats[contentType].totalClicks : 0;
}

function calculateCTR(messages, clicks) {
  if (messages === 0) return '0%';
  return `${(clicks / messages * 100).toFixed(2)}%`;
}

function calculateSuccessRate(systemStatus) {
  const total = getTotalMessages(systemStatus) + systemStatus.dailyStats.errors;
  if (total === 0) return '100%';
  
  const successRate = ((total - systemStatus.dailyStats.errors) / total * 100).toFixed(2);
  return `${successRate}%`;
}

function getTopButtons(clickStats) {
  const allButtons = [];
  
  Object.values(clickStats).forEach(stat => {
    if (stat.messages) {
      stat.messages.forEach(message => {
        // This would need to be enhanced with actual button tracking data
        allButtons.push({
          messageId: message.messageId,
          clicks: message.clicks,
          timestamp: message.timestamp
        });
      });
    }
  });
  
  return allButtons
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
}

function getRecentActivity(clickStats) {
  const recentMessages = [];
  
  Object.entries(clickStats).forEach(([type, stat]) => {
    if (stat.messages) {
      stat.messages.forEach(message => {
        recentMessages.push({
          type,
          messageId: message.messageId,
          clicks: message.clicks,
          timestamp: message.timestamp
        });
      });
    }
  });
  
  return recentMessages
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
}

function generateRecommendations(metrics, systemStatus) {
  const recommendations = [];
  
  // Performance recommendations
  if (parseFloat(metrics.averageCTR) < 5) {
    recommendations.push({
      type: 'engagement',
      priority: 'high',
      message: 'Click-through rate is below 5%. Consider improving button text and offers.',
      action: 'Enhance promotional messages and call-to-action buttons'
    });
  }
  
  if (systemStatus.dailyStats.errors > 0) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      message: `System had ${systemStatus.dailyStats.errors} errors today. Check logs and API connections.`,
      action: 'Review error logs and verify API credentials'
    });
  }
  
  if (systemStatus.dailyStats.promosPosted < 2) {
    recommendations.push({
      type: 'revenue',
      priority: 'medium',
      message: 'Increase promotional frequency to boost revenue opportunities.',
      action: 'Schedule more promotional messages during peak hours'
    });
  }
  
  // Content recommendations
  if (metrics.topContent.length > 0) {
    const topType = metrics.topContent[0].type;
    recommendations.push({
      type: 'content',
      priority: 'low',
      message: `${topType} content performs best. Consider creating more similar content.`,
      action: `Focus on ${topType} content optimization`
    });
  }
  
  return recommendations;
}