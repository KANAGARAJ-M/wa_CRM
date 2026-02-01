const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Lead = require('../models/Lead');
const Company = require('../models/Company');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find the phoneNumberId for "reortho"
        const company = await Company.findOne({ 'whatsappConfigs.name': /reortho/i });

        if (!company) {
            console.error('Could not find a company with a WhatsApp config named "reortho"');
            process.exit(1);
        }

        const config = company.whatsappConfigs.find(c => c.name.toLowerCase().includes('reortho'));
        const targetPhoneNumberId = config.phoneNumberId;
        console.log(`Found config: ${config.name} with ID: ${targetPhoneNumberId}`);

        // 2. Find and update leads
        // We'll update leads with source 'excel_upload' OR any lead that doesn't have a phoneNumberId if they look like they might be from excel
        const filter = {
            $or: [
                { source: 'excel_upload' },
                { source: 'manual' } // Sometimes manual leads also need to be assigned if they were imported before we added the field
            ]
        };

        const result = await Lead.updateMany(
            filter,
            { $set: { phoneNumberId: targetPhoneNumberId } }
        );

        console.log(`Successfully updated ${result.modifiedCount} leads to account "${config.name}" (${targetPhoneNumberId})`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
