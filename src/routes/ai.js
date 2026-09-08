// routes/ai.js — AI-powered features backed by local Ollama
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../config/database.js';
import { ollamaChat } from '../services/ollamaService.js';

const router = Router();
router.use(authMiddleware);

// ── POST /api/ai/suggest-reply ────────────────────────────────────────────────
// Body: { phone }  →  { suggestions: string[] }
router.post('/suggest-reply', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const tenantId = req.user.tenantId;

    // Fetch last 12 messages for context
    const [rows] = await pool.execute(
      `SELECT direction, message FROM message_logs
       WHERE tenant_id = ? AND contact_phone = ?
       ORDER BY COALESCE(sent_at, received_at) DESC LIMIT 12`,
      [tenantId, phone]
    );

    const history = rows.reverse().map(r =>
      `${r.direction === 'inbound' ? 'Customer' : 'Agent'}: ${r.message}`
    ).join('\n');

    const systemPrompt = `You are a helpful WhatsApp business assistant.
Given a conversation, suggest 3 short, natural reply options for the agent to send.
Return ONLY a JSON array of 3 strings. No explanation, no markdown, no extra text.
Example: ["Sure, let me check that for you!", "Can you share more details?", "I'll get back to you shortly."]`;

    const userPrompt = history
      ? `Conversation so far:\n${history}\n\nSuggest 3 reply options for the agent.`
      : 'No messages yet. Suggest 3 friendly opening greetings for a WhatsApp business chat.';

    const { text, remaining } = await ollamaChat({
      tenantId,
      feature: 'suggest-reply',
      systemPrompt,
      userPrompt,
    });

    // Parse JSON array from model output
    const match = text.match(/\[[\s\S]*?\]/);
    let suggestions = [];
    if (match) {
      try { suggestions = JSON.parse(match[0]); } catch { /* fall through */ }
    }

    // Fallback: split by newline if JSON parse failed
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = text.split('\n').filter(l => l.trim()).slice(0, 3);
    }

    res.json({ suggestions: suggestions.slice(0, 3), remaining });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/suggest-reply]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/draft-campaign ───────────────────────────────────────────────
