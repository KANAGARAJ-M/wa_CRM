const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Company } = require('../src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm_db';

async function getToken() {
    try {
        await mongoose.connect(MONGODB_URI);
        // 1. Get configuration with name 'catlog'
        const company = await Company.findOne({
            'whatsappConfigs': {
                $elemMatch: {
                    name: { $regex: /^catlog$/i },
                    isEnabled: true
                }
            }
        });

        if (!company) {
            console.error('No company with enabled WhatsApp config named "catlog" found.');
            process.exit(1);
        }

        const config = company.whatsappConfigs.find(c => c.name.toLowerCase() === 'catlog' && c.isEnabled);
        const fs = require('fs');
        const token = config.accessToken.trim();
        const phoneId = config.phoneNumberId;
        fs.writeFileSync('temp_token.txt', token);
        fs.writeFileSync('temp_phone_id.txt', phoneId);
        console.log(`WABA_ID=${config.businessAccountId}`);
        console.log(`PHONE_ID=${phoneId}`);
        console.log('Token written to temp_token.txt');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
getToken();
