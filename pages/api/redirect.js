import { recordClick } from '../../lib/click-store';

export default async function handler(req, res) {
  try {
    const { to, track_id } = req.query;
    if (!to) {
      return res.status(400).json({ success: false, message: 'Missing to parameter' });
    }
    // Basic allowlist to avoid open redirect abuse
    const url = new URL(to);
    const allowedHosts = ['gizebets.et', 'www.gizebets.et'];
    if (!allowedHosts.includes(url.hostname)) {
      return res.status(400).json({ success: false, message: 'Destination not allowed' });
    }

    // Log click
    await recordClick({
      to: url.toString(),
      track_id: track_id || 'unknown',
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress,
      ua: req.headers['user-agent'] || ''
    });

    // Redirect
    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (error) {
    console.error('❌ Redirect error:', error);
    res.status(500).json({ success: false, message: 'Redirect failed' });
  }
}

