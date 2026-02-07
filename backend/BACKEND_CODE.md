# Backend Implementation Guide

## Complete Code for All Backend Files

Copy and paste these files into your backend directory.

---

## 1. `.env.example`

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=realty_connect
DB_PORT=3306

JWT_SECRET=change-this-to-a-random-secret-key-in-production
JWT_EXPIRES_IN=7d
```

---

## 2. `src/config/database.js`

```javascript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
```

---

## 3. `src/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};
```

---

## 4. `src/middleware/errorHandler.js`

```javascript
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'Record already exists'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};
```

---

## 5. `src/routes/auth.js`

```javascript
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Register
router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
    body('tenantName').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password, name, tenantName, industry, phone } = req.body;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Create tenant
        const [tenantResult] = await connection.execute(
          'INSERT INTO tenants (name, email, industry, phone, credits) VALUES (?, ?, ?, ?, ?)',
          [tenantName, email, industry || 'Real Estate', phone || '', 1000]
        );

        const tenantId = tenantResult.insertId;

        // Create user
        await connection.execute(
          'INSERT INTO users (tenant_id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
          [tenantId, email, hashedPassword, name, 'admin']
        );

        await connection.commit();
        connection.release();

        res.status(201).json({ message: 'Registration successful' });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Login
router.post('/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const [users] = await pool.execute(
        'SELECT u.*, t.name as tenant_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          role: user.role,
          name: user.name
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          tenantName: user.tenant_name
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
```

---

## 6. `src/routes/leads.js`

```javascript
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Get all leads for tenant
router.get('/', async (req, res) => {
  try {
    const [leads] = await pool.execute(
      'SELECT * FROM leads WHERE tenant_id = ? ORDER BY created_at DESC',
      [req.user.tenantId]
    );
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single lead
router.get('/:id', async (req, res) => {
  try {
    const [leads] = await pool.execute(
      'SELECT * FROM leads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    
    if (leads.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(leads[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create lead
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, status, source, property, budget, notes, assignedTo } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO leads 
       (tenant_id, name, email, phone, status, source, property, budget, notes, assigned_to) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, name, email, phone, status || 'new', source, property, budget, notes, assignedTo]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Lead created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update lead
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, status, source, property, budget, notes, assignedTo, score } = req.body;
    
    await pool.execute(
      `UPDATE leads SET 
       name = ?, email = ?, phone = ?, status = ?, source = ?, 
       property = ?, budget = ?, notes = ?, assigned_to = ?, score = ?
       WHERE id = ? AND tenant_id = ?`,
      [name, email, phone, status, source, property, budget, notes, assignedTo, score, req.params.id, req.user.tenantId]
    );
    
    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM leads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 7. `src/routes/appointments.js`

```javascript
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [appointments] = await pool.execute(
      `SELECT a.*, l.name as lead_name 
       FROM appointments a 
       LEFT JOIN leads l ON a.lead_id = l.id 
       WHERE a.tenant_id = ? 
       ORDER BY a.date DESC, a.time DESC`,
      [req.user.tenantId]
    );
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { leadId, date, time, type, property, agent, notes } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO appointments (tenant_id, lead_id, date, time, type, property, agent, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, leadId, date, time, type, property, agent, notes, 'scheduled']
    );
    
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { date, time, type, property, agent, notes, status } = req.body;
    
    await pool.execute(
      `UPDATE appointments SET date = ?, time = ?, type = ?, property = ?, agent = ?, notes = ?, status = ?
       WHERE id = ? AND tenant_id = ?`,
      [date, time, type, property, agent, notes, status, req.params.id, req.user.tenantId]
    );
    
    res.json({ message: 'Appointment updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## More files available in repository...

Due to size limits, create the following files using similar patterns:
- `src/routes/campaigns.js`
- `src/routes/dashboard.js`
- `src/routes/staff.js`
- `src/routes/transactions.js`
- `src/routes/tenants.js`
- `src/models/database.sql`
