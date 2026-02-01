const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Company = require('../models/Company');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const result = await Company.updateMany(
            { settingsPassword: { $exists: false } },
            { $set: { settingsPassword: 'Openthelock' } }
        );
        console.log(`Updated ${result.modifiedCount} companies with default settings password.`);

        // Also ensure it is correct if it exists but is different (optional, but keep it as requested)
        const result2 = await Company.updateMany(
            { settingsPassword: { $ne: 'Openthelock' } },
            { $set: { settingsPassword: 'Openthelock' } }
        );
        console.log(`Reset ${result2.modifiedCount} companies to password 'Openthelock'.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