// Body: { goal, tone?, audience? }  →  { message: string }
router.post('/draft-campaign', async (req, res) => {
  try {
    const { goal, tone = 'friendly', audience = 'customers' } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal is required' });

    const tenantId = req.user.tenantId;

    // Fetch tenant name for context
    const [[tenant]] = await pool.execute(
      'SELECT name FROM tenants WHERE id = ?', [tenantId]
    );

    const systemPrompt = `You are a WhatsApp marketing copywriter for ${tenant?.name || 'a business'}.
Write short, engaging WhatsApp message copy (under 160 characters) that feels personal and direct.
Return ONLY the message text — no quotes, no labels, no explanation.
Tone: ${tone}. Target audience: ${audience}.`;

    const userPrompt = `Write a WhatsApp marketing message for this goal: ${goal}`;

    const { text, remaining } = await ollamaChat({
      tenantId,
      feature: 'draft-campaign',
      systemPrompt,
      userPrompt,
    });

    res.json({ message: text, remaining });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/draft-campaign]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/build-flow ───────────────────────────────────────────────────
// Body: { description }  →  { nodes: FlowNode[] }
router.post('/build-flow', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const tenantId = req.user.tenantId;

    const systemPrompt = `You are a WhatsApp chatbot designer. Convert a plain-English flow description into structured bot nodes.
Return ONLY a valid JSON array. No markdown, no explanation, no extra text.
Each node must have exactly these fields:
- trigger: short lowercase keyword (e.g. "hi", "book", "confirm") — unique across nodes
- message: the bot's reply text (keep under 200 chars)
- message_type: "text" | "buttons" (use buttons when giving options)
- buttons: array of {id, title} objects if message_type is "buttons" (max 3 buttons), else null
- next_trigger: the trigger of the next expected node, or null if end of flow

Example output:
[{"trigger":"hi","message":"Hello! How can I help you?","message_type":"buttons","buttons":[{"id":"btn_1","title":"Book Appointment"},{"id":"btn_2","title":"Get Info"}],"next_trigger":"book"},{"trigger":"book","message":"Please share your preferred date and time.","message_type":"text","buttons":null,"next_trigger":null}]`;

    const userPrompt = `Create a WhatsApp bot flow for this description:\n${description}`;

    const { text, remaining } = await ollamaChat({
      tenantId,
      feature: 'build-flow',
      systemPrompt,
      userPrompt,
      maxTokens: 800,
    });

    // Extract JSON array from output
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(422).json({ error: 'AI did not return valid nodes — try rephrasing your description' });

    let nodes;
    try {
      nodes = JSON.parse(match[0]);
    } catch {
      return res.status(422).json({ error: 'AI returned malformed JSON — try rephrasing' });
    }

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(422).json({ error: 'AI returned no nodes — try a more detailed description' });
    }

    // Sanitize each node
    nodes = nodes.map((n, i) => ({
      trigger:      String(n.trigger || `step_${i+1}`).toLowerCase().replace(/\s+/g, '_').slice(0, 30),
      message:      String(n.message || '').slice(0, 500),
      message_type: ['text','buttons','template'].includes(n.message_type) ? n.message_type : 'text',
      buttons:      Array.isArray(n.buttons) ? n.buttons.slice(0, 3).map((b, j) => ({
        id: `btn_${j+1}`, title: String(b.title || b.id || `Option ${j+1}`).slice(0, 20),
      })) : null,
      next_trigger: n.next_trigger ? String(n.next_trigger).toLowerCase().replace(/\s+/g, '_').slice(0, 30) : null,
    }));

    res.json({ nodes, remaining });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/build-flow]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/suggest-drip ─────────────────────────────────────────────────
// Body: { goal }  →  { steps: [{template_name, delay_hours, hint}] }
router.post('/suggest-drip', async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal is required' });

    const tenantId = req.user.tenantId;

    const systemPrompt = `You are a WhatsApp drip sequence planner.
Given a nurture or campaign goal, return a suggested sequence of 3-5 steps.
Return ONLY a JSON array. No markdown, no explanation, no extra text.
Each step must have exactly these fields:
- template_name: a short snake_case name for a WhatsApp template (e.g. "welcome_day1")
- delay_hours: integer hours to wait before sending this step (first step is 0)
- hint: one-sentence description of what this message should say

Example: [{"template_name":"welcome_intro","delay_hours":0,"hint":"Introduce the brand and offer a free trial"},{"template_name":"feature_highlight","delay_hours":48,"hint":"Show key product features"},{"template_name":"follow_up","delay_hours":96,"hint":"Ask if they have questions and offer support"}]`;

    const userPrompt = `Suggest a WhatsApp drip sequence for this goal:\n${goal}`;

    const { text, remaining } = await ollamaChat({
      tenantId,
      feature: 'suggest-drip',
      systemPrompt,
      userPrompt,
      maxTokens: 600,
    });

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(422).json({ error: 'AI did not return valid steps — try rephrasing your goal' });

    let steps;
    try { steps = JSON.parse(match[0]); } catch {
      return res.status(422).json({ error: 'AI returned malformed JSON — try rephrasing' });
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(422).json({ error: 'AI returned no steps — try a more detailed goal' });
    }

    steps = steps.slice(0, 6).map((s, i) => ({
      template_name: String(s.template_name || `step_${i + 1}`).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50),
      delay_hours:   Math.max(0, parseInt(s.delay_hours) || (i === 0 ? 0 : 24)),
      hint:          String(s.hint || '').slice(0, 200),
    }));

    res.json({ steps, remaining });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/suggest-drip]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/contact-summary ──────────────────────────────────────────────
