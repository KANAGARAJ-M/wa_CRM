require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/auth.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const leadsRoutes = require('./routes/leads.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

// Start server
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/companies', require('./routes/companies.routes'));

// Webhook routes (public, no /api prefix for WhatsApp)
app.use('/whatsapp', whatsappRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'WhatsApp CRM API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 WhatsApp CRM Server running on http://localhost:${PORT}`);
            console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

module.exports = app;
