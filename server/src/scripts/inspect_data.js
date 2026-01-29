const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Role, Company } = require('../models');

const inspectData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const emails = ['admin@whatsappcrm.com', 'dheena@gmail.com', 'kanagarajm638@gmail.com', 'admin1@gmail.com'];

        for (const email of emails) {
            const user = await User.findOne({ email });
            if (user) {
                console.log(`\nUser: ${user.name} (${user.email})`);
                console.log(`ID: ${user._id}`);
                console.log(`Companies: ${user.companies}`);
                console.log(`Custom Role: ${user.customRole}`);
            } else {
                console.log(`\nUser ${email} not found`);
            }
        }

        console.log('\n--- Roles ---');
        // Check the role we are interested in
        const roleId = '697b60c6c977f8098401b521';
        const role = await Role.findById(roleId);
        if (role) {
            console.log(`Role: ${role.name} (${role._id})`);
            console.log(`Role Company: ${role.company}`);
        } else {
            console.log(`Role ${roleId} not found`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

inspectData();
