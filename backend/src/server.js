import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenants.js';
import leadRoutes from './routes/leads.js';
import appointmentRoutes from './routes/appointments.js';
import campaignRoutes from './routes/campaigns.js';
import transactionRoutes from './routes/transactions.js';
import staffRoutes from './routes/staff.js';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
