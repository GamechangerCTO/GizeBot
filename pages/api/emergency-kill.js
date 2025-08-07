// EMERGENCY KILL SWITCH - Immediate bot shutdown
export default async function handler(req, res) {
  console.log('🚨 EMERGENCY KILL ACTIVATED! Stopping bot immediately...');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  try {
    // IMMEDIATELY delete webhook to stop all incoming messages
    console.log('🔄 EMERGENCY: Deleting webhook NOW...');
    const deleteResponse = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST'
    });
    const deleteData = await deleteResponse.json();
    
    console.log('🆘 EMERGENCY KILL COMPLETED');
    
    res.status(200).json({
      success: true,
      message: 'EMERGENCY KILL EXECUTED - Bot is now OFFLINE',
      webhookDeleted: deleteData.ok,
      timestamp: new Date().toISOString(),
      status: 'BOT_OFFLINE'
    });

  } catch (error) {
    console.error('❌ Emergency kill error:', error);
    res.status(500).json({ 
      error: 'Emergency kill failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}