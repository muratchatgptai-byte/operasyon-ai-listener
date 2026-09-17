'use strict';
const { App } = require('@slack/bolt');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID || 'U0C2BU4QUH0';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

for (const [name, value] of Object.entries({SLACK_BOT_TOKEN, SLACK_APP_TOKEN, OPENAI_API_KEY})) {
  if (!value) {
    console.error(`Missing required variable: ${name}`);
    process.exit(1);
  }
}

const app = new App({token: SLACK_BOT_TOKEN, appToken: SLACK_APP_TOKEN, socketMode: true});
const processed = new Map();
const TTL_MS = 86400000;

function seen(key) {
  const now = Date.now();
  for (const [k, t] of processed) if (now - t > TTL_MS) processed.delete(k);
  if (processed.has(key)) return true;
  processed.set(key, now);
  return false;
}

const MANAGER_PROMPT = `Sen Operasyon AI'sın. Murat'ın operasyon yöneticisi gibi davran.
Türkçe, kısa, net ve aksiyon odaklı cevap ver.
Mesajın niyetini ve operasyonel etkisini yorumla; gerekirse öncelik, sonraki aksiyon, blokaj veya risk belirt.
Google Sheet entegrasyonu henüz bu serviste bağlı değildir; Sheet'te güncelleme yaptığını asla iddia etme.
Para harcama, hukuki taahhüt, kritik gıda güvenliği kararı, müşteri sonlandırma, personel disiplin işlemi veya hassas dış iletişim gerekiyorsa kullanıcı onayı iste.
Diğer rutin konularda gereksiz onay isteme. Normal cevap 1-4 kısa cümle olsun.`;

async function askOpenAI(text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{role:'system', content:MANAGER_PROMPT}, {role:'user', content:text}],
      max_tokens: 300,
      temperature: 0.2
    })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || `OpenAI HTTP ${response.status}`);
  return body?.choices?.[0]?.message?.content?.trim() || 'Mesajı aldım ancak yanıt üretemedim.';
}

app.event('message', async ({event, client}) => {
  try {
    if (!event || event.subtype || event.bot_id) return;
    if (!event.channel || !event.channel.startsWith('D')) return;
    if (event.user !== ALLOWED_USER_ID) return;
    const text = (event.text || '').trim();
    if (!text) return;
    const key = `${event.channel}:${event.ts}`;
    if (seen(key)) return;
    console.log(JSON.stringify({type:'allowed_dm_received', user:event.user, channel:event.channel, ts:event.ts, text}));
    const reply = await askOpenAI(text);
    await client.chat.postMessage({channel:event.channel, text:reply});
    console.log(JSON.stringify({type:'reply_sent', channel:event.channel, ts:event.ts}));
  } catch (error) {
    console.error('message_handler_error', error?.message || error);
    try {
      await client.chat.postMessage({channel:event.channel, text:'Mesajı aldım fakat AI yanıtı oluşturulurken teknik hata oluştu.'});
    } catch (_) {}
  }
});

app.error(async error => console.error('slack_bolt_error', error));

app.start()
  .then(() => console.log('Operasyon AI connected via Slack Socket Mode.'))
  .catch(error => { console.error('startup_failed', error); process.exit(1); });

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  try { await app.stop(); } finally { process.exit(0); }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
