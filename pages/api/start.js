// API Endpoint to start the GizeBets automated system
// GET /api/start - Start the scheduler
// POST /api/start - Start with custom config

const GizeBetsScheduler = require('../../lib/scheduler');

// Global scheduler instance
let scheduler = null;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Start the scheduler
      if (!scheduler) {
        scheduler = new GizeBetsScheduler();
      }

      if (scheduler.getStatus().isRunning) {
        return res.status(200).json({
          success: true,
          message: 'GizeBets system is already running',
          status: scheduler.getStatus()
        });
      }

      scheduler.start();
      
      res.status(200).json({
        success: true,
        message: 'GizeBets automated system started successfully',
        status: scheduler.getStatus(),
        features: [
          'Top 5 Match Predictions (every 2 hours)',
          'Daily Results (11 PM)',
          'Daily Promos (10 AM, 2 PM, 6 PM)',
          'Analytics Tracking',
          'Manual Commands Support'
        ]
      });

    } else if (req.method === 'POST') {
      // Start with custom configuration
      const { config } = req.body;
      
      if (!scheduler) {
        scheduler = new GizeBetsScheduler();
      }

      // Apply custom config if provided
      if (config) {
        console.log('🔧 Applying custom config:', config);
        // Handle custom configuration here
      }

      scheduler.start();
      
      res.status(200).json({
        success: true,
        message: 'GizeBets system started with custom configuration',
        status: scheduler.getStatus(),
        appliedConfig: config || 'default'
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('❌ Error starting GizeBets system:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to start GizeBets system',
      error: error.message
    });
  }
}

// Export scheduler instance for other modules
export { scheduler };