// Body: { contactId }  →  { summary: string }
router.post('/contact-summary', async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) return res.status(400).json({ error: 'contactId is required' });

    const tenantId = req.user.tenantId;

    const [[contact]] = await pool.execute(
      'SELECT name, phone, email, tags, notes, opt_out, created_at FROM contacts WHERE id = ? AND tenant_id = ?',
      [contactId, tenantId]
    );
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const [messages] = await pool.execute(
      `SELECT direction, message, status, COALESCE(sent_at, received_at) AS ts
       FROM message_logs WHERE tenant_id = ? AND contact_phone = ?
       ORDER BY ts DESC LIMIT 20`,
      [tenantId, contact.phone]
    );

    const history = messages.reverse().map(m =>
      `[${m.direction === 'inbound' ? 'Customer' : 'Agent'}]: ${m.message}`
    ).join('\n');

    const contactInfo = [
      `Name: ${contact.name || 'Unknown'}`,
      `Phone: ${contact.phone}`,
      contact.email ? `Email: ${contact.email}` : null,
      contact.tags ? `Tags: ${contact.tags}` : null,
      contact.notes ? `Notes: ${contact.notes}` : null,
      `Opted out: ${contact.opt_out ? 'Yes' : 'No'}`,
      `Added: ${new Date(contact.created_at).toLocaleDateString()}`,
    ].filter(Boolean).join('\n');

    const systemPrompt = `You are a CRM assistant. Analyze a contact's profile and message history.
Write a concise summary (3-4 sentences) covering:
1. Engagement level (active/passive/silent)
2. Key topics discussed or concerns raised
3. Predicted intent or buying stage
4. Suggested next action for the sales/support team
Return only the summary text — no labels, no bullet points, no markdown.`;

    const userPrompt = `Contact profile:\n${contactInfo}\n\nRecent messages (${messages.length}):\n${history || 'No messages yet.'}`;

    const { text, remaining } = await ollamaChat({
      tenantId,
      feature: 'contact-summary',
      systemPrompt,
      userPrompt,
      maxTokens: 300,
    });

    res.json({ summary: text, remaining });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/contact-summary]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/campaign-insights ───────────────────────────────────────────
// Body: { campaignId }  →  { insights: string }
router.post('/campaign-insights', async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const tenantId = req.user.tenantId;

    const [[campaign]] = await pool.execute(
      'SELECT name, status, target_audience FROM campaigns WHERE id = ? AND tenant_id = ?',
      [campaignId, tenantId]
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const [[stats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'sent')      AS sent,
         SUM(status = 'delivered') AS delivered,
         SUM(status = 'read')      AS read_count,
         SUM(status = 'failed')    AS failed
       FROM campaign_logs WHERE campaign_id = ? AND tenant_id = ?`,
      [campaignId, tenantId]
    );

    const total     = stats.total     || 0;
    const sent      = stats.sent      || 0;
    const delivered = stats.delivered || 0;
    const readCount = stats.read_count || 0;
    const failed    = stats.failed    || 0;
    const delivRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const readRate  = delivered > 0 ? Math.round((readCount / delivered) * 100) : 0;

    const systemPrompt = `You are a WhatsApp marketing analyst.
Given campaign delivery metrics, write 2-3 sentences of actionable insights:
1. Assess how the campaign performed (delivery/read rates relative to industry benchmarks: good delivery >85%, good read rate >40%)
2. Identify any concern (e.g. high failure rate, low read rate)
3. Suggest one specific next step (e.g. re-target non-openers, A/B test timing, send follow-up to readers)
Return only the insight text — no headers, no bullets, no markdown.`;

    const userPrompt = `Campaign: "${campaign.name}" (${campaign.status})
Target audience: ${campaign.target_audience || 'all contacts'}
Metrics: ${total} targeted, ${sent} sent, ${delivered} delivered (${delivRate}% delivery rate), ${readCount} read (${readRate}% read rate), ${failed} failed.`;

    const { text, remaining } = await ollamaChat({
      tenantId,
      feature: 'campaign-insights',
      systemPrompt,
      userPrompt,
      maxTokens: 250,
    });

    res.json({ insights: text, remaining });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/campaign-insights]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

export default router;
