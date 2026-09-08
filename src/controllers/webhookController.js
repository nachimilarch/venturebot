import MessageLog from '../models/MessageLog.js';
import { log } from '../utils/logger.js';

async function verifyWebhook(req, res) {
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

/**
 * Webhook POST
 * Handles message status updates and incoming messages.
 */
async function handleWebhook(req, res) {
  try {
    const body = req.body;
    log('Webhook payload', JSON.stringify(body));

    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach(entry => {
        entry.changes?.forEach(change => {
          const value = change.value;
          const statuses = value.statuses || [];
          statuses.forEach(async statusObj => {
            const whatsapp_message_id = statusObj.id;
            const status = statusObj.status; // sent, delivered, read, failed, etc.

            let mappedStatus = null;
            if (status === 'sent') mappedStatus = 'sent';
            else if (status === 'delivered') mappedStatus = 'delivered';
            else if (status === 'read') mappedStatus = 'read';
            else if (status === 'failed') mappedStatus = 'failed';

            if (mappedStatus && whatsapp_message_id) {
              await MessageLog.updateStatusByWhatsAppId(
                whatsapp_message_id,
                mappedStatus,
                statusObj
              );
            }
          });
        });
      });
    }

    res.sendStatus(200);
  } catch (err) {
    log('Webhook error', err.message);
    res.sendStatus(500);
  }
}

export { verifyWebhook, handleWebhook };
