// src/routes/flowConfig.js
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { invalidateFlowConfig } from '../services/flowEngine.js';

const router = express.Router();
router.use(authMiddleware);

const JSON_FIELDS = ['appointment_types', 'slot_times'];

const ALLOWED_FIELDS = [
    'welcome_message', 'ask_interest_msg', 'ask_budget_msg',
    'onboarding_done_msg', 'menu_header_msg', 'talk_team_msg',
    'appointment_types', 'slot_times', 'slot_days_ahead',
    'industry_prompt', 'contact_info',
];

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM tenant_flow_config WHERE tenant_id = ? LIMIT 1',
            [req.user.tenantId]
        );
        res.json({ success: true, data: rows[0] || {} });
    } catch (err) {
        console.error('[FlowConfig GET]', err.message);
        res.status(500).json({ success: false, message: 'Failed to load config' });
    }
});

router.post('/', async (req, res) => {
    try {
        // Collect only allowed fields from request body
        const fields = [];
        const values = [];

        for (const field of ALLOWED_FIELDS) {
            if (req.body[field] === undefined) continue;
            fields.push(field);
            // Serialize JSON fields to string
            values.push(JSON_FIELDS.includes(field)
                ? JSON.stringify(req.body[field])
                : req.body[field]
            );
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No valid fields provided' });
        }

        // Build: INSERT ... ON DUPLICATE KEY UPDATE ...
        // All values go through parameterized placeholders — no raw interpolation
        const insertCols = ['tenant_id', ...fields].join(', ');
        const insertPlaceholders = ['?', ...fields.map(() => '?')].join(', ');
        const updateClause = fields.map(f => `${f} = ?`).join(', ') + ', updated_at = NOW()';

        const sql = `
      INSERT INTO tenant_flow_config (${insertCols})
      VALUES (${insertPlaceholders})
      ON DUPLICATE KEY UPDATE ${updateClause}
    `;

        // Params: [tenantId, ...insertValues, ...updateValues]
        const params = [req.user.tenantId, ...values, ...values];

        await pool.execute(sql, params);

        invalidateFlowConfig(req.user.tenantId);
        res.json({ success: true });
    } catch (err) {
        console.error('[FlowConfig POST]', err.message);
        res.status(500).json({ success: false, message: 'Failed to save config' });
    }
});

export default router;