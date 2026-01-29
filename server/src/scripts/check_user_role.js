const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User } = require('../models');

const checkUserRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'admin1@gmail.com' });
        if (user) {
            console.log('User found:', {
                email: user.email,
                role: user.role, // System role
                customRole: user.customRole,
                companies: user.companies
            });
        } else {
            console.log('User admin1@gmail.com not found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkUserRole();
