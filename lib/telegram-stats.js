// Telegram Stats via MTProto (gramJS)
// Minimal wrapper to fetch message views for channel posts

// Use dynamic imports to avoid bundling issues during build
let ApiRef = null;
let TelegramClientRef = null;
let StringSessionRef = null;

class TelegramStats {
  constructor() {
    this.apiId = Number(process.env.TELEGRAM_API_ID || 0);
    this.apiHash = process.env.TELEGRAM_API_HASH || '';
    this.session = null; // will be initialized after dynamic import
    this.client = null;
  }

  async ensureClient() {
    if (this.client) return this.client;
    if (!this.apiId || !this.apiHash) throw new Error('Missing TELEGRAM_API_ID/TELEGRAM_API_HASH');
    if (!ApiRef || !TelegramClientRef || !StringSessionRef) {
      const mod = await import('telegram');
      const sessions = await import('telegram/sessions');
      ApiRef = mod.Api;
      TelegramClientRef = mod.TelegramClient;
      StringSessionRef = sessions.StringSession;
    }
    this.session = new StringSessionRef(process.env.TELEGRAM_SESSION || '');
    this.client = new TelegramClientRef(this.session, this.apiId, this.apiHash, {
      connectionRetries: 3,
    });
    if (!this.client.connected) {
      await this.client.connect();
    }
    return this.client;
  }

  // Resolve @channelUsername to InputPeer
  async resolvePeer(peer) {
    const client = await this.ensureClient();
    return await client.getEntity(peer);
  }

  // Get recent messages (ids + dates) from a channel
  async getRecentChannelMessages(channelUsername, limit = 100) {
    const client = await this.ensureClient();
    const peer = await this.resolvePeer(channelUsername);
    // Use low-level invoke for deterministic output
    const result = await client.invoke(
      new ApiRef.messages.GetHistory({
        peer,
        limit: Math.min(Math.max(1, Number(limit || 100)), 200),
        offsetId: 0,
        offsetDate: 0,
        addOffset: 0,
        maxId: 0,
        minId: 0,
        hash: 0n,
      })
    );
    const msgs = Array.isArray(result.messages) ? result.messages : [];
    return msgs
      .filter(m => m && typeof m.id === 'number')
      .map(m => ({ id: m.id, date: (m.date && new Date(m.date * 1000)) || null }));
  }

  // Get views for messageIds in a channel (does not increment)
  async getMessageViews(channelUsername, messageIds = []) {
    const client = await this.ensureClient();
    const peer = await this.resolvePeer(channelUsername);
    const result = await client.invoke(
      new ApiRef.messages.GetMessagesViews({
        peer,
        id: messageIds,
        increment: false,
      })
    );
    // result.views is array of MessageViews { views, forwards, replies? }
    const views = (result.views || []).map((v, idx) => ({
      msg_id: messageIds[idx],
      views: Number(v.views || 0),
      forwards: Number(v.forwards || 0),
    }));
    return views;
  }

  // Convenience: get recent messages with their views/forwards
  async getRecentViewsForChannel(channelUsername, limit = 100) {
    const recent = await this.getRecentChannelMessages(channelUsername, limit);
    const ids = recent.map(r => r.id);
    if (ids.length === 0) return [];
    const views = await this.getMessageViews(channelUsername, ids);
    const map = new Map(views.map(v => [v.msg_id, v]));
    return recent.map(r => ({
      message_id: r.id,
      date: r.date ? r.date.toISOString() : null,
      views: map.get(r.id)?.views || 0,
      forwards: map.get(r.id)?.forwards || 0,
    }));
  }
}

module.exports = TelegramStats;

