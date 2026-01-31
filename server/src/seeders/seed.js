require('dotenv').config();
const mongoose = require('mongoose');
const { User, Settings } = require('../models');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Define superadmins to seed
        const superAdmins = [
            { email: 'admin11@whatsappcrm.com', name: 'Admin', password: 'admin123' },
            { email: 'gms@gmail.com', name: 'Gms' },
            { email: 'aravind@gmail.com', name: 'Aravind' },
            { email: 'sanjay@gmail.com', name: 'Sanjay' },
            { email: 'divya@gmail.com', name: 'Divya' },
            { email: 'vijay@gmail.com', name: 'Vijay' },
            { email: 'sujith@gmail.com', name: 'Sujith' }
        ];

        for (const adminData of superAdmins) {
            let user = await User.findOne({ email: adminData.email });

            // Generate password from email name part if not explicitly provided
            const namePart = adminData.email.split('@')[0];
            const password = adminData.password || `${namePart}123`;

            if (!user) {
                user = new User({
                    email: adminData.email,
                    name: adminData.name,
                    role: 'superadmin',
                    isActive: true,
                    companies: [] // Ensure global superadmin
                });
                user.password = password; // Will be hashed by pre-save
                await user.save();
                console.log('✅ Superadmin created:', user.email);
            } else {
                // Update existing user to match superadmin requirements
                user.role = 'superadmin';
                user.companies = []; // Clear companies to make them global/same as main admin
                user.password = password; // Reset password to ensure consistency
                user.isActive = true;
                if (!user.name) user.name = adminData.name;

                await user.save();
                console.log('🔄 Superadmin updated:', user.email);
            }
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
