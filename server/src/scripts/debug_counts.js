const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Role, Company } = require('../models');

const debugUserCounts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get the company
        // We saw company ID 69651d84ce98b547e7dc38e7 in the previous script output
        const companyId = '69651d84ce98b547e7dc38e7';
        const company = await Company.findById(companyId);
        console.log(`Company: ${company ? company.name : 'Not Found'} (${companyId})`);

        // 2. Get the role by ID (from previous script)
        const roleId = '697b60c6c977f8098401b521';
        const role = await Role.findById(roleId);
        if (!role) {
            console.log('Role not found by ID.');
            return;
        }
        console.log(`Role: ${role.name} (${role._id})`);
        console.log(`Role Company: ${role.company}`);
        console.log(`Target Company: ${companyId}`);
        console.log(`Company Match: ${role.company.toString() === companyId}`);

        // 3. Count users using the SAME logic as the route
        const count = await User.countDocuments({
            customRole: role._id,
            companies: companyId
        });
        console.log(`Count from DB query: ${count}`);

        // 4. Find the user and inspect
        const user = await User.findOne({ email: 'admin1@gmail.com' });
        console.log('User admin1:', {
            id: user._id,
            email: user.email,
            customRole: user.customRole,
            companies: user.companies
        });

        // 5. Check equality
        const roleMatch = user.customRole.toString() === role._id.toString();
        const companyMatch = user.companies.some(c => c.toString() === companyId);
        console.log(`Role Match: ${roleMatch}`);
        console.log(`Company Match: ${companyMatch}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugUserCounts();
