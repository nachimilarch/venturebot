import db from '../config/database.js';
import Campaign from '../models/Campaign.js';
import MessageLog from '../models/MessageLog.js';
import { enqueue } from '../services/messageQueue.js';

/**
 * POST /api/campaigns
 * body: {
 *   name: "Campaign name",
 *   template_name: "template_example",
 *   template_language: "en_US",
 *   variable_mapping: {
 *     body: ["name", "product", "city"]  // map in order of placeholders
 *   }
 * }
 */
async function createCampaign(req, res, next) {
  const conn = await db.getConnection();
  try {
    const { name, template_name, template_language, variable_mapping } = req.body;

    if (!name || !template_name) {
      const err = new Error('name and template_name are required');
      err.status = 400;
      throw err;
    }

    const campaign = await Campaign.create({
      name,
      template_name,
      template_language: template_language || 'en_US'
    });

    await Campaign.setStatus(campaign.id, 'running');

    // Fetch all contacts
    const [contacts] = await conn.query('SELECT * FROM contacts');

    // For each contact, create MessageLog and enqueue
    for (const contact of contacts) {
      const logRow = await MessageLog.createQueued({
        campaign_id: campaign.id,
        contact_id: contact.id,
        phone: contact.phone,
        template_name
      });

      const custom = contact.custom_variables ? JSON.parse(contact.custom_variables) : {};

      const bodyVars = (variable_mapping && variable_mapping.body) || [];
      const bodyParameters = bodyVars.map(key => {
        let value = null;
        if (key === 'name') value = contact.name;
        else value = custom[key];
        return { type: 'text', text: value != null ? String(value) : '' };
      });

      const templateComponents = [];
      if (bodyParameters.length) {
        templateComponents.push({
          type: 'body',
          parameters: bodyParameters
        });
      }

      enqueue({
        messageLogId: logRow.id,
        to: contact.phone,
        template_name,
        template_language: template_language || 'en_US',
        templateComponents
      });
    }

    res.json({
      success: true,
      campaign,
      contacts_count: contacts.length,
      message: 'Campaign created and messages queued'
    });
  } catch (err) {
    next(err);
  } finally {
    conn.release();
  }
}

export { createCampaign };
