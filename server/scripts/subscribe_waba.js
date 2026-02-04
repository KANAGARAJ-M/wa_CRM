const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Company = require('../src/models/Company');

async function subscribeApp() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Fetch the Token for Catlog / THULIR HERBA KL
        // We know the phoneNumberId from previous steps: 920774701130419
        const company = await Company.findOne({ 'whatsappConfigs.phoneNumberId': '920774701130419' });

        if (!company) {
            console.error('❌ Company not found in DB.');
            return;
        }

        const config = company.whatsappConfigs.find(c => c.phoneNumberId === '920774701130419');

        if (!config || !config.accessToken || !config.businessAccountId) {
            console.error('❌ Missing config details (Token/WABA ID).');
            return;
        }

        console.log(`Found Config: ${config.name}`);
        console.log(`WABA ID: ${config.businessAccountId}`);
        console.log(`Token: ${config.accessToken.substring(0, 15)}...`);

        // 1. Subscribe App to Webhooks
        console.log('\n🚀 Subscribing WABA to Webhooks...');
        const url = `https://graph.facebook.com/v19.0/${config.businessAccountId}/subscribed_apps`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.accessToken}` }
        });

        const data = await response.json();
        console.log('Subscribe Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('✅ SUBSCRIBED SUCCESSFULLY!');
            console.log('The webhook should now receive messages.');
        } else {
            console.log('❌ Failed to subscribe.');
        }

        // 2. Check Permissions (Debug)
        console.log('\n🔍 Verifying Token Permissions...');
        const debugUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${config.accessToken}&access_token=${config.accessToken}`;
        const debugData = await (await fetch(debugUrl)).json();
        const scopes = debugData.data?.scopes || [];
        console.log('Token Scopes:', scopes);

        if (!scopes.includes('whatsapp_business_management') || !scopes.includes('whatsapp_business_messaging')) {
            console.warn('⚠️ WARNING: Token might be missing required permissions (whatsapp_business_management, whatsapp_business_messaging).');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

subscribeApp();
