const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Role } = require('../models');

const fixAdmin1Company = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin1@gmail.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`User ${email} not found.`);
            return;
        }

        console.log(`User: ${user.name}`);
        console.log(`Current Companies: ${user.companies}`);

        // The role 697b60c6c977f8098401b521 belongs to company 696519b3253771cd8d3bd5df
        // So we must add this company to the user
        const correctCompanyId = '696519b3253771cd8d3bd5df';

        if (!user.companies.includes(correctCompanyId)) {
            user.companies.push(correctCompanyId);
            await user.save();
            console.log(`Added company ${correctCompanyId} to user.`);
        } else {
            console.log(`User already in company ${correctCompanyId}.`);
        }

        console.log(`Updated Companies: ${user.companies}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixAdmin1Company();
