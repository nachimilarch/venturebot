// src/services/whatsappTemplateService.js
import axios from 'axios';

// ─── NO module-level .env reads ──────────────────────────────────────────────
// All credentials come from the config object passed per call
// config shape: { access_token, phone_number_id, business_account_id, api_version }

function buildHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

function formatPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

function requireConfig(config) {
  if (!config || !config.access_token || !config.phone_number_id) {
    throw new Error(
      'WhatsApp not configured. Go to Settings → WhatsApp and connect your Meta account.'
    );
  }
  return {
    access_token:        config.access_token,
    phone_number_id:     config.phone_number_id,
    business_account_id: config.business_account_id,
    api_version:         config.api_version || 'v21.0',
  };
}

class WhatsAppTemplateService {

  // ─────────────────────────────────────────────────────────────────────────
  // Send approved template message
  // ─────────────────────────────────────────────────────────────────────────
  async sendTemplateMessage(to, templateName, languageCode = 'en', variableValues = [], config) {
    const { access_token, phone_number_id, api_version } = requireConfig(config);

    try {
      const formattedPhone = formatPhone(to);
      const url = `https://graph.facebook.com/${api_version}/${phone_number_id}/messages`;

      const components =
        variableValues.length > 0
          ? [{
              type: 'body',
              parameters: variableValues.map(val => ({
                type: 'text',
                text: String(val),
              })),
            }]
          : [];

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 && { components }),
        },
      };

      console.log(`📲 [tenant config] Sending template "${templateName}" to ${formattedPhone} via phone_id:${phone_number_id}`);

      const response = await axios.post(url, payload, {
        headers: buildHeaders(access_token),
      });

      console.log('✅ Template sent:', response.data.messages?.[0]?.id);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data,
      };
    } catch (error) {
      const fbError = error.response?.data?.error;
      console.error('❌ sendTemplateMessage error:', fbError || error.message);

      let errorMessage = fbError?.message || 'Failed to send message';
      if (errorMessage.includes('template')) errorMessage = 'Template not found or not approved.';
      if (errorMessage.includes('phone'))    errorMessage = 'Invalid phone number format.';

      return { success: false, error: errorMessage };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Send free-form text message (only within 24hr window)
  // ─────────────────────────────────────────────────────────────────────────
  async sendTextMessage(to, message, config) {
    const { access_token, phone_number_id, api_version } = requireConfig(config);

    try {
      const formattedPhone = formatPhone(to);
      const url = `https://graph.facebook.com/${api_version}/${phone_number_id}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: message },
      };

      console.log(`📲 [tenant config] Sending text to ${formattedPhone} via phone_id:${phone_number_id}`);

      const response = await axios.post(url, payload, {
        headers: buildHeaders(access_token),
      });

      console.log('✅ Text message sent:', response.data.messages?.[0]?.id);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data,
      };
    } catch (error) {
      const fbError = error.response?.data?.error;
      console.error('❌ sendTextMessage error:', fbError || error.message);

      let errorMessage = fbError?.message || 'Failed to send message';
      if (errorMessage.includes('phone'))     errorMessage = 'Invalid phone number format.';
      if (errorMessage.includes('recipient')) errorMessage = 'Recipient not on WhatsApp or has not messaged your business first.';

      return { success: false, error: errorMessage };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Send raw payload (interactive messages, buttons, lists)
  // ─────────────────────────────────────────────────────────────────────────
  async sendRawMessage(payload, config) {
    const { access_token, phone_number_id, api_version } = requireConfig(config);

    try {
      if (payload.to) {
        payload.to = formatPhone(payload.to);
      }

      const url = `https://graph.facebook.com/${api_version}/${phone_number_id}/messages`;

      console.log(`📲 [tenant config] Sending raw message type="${payload.type}" to ${payload.to} via phone_id:${phone_number_id}`);

      const response = await axios.post(url, payload, {
        headers: buildHeaders(access_token),
      });

      console.log('✅ Raw message sent:', response.data.messages?.[0]?.id);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ sendRawMessage error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch all templates for a WABA
  // ─────────────────────────────────────────────────────────────────────────
  async getAllTemplates(config) {
    const { access_token, business_account_id, api_version } = requireConfig(config);

    try {
      if (!business_account_id) {
        throw new Error('business_account_id missing from WhatsApp config');
      }

      const response = await axios.get(
        `https://graph.facebook.com/${api_version}/${business_account_id}/message_templates`,
        {
          params: { fields: 'id,name,status,category,language,components', limit: 100 },
          headers: buildHeaders(access_token),
        }
      );

      console.log(`📋 Found ${response.data.data?.length || 0} templates for WABA:${business_account_id}`);

      return { success: true, data: response.data.data || [] };
    } catch (error) {
      console.error('❌ getAllTemplates error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create a new template (submits for Meta approval)
  // ─────────────────────────────────────────────────────────────────────────
  async createTemplate(name, category, language, components, config) {
    const { access_token, business_account_id, api_version } = requireConfig(config);

    try {
      if (!business_account_id) {
        throw new Error('business_account_id missing from WhatsApp config');
      }

      const templateName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const url = `https://graph.facebook.com/${api_version}/${business_account_id}/message_templates`;

      const payload = { name: templateName, category, language, components };

      console.log(`📤 Creating template "${templateName}" for WABA:${business_account_id}`);

      const response = await axios.post(url, payload, {
        headers: buildHeaders(access_token),
      });

      console.log('✅ Template created:', response.data.id);

      return {
        success: true,
        templateId: response.data.id,
        status: response.data.status || 'PENDING',
        data: response.data,
      };
    } catch (error) {
      const fbError = error.response?.data?.error;
      console.error('❌ createTemplate error:', fbError || error.message);

      let errorMessage = fbError?.message || 'Failed to create template';
      if (errorMessage.includes('permission')) errorMessage = 'Missing WhatsApp permissions in your Meta app.';
      if (errorMessage.includes('duplicate'))  errorMessage = 'A template with this name already exists.';

      return { success: false, error: errorMessage, details: error.response?.data };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Upload a media file buffer to WhatsApp and return the media_id
  // mimeType: 'image/jpeg' | 'image/png' | 'application/pdf' etc.
  // ─────────────────────────────────────────────────────────────────────────
  async uploadMedia(fileBuffer, mimeType, originalName, config) {
    const { access_token, phone_number_id, api_version } = requireConfig(config);
    const FormData = (await import('form-data')).default;

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', fileBuffer, { filename: originalName || 'upload', contentType: mimeType });

    try {
      const response = await axios.post(
        `https://graph.facebook.com/${api_version}/${phone_number_id}/media`,
        form,
        { headers: { ...form.getHeaders(), Authorization: `Bearer ${access_token}` } }
      );
      return { success: true, media_id: response.data.id };
    } catch (err) {
      console.error('❌ uploadMedia error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch the download URL for a media_id from WhatsApp
  // ─────────────────────────────────────────────────────────────────────────
  async getMediaUrl(mediaId, config) {
    const { access_token, api_version } = requireConfig(config);
    try {
      const response = await axios.get(
        `https://graph.facebook.com/${api_version}/${mediaId}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      return { success: true, url: response.data.url, mime_type: response.data.mime_type, file_size: response.data.file_size };
    } catch (err) {
      console.error('❌ getMediaUrl error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Send an image or document message
  // type: 'image' | 'document'
  // source: { id: 'media_id' } OR { link: 'https://...' }
  // ─────────────────────────────────────────────────────────────────────────
  async sendMediaMessage(to, type, source, caption, filename, config) {
    const { access_token, phone_number_id, api_version } = requireConfig(config);

    try {
      const formattedPhone = formatPhone(to);
      const url = `https://graph.facebook.com/${api_version}/${phone_number_id}/messages`;

      const mediaObj = { ...source };
      if (caption) mediaObj.caption = caption;
      if (type === 'document' && filename) mediaObj.filename = filename;

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type,
        [type]: mediaObj,
      };

      const response = await axios.post(url, payload, { headers: buildHeaders(access_token) });
      console.log(`✅ Media (${type}) sent:`, response.data.messages?.[0]?.id);

      return { success: true, messageId: response.data.messages?.[0]?.id, data: response.data };
    } catch (err) {
      const fbError = err.response?.data?.error;
      console.error('❌ sendMediaMessage error:', fbError || err.message);
      return { success: false, error: fbError?.message || err.message };
    }
  }

  buildTemplateComponents(message, type = 'UTILITY') {
    let bodyText = message;
    if (type === 'MARKETING' && !message.toLowerCase().includes('stop')) {
      bodyText = `${message}\n\nReply STOP to unsubscribe.`;
    }
    return [{ type: 'BODY', text: bodyText }];
  }
}

export default new WhatsAppTemplateService();
