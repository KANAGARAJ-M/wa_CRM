# WhatsApp CRM - Standalone

A standalone WhatsApp CRM application with multi-account integration and lead management functionality.

## Features

- 🔐 **Authentication System** - Secure login with JWT tokens
- 💬 **WhatsApp Integration** - Send and receive messages via WhatsApp Cloud API
- 👥 **Multi-Account Support** - Manage multiple WhatsApp Business accounts
- 📊 **Lead Management** - Create, edit, and manage leads
- 🎨 **Modern UI** - Beautiful, responsive interface with WhatsApp-like design
- 🔄 **Real-time Updates** - Auto-refresh for new messages
- 📱 **Mobile Responsive** - Works on all devices

## Project Structure

```
whatsapp_crm_only/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── api/       # Axios configuration
│   │   ├── contexts/  # React contexts (Auth)
│   │   ├── pages/     # Page components
│   │   ├── App.jsx    # Main app with routing
│   │   └── main.jsx   # Entry point
│   └── package.json
│
└── server/            # Node.js + Express backend
    ├── src/
    │   ├── middleware/  # Auth middleware
    │   ├── models/      # MongoDB models
    │   ├── routes/      # API routes
    │   └── server.js    # Main server file
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- Meta Developer Account with WhatsApp Business API setup

### Backend Setup

1. Navigate to the server folder:
   ```bash
   cd whatsapp_crm_only/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/whatsapp_crm
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   ADMIN_EMAIL=admin@whatsappcrm.com
   ADMIN_PASSWORD=admin123
   ```

5. Seed the database (creates admin user):
   ```bash
   npm run seed
   ```

6. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd whatsapp_crm_only/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

### Default Login Credentials

- **Email:** admin@whatsappcrm.com
- **Password:** admin123

## WhatsApp Configuration

1. Go to [Meta Developer Portal](https://developers.facebook.com)
2. Create an app and add WhatsApp Product
3. Get your Phone Number ID and Access Token
4. In the app, go to Settings and add your WhatsApp account credentials
5. Configure webhook URL: `https://your-domain.com/whatsapp`
6. Use verify token: `meta_integration_1121` (or customize in settings)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### WhatsApp
- `GET /api/whatsapp/messages` - Get all messages
- `POST /api/whatsapp/send` - Send a message
- `POST /whatsapp` - Webhook endpoint
- `GET /whatsapp` - Webhook verification

### Leads
- `GET /api/leads` - Get all leads
- `GET /api/leads/kanban` - Get leads for Kanban
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/whatsapp-config` - Add WhatsApp config

## License

MIT
