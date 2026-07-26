const webpush = require('web-push');
const db = require('./db');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:example@example.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/** Send one push payload to a specific set of user ids. Silently no-ops
 *  when VAPID isn't configured (local dev without real keys). Stale
 *  subscriptions (410 Gone / 404) are removed as they're discovered. */
async function sendPushToUsers(userIds, payload) {
  if (!publicKey || !privateKey || !userIds.length) return;

  const placeholders = userIds.map(() => '?').join(',');
  const subs = await db.all(
    `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (${placeholders})`,
    ...userIds
  );

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await db.run('DELETE FROM push_subscriptions WHERE id = ?', sub.id);
        } else {
          console.error('[push] falha ao enviar:', e.message);
        }
      }
    })
  );
}

async function sendPushToAll(payload) {
  const users = await db.all('SELECT id FROM users');
  await sendPushToUsers(users.map((u) => u.id), payload);
}

module.exports = { sendPushToUsers, sendPushToAll };
