'use strict';

const { App } = require('@slack/bolt');

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_TOKEN = process.env.SLACK_APP_TOKEN;
const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID || 'U0C2BU4QUH0';

if (!BOT_TOKEN || !APP_TOKEN) {
  console.error('Missing SLACK_BOT_TOKEN or SLACK_APP_TOKEN.');
  process.exit(1);
}

const app = new App({
  token: BOT_TOKEN,
  appToken: APP_TOKEN,
  socketMode: true,
});

app.event('message', async ({ event }) => {
  try {
    if (!event || event.subtype || event.bot_id) return;
    if (!event.channel || !event.channel.startsWith('D')) return;
    if (event.user !== ALLOWED_USER_ID) {
      console.log(`Ignored DM from unauthorized user ${event.user || 'unknown'}`);
      return;
    }

    const text = (event.text || '').trim();
    if (!text) return;

    // Phase 1: prove instant Socket Mode reception reliably.
    // Sheet interpretation/update will be added after this listener is verified online.
    console.log(JSON.stringify({
      type: 'allowed_dm',
      user: event.user,
      channel: event.channel,
      ts: event.ts,
      text,
    }));
  } catch (error) {
    console.error('Message handler error:', error);
  }
});

app.error(async (error) => {
  console.error('Slack Bolt error:', error);
});

async function start() {
  await app.start();
  console.log('Operasyon AI listener connected in Slack Socket Mode.');
}

start().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});

const shutdown = async (signal) => {
  console.log(`${signal} received; shutting down.`);
  try { await app.stop(); } finally { process.exit(0); }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
