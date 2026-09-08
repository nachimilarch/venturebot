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

export default router;
