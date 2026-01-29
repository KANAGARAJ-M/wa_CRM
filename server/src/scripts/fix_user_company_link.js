const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Company } = require('../models');

const fixUserCompanyLink = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all users
        const users = await User.find({});

        for (const user of users) {
            if (user.companies && user.companies.length > 0) {
                for (const companyId of user.companies) {
                    // Add user to company's users array if not already there
                    await Company.findByIdAndUpdate(companyId, {
                        $addToSet: { users: user._id }
                    });
                    console.log(`Added user ${user.email} to company ${companyId}`);
                }
            }
        }

        console.log('Fix complete!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixUserCompanyLink();
