const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Company } = require('../models');

const debugUserCompany = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@whatsappcrm.com';
        const user = await User.findOne({ email }).populate('companies');

        if (!user) {
            console.log(`User ${email} not found!`);
            return;
        }

        console.log('User Found:');
        console.log(`ID: ${user._id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`CustomRole: ${user.customRole}`);
        console.log(`Companies Array (IDs): ${user.companies.map(c => c._id || c)}`);

        console.log('\n--- Associated Companies Details ---');
        if (user.companies && user.companies.length > 0) {
            user.companies.forEach(company => {
                if (company._id) {
                    console.log(`Company: ${company.name} (${company._id}) - Owner: ${company.owner}`);
                    // Check if user is also in company.users
                    console.log(`  User present in company.users? ${company.users.includes(user._id)}`);
                } else {
                    console.log(`Company ID ${company} not found or failed to populate.`);
                }
            });
        } else {
            console.log('User has no companies linked.');
        }

        console.log('\n--- All Companies in DB ---');
        const allCompanies = await Company.find({});
        allCompanies.forEach(c => {
            console.log(`Name: ${c.name} (${c._id})`);
            console.log(`  Owner: ${c.owner}`);
            console.log(`  Users: ${c.users}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugUserCompany();
