// src/routes/authRoutes.js
import express from 'express';
import { register, login, me, logout } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login',    login);
router.post('/logout',   logout);
router.get('/me',        authMiddleware, me);

export default router;