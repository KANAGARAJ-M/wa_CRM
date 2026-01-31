const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const users = [
    { email: 'gms@gmail.com', name: 'gms' },
    { email: 'aravind@gmail.com', name: 'aravind' },
    { email: 'sanjay@gmail.com', name: 'sanjay' },
    { email: 'divya@gmail.com', name: 'divya' },
    { email: 'vijay@gmail.com', name: 'vijay' },
    { email: 'sujith@gmail.com', name: 'sujith' }
];

const Company = require('../models/Company');

const createSuperAdmins = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find existing companies
        const companies = await Company.find({});
        if (companies.length === 0) {
            console.log('No companies found. Users will be created without companies.');
        } else {
            console.log(`Found ${companies.length} companies. Assigning users to them.`);
        }
        const companyIds = companies.map(c => c._id);

        for (const userData of users) {
            const password = `${userData.name}123`;

            // Check if user exists
            let user = await User.findOne({ email: userData.email });

            if (user) {
                console.log(`Updating user: ${userData.email}`);
                user.name = userData.name;
                user.password = password; // Will be hashed by pre-save hook
                user.role = 'superadmin';
                user.isActive = true;
                // Add companies if not present
                user.companies = companyIds;
                await user.save();
                console.log(`Updated ${userData.email} successfully`);
            } else {
                console.log(`Creating user: ${userData.email}`);
                user = new User({
                    email: userData.email,
                    name: userData.name,
                    password: password,
                    role: 'superadmin',
                    isActive: true,
                    companies: companyIds
                });
                await user.save();
                console.log(`Created ${userData.email} successfully`);
            }
        }

        console.log('All super admins processed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating super admins:', error);
        process.exit(1);
    }
};

createSuperAdmins();
