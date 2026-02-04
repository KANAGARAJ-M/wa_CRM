const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Company = require('../src/models/Company');

async function checkConfigs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const companies = await Company.find();

        for (const company of companies) {
            console.log(`\nCompany: ${company.name} (${company._id})`);
            if (company.whatsappConfigs && company.whatsappConfigs.length > 0) {
                console.log(`Found ${company.whatsappConfigs.length} WhatsApp Configs:`);
                for (const [index, config] of company.whatsappConfigs.entries()) {
                    console.log(`\n[${index + 1}] Name: ${config.name}`);
                    console.log(`    Phone ID: ${config.phoneNumberId}`);
                    console.log(`    WABA ID:  ${config.businessAccountId}`);
                    console.log(`    Enabled:  ${config.isEnabled}`);

                    // Check Graph API for Subscription
                    if (config.businessAccountId && config.accessToken) {
                        try {
                            const url = `https://graph.facebook.com/v19.0/${config.businessAccountId}/subscribed_apps`;
                            const response = await fetch(url, {
                                headers: { 'Authorization': `Bearer ${config.accessToken}` }
                            });
                            const data = await response.json();
                            console.log(`    ℹ️ Subscription Status (WABA):`, JSON.stringify(data));
                        } catch (err) {
                            console.log(`    ❌ Failed to check subscription: ${err.message}`);
                        }
                    } else {
                        console.log(`    ⚠️ Cannot check subscription: Missing ID or Token`);
                    }
                }
            } else {
                console.log('No WhatsApp Configs.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

checkConfigs();
