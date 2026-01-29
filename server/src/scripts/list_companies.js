require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Company = require('../models/Company');

const searchTerm = process.argv[2] || '';

async function listCompanies() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const query = searchTerm ? { name: { $regex: searchTerm, $options: 'i' } } : {};
        const companies = await Company.find(query);

        console.log(`Found ${companies.length} companies${searchTerm ? ` matching "${searchTerm}"` : ''}:`);
        companies.forEach(c => {
            console.log(`- [${c._id}] ${c.name}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listCompanies();
