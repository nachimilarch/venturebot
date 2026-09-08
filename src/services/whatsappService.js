import axios from 'axios';
import { baseUrl, phoneNumberId, accessToken } from '../config/whatsapp.js';
import { log } from '../utils/logger.js';

/**
 * Send a WhatsApp template message with dynamic variables.
 * templateComponents example:
 * [
 *   {
 *     type: 'body',
 *     parameters: [
 *       { type: 'text', text: 'John' },
 *       { type: 'text', text: 'Product ABC' }
 *     ]
 *   }
 * ]
 */
async function sendTemplateMessage({ to, template_name, template_language, templateComponents }) {
  const url = `${baseUrl}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: template_name,
      language: { code: template_language || 'en_US' },
      components: templateComponents || []
    }
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    log('WhatsApp API success', res.data);
    const messageId = res.data.messages && res.data.messages[0] && res.data.messages[0].id;
    return { success: true, messageId, raw: res.data };
  } catch (err) {
    log('WhatsApp API error', err.response?.data || err.message);
    const status = err.response?.status;
    const data = err.response?.data;

    const error_code = data?.error?.code;
    const error_message = data?.error?.message || err.message;
    return {
      success: false,
      status,
      error_code,
      error_message,
      raw: data
    };
  }
}

export { sendTemplateMessage };
