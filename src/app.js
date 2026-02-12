const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

const apiLimiter = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const contactsRoutes = require('./routes/contactsRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const authRoutes = require('./routes/authRoutes');
const { log } = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter);

// Auth
app.use('/api/auth', authRoutes);

// Existing routes
app.use('/api/contacts', contactsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/webhook', webhookRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  log(`Server listening on port ${port}`);
});
