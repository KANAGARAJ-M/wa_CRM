const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { User, Company } = require('../models');

const exportData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        const companies = await Company.find({});

        const dump = {
            users,
            companies
        };

        fs.writeFileSync(path.join(__dirname, '../../data_dump.json'), JSON.stringify(dump, null, 2));
        console.log('Data exported to server/data_dump.json');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

exportData();
