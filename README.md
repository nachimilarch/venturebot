# Realty Connect Panel - Backend API

Node.js + Express backend for the Realty Connect Panel - a multi-tenant real estate CRM system.

## Features

- 🏢 **Multi-tenant Architecture** - Complete tenant isolation
- 🔐 **JWT Authentication** - Secure token-based auth
- 👥 **Role-Based Access Control** - Admin, Manager, Agent roles  
- 📊 **Lead Management** - Track and manage real estate leads
- 📅 **Appointment Scheduling** - Schedule site visits and meetings
- 📢 **Campaign Management** - Bulk messaging campaigns
- 💳 **Billing System** - Credit-based messaging system
- 📈 **Dashboard Analytics** - Real-time stats and charts

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors

## Project Structure

```
backend/
├── src/
│   ├── server.js           # Main application entry point
│   ├── config/
│   │   └── database.js     # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication
│   │   ├── tenantContext.js # Tenant isolation
│   │   └── errorHandler.js  # Global error handling
│   ├── routes/
│   │   ├── auth.js         # Login, register
│   │   ├── tenants.js      # Tenant CRUD
│   │   ├── leads.js        # Lead management
│   │   ├── appointments.js # Appointment scheduling
│   │   ├── campaigns.js    # Campaign management
│   │   ├── transactions.js # Billing/credits
│   │   ├── staff.js        # Staff management
│   │   └── dashboard.js    # Analytics
│   ├── controllers/
│   │   └── [corresponding controllers]
│   ├── models/
│   │   └── database.sql    # Database schema
│   └── utils/
│       ├── validators.js   # Input validation
│       └── helpers.js      # Utility functions
├── .env.example            # Environment variables template
├── package.json
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment

Create `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=realty_connect
DB_PORT=3306

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Messaging (for future WhatsApp integration)
WHATSAPP_API_KEY=your_api_key
```

### 3. Setup Database

```bash
mysql -u root -p < src/models/database.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on http://localhost:3000

## API Endpoints

### Authentication
```
POST   /api/auth/register     - Register new tenant
POST   /api/auth/login        - Login user
POST   /api/auth/refresh      - Refresh JWT token
```

### Leads
```
GET    /api/leads            - Get all leads (filtered by tenant)
GET    /api/leads/:id        - Get lead by ID
POST   /api/leads            - Create new lead
PUT    /api/leads/:id        - Update lead
DELETE /api/leads/:id        - Delete lead
```

### Appointments
```
GET    /api/appointments      - Get all appointments
GET    /api/appointments/:id  - Get appointment by ID
POST   /api/appointments      - Create appointment
PUT    /api/appointments/:id  - Update appointment
DELETE /api/appointments/:id  - Delete appointment
```

### Campaigns
```
GET    /api/campaigns         - Get all campaigns
GET    /api/campaigns/:id     - Get campaign by ID
POST   /api/campaigns         - Create campaign
PUT    /api/campaigns/:id     - Update campaign
POST   /api/campaigns/:id/send - Send campaign messages
```

### Dashboard
```
GET    /api/dashboard/stats   - Get dashboard statistics
GET    /api/dashboard/charts  - Get chart data
```

## Database Schema

See `src/models/database.sql` for complete schema.

Key tables:
- `tenants` - Company/organization data
- `users` - User accounts with roles
- `leads` - Real estate leads
- `appointments` - Scheduled appointments
- `campaigns` - Marketing campaigns
- `transactions` - Credit purchases and usage
- `staff` - Team members

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Helmet.js for security headers
- CORS configuration
- SQL injection prevention (parameterized queries)
- Input validation
- Rate limiting (recommended for production)

## Development

```bash
# Run with nodemon (auto-restart)
npm run dev

# Run production
npm start
```

## Deployment

### AWS EC2
1. Install Node.js 18+
2. Install MySQL/RDS
3. Clone repository
4. Set environment variables
5. Run with PM2: `pm2 start src/server.js --name realty-api`

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure proper `DB_HOST` and credentials
- Set appropriate `FRONTEND_URL`

## Next Steps

Create these files in your backend:

1. `.env` - Environment configuration
2. `src/config/database.js` - MySQL connection
3. `src/middleware/auth.js` - JWT middleware
4. `src/routes/*.js` - All route files
5. `src/controllers/*.js` - Business logic
6. `src/models/database.sql` - Database schema

Refer to the code examples in the repository for implementation details.

## Support

For issues or questions, please create an issue in the repository.
