const { supabase } = require('./supabase');

async function upsertUserFromMsg(msg, consent = false) {
  if (!supabase) return;
  const user = msg.from || {};
  await supabase.from('users').upsert({
    user_id: user.id,
    username: user.username || null,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    last_seen_at: new Date().toISOString(),
    consent
  });
}

async function recordInteraction(msgOrCb, type, context = {}) {
  if (!supabase) return;
  const user = (msgOrCb.from) || (msgOrCb.message && msgOrCb.message.from) || {};
  if (!user.id) return;
  await supabase.from('interactions').insert({
    user_id: user.id,
    type,
    context,
  });
  await supabase.rpc('increment_user_metrics', { p_user_id: user.id }).catch(() => {});
}

module.exports = { upsertUserFromMsg, recordInteraction };

