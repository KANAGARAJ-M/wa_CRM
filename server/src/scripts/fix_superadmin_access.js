const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Company } = require('../models');

const fixSuperAdminAccess = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@whatsappcrm.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log('Superadmin user not found');
            return;
        }

        console.log(`Found superadmin: ${user._id}`);

        const companies = await Company.find({});
        console.log(`Found ${companies.length} companies`);

        // 1. Add all companies to user's companies list
        const companyIds = companies.map(c => c._id);

        await User.findByIdAndUpdate(user._id, {
            $addToSet: { companies: { $each: companyIds } }
        });
        console.log('Updated user companies list');

        // 2. Add user to all companies' users list
        for (const company of companies) {
            await Company.findByIdAndUpdate(company._id, {
                $addToSet: { users: user._id }
            });
            console.log(`Added user to company: ${company.name}`);
        }

        console.log('Done! Superadmin should now have access to all companies.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixSuperAdminAccess();
