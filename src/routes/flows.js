// src/routes/flows.js
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { invalidateFlowCache, invalidateFlowConfig } from '../services/flowEngine.js';


const router = express.Router();
router.use(authMiddleware);

// GET /api/flows — list all flows for tenant
router.get('/', async (req, res) => {
    const [flows] = await pool.execute(
        'SELECT * FROM flows WHERE tenant_id = ? ORDER BY created_at DESC',
        [req.user.tenantId]
    );
    res.json({ success: true, data: flows });
});

// GET /api/flows/:flowId/nodes — get all nodes for a flow
router.get('/:flowId/nodes', async (req, res) => {
    const [nodes] = await pool.execute(
        'SELECT * FROM flow_nodes WHERE flow_id = ? AND tenant_id = ? ORDER BY id ASC',
        [req.params.flowId, req.user.tenantId]
    );
    res.json({ success: true, data: nodes });
});

// POST /api/flows — create a new flow
router.post('/', async (req, res) => {
    const { name } = req.body;
    const [result] = await pool.execute(
        'INSERT INTO flows (tenant_id, name) VALUES (?, ?)',
        [req.user.tenantId, name]
    );
    res.json({ success: true, flowId: result.insertId });
});

// POST /api/flows/:flowId/nodes — add a node
router.post('/:flowId/nodes', async (req, res) => {
    const { trigger, message, message_type, buttons, next_trigger } = req.body;
    const [result] = await pool.execute(
        `INSERT INTO flow_nodes (flow_id, tenant_id, \`trigger\`, message, message_type, buttons, next_trigger)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.params.flowId, req.user.tenantId, trigger, message,
        message_type || 'text', buttons ? JSON.stringify(buttons) : null, next_trigger || null]
    );
    invalidateFlowCache(req.user.tenantId);
    res.json({ success: true, nodeId: result.insertId });
});

// PUT /api/flows/:flowId/nodes/:nodeId — update a node
router.put('/:flowId/nodes/:nodeId', async (req, res) => {
    const { trigger, message, message_type, buttons, next_trigger } = req.body;
    await pool.execute(
        `UPDATE flow_nodes SET \`trigger\`=?, message=?, message_type=?, buttons=?, next_trigger=?
     WHERE id=? AND tenant_id=?`,
        [trigger, message, message_type, buttons ? JSON.stringify(buttons) : null,
            next_trigger, req.params.nodeId, req.user.tenantId]
    );
    invalidateFlowCache(req.user.tenantId);
    res.json({ success: true });
});

// DELETE /api/flows/:flowId/nodes/:nodeId — delete a node
router.delete('/:flowId/nodes/:nodeId', async (req, res) => {
    await pool.execute(
        'DELETE FROM flow_nodes WHERE id = ? AND tenant_id = ?',
        [req.params.nodeId, req.user.tenantId]
    );
    invalidateFlowCache(req.user.tenantId);
    res.json({ success: true });
});

// PATCH /api/flows/:flowId/activate — toggle active
router.patch('/:flowId/activate', async (req, res) => {
    await pool.execute(
        'UPDATE flows SET is_active = NOT is_active WHERE id = ? AND tenant_id = ?',
        [req.params.flowId, req.user.tenantId]
    );
    invalidateFlowCache(req.user.tenantId);
    res.json({ success: true });
});

// PUT /api/flows/:flowId — rename a flow
router.put('/:flowId', async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    await pool.execute(
        'UPDATE flows SET name = ? WHERE id = ? AND tenant_id = ?',
        [name.trim(), req.params.flowId, req.user.tenantId]
    );
    res.json({ success: true });
});

// DELETE /api/flows/:flowId — delete a flow and all its nodes
router.delete('/:flowId', async (req, res) => {
    await pool.execute(
        'DELETE FROM flow_nodes WHERE flow_id = ? AND tenant_id = ?',
        [req.params.flowId, req.user.tenantId]
    );
    await pool.execute(
        'DELETE FROM flows WHERE id = ? AND tenant_id = ?',
        [req.params.flowId, req.user.tenantId]
    );
    invalidateFlowCache(req.user.tenantId);
    invalidateFlowConfig(req.user.tenantId);
    res.json({ success: true });
});

export default router;