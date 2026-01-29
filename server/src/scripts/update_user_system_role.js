const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User } = require('../models');

const updateUserSystemRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin1@gmail.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`User ${email} not found.`);
            return;
        }

        console.log(`Found user: ${user.name}`);
        console.log(`Current system role: ${user.role}`);
        console.log(`Current custom role: ${user.customRole}`);

        // Update system role to 'admin'
        user.role = 'admin';
        await user.save();

        console.log(`Updated system role to: ${user.role}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

updateUserSystemRole();
