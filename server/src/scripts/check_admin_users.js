const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Role } = require('../models');

const checkAdminUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Check system 'admin' role
        const systemAdmins = await User.countDocuments({ role: 'admin' });
        console.log(`Users with system role 'admin': ${systemAdmins}`);

        // 2. Check custom role named 'admin' (if exists)
        const customAdminRole = await Role.findOne({ name: 'admin' });
        if (customAdminRole) {
            const customAdminUsers = await User.countDocuments({ customRole: customAdminRole._id });
            console.log(`Users with custom role 'admin' (ID: ${customAdminRole._id}): ${customAdminUsers}`);

            // List them for debugging
            const users = await User.find({ customRole: customAdminRole._id }).select('name email companies');
            console.log('Users with this custom role:', JSON.stringify(users, null, 2));
        } else {
            console.log("No custom role named 'admin' found.");
        }

        // 3. List all custom roles and their counts
        console.log('\n--- All Custom Roles ---');
        const roles = await Role.find({});
        for (const role of roles) {
            const count = await User.countDocuments({ customRole: role._id });
            console.log(`Role: ${role.name} (ID: ${role._id}) - Users: ${count}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkAdminUsers();
