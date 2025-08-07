// Telegram Webhook Handler - Simple version

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    console.log('📨 Telegram webhook received:', update);

    // Basic webhook acknowledgment
    // The actual bot commands are handled by the simple-bot-commands system
    // This webhook is just for receiving updates in serverless mode

    res.status(200).json({ 
      success: true, 
      message: 'Webhook received',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}