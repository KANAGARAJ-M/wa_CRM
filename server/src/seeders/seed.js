require('dotenv').config();
const mongoose = require('mongoose');
const { User, Settings } = require('../models');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create default admin user
        const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@whatsappcrm.com' });

        if (!existingAdmin) {
            const admin = await User.create({
                email: process.env.ADMIN_EMAIL || 'admin@whatsappcrm.com',
                password: process.env.ADMIN_PASSWORD || 'admin123',
                name: process.env.ADMIN_NAME || 'Admin',
                role: 'superadmin',
                isActive: true
            });
            console.log('✅ Admin user created:', admin.email);
        } else {
            console.log('ℹ️ Admin user already exists:', existingAdmin.email);
        }

        // Create default settings if not exists
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({
                whatsappConfigs: []
            });
            console.log('✅ Default settings created');
        } else {
            console.log('ℹ️ Settings already exist');
        }

        console.log('\n🎉 Seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

seed();
