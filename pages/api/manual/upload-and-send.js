// Upload-and-send (no persistence): accepts multipart with image + content/buttons, sends via Telegram as a one-off

export const config = { api: { bodyParser: false } };

import formidable from 'formidable';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  try {
    const form = formidable({ multiples: false, keepExtensions: false });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
    });

    const content = fields.content || '';
    let buttons = [];
    try { buttons = JSON.parse(fields.buttons || '[]'); } catch (_) {}
    const dryRun = String(fields.dryRun || 'true') === 'true';

    // Send via TelegramManager directly to channel (photo if provided)
    const TelegramManager = require('../../../lib/telegram');
    const telegram = new TelegramManager();

    if (dryRun) {
      return res.status(200).json({ success: true, message: 'Dry-run OK', preview: { content, buttonsCount: buttons.length, image: Boolean(files.file) } });
    }

    // Build keyboard
    const inline_keyboard = [ ...buttons.filter(b=>b.text && b.url).map(b=>([{ text: b.text, url: b.url }])) ];
    const opts = { parse_mode: 'HTML', reply_markup: { inline_keyboard } };

    if (files?.file?.filepath) {
      const fs = require('fs');
      const stream = fs.createReadStream(files.file.filepath);
      try {
        const msg = await telegram.bot.sendPhoto(telegram.channelId, stream, { caption: content, ...opts });
        // cleanup tmp
        try { fs.unlink(files.file.filepath, ()=>{}); } catch (_) {}
        return res.status(200).json({ success: true, message: 'Sent with image', message_id: msg.message_id });
      } catch (e) {
        return res.status(500).json({ success: false, message: 'Failed to send with image', error: e.message });
      }
    } else {
      const msg = await telegram.bot.sendMessage(telegram.channelId, content, opts);
      return res.status(200).json({ success: true, message: 'Sent text', message_id: msg.message_id });
    }
  } catch (error) {
    console.error('upload-and-send error', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

