/**
 * Upload Public Key to Meta WhatsApp Business Encryption
 * 
 * This script uploads your public key to Meta so they can encrypt
 * data sent to your Flow endpoint.
 * 
 * Usage: node scripts/upload_flow_public_key.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Models
const Company = require('../src/models/Company');

async function uploadPublicKey() {
    console.log('🔑 Uploading Public Key to Meta...\n');

    // Connect to database
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }

    // Get all companies with WhatsApp configs
    const companies = await Company.find({ 'whatsappConfigs.isEnabled': true });

    if (companies.length === 0) {
        console.error('❌ No companies with enabled WhatsApp configuration found');
        console.error('   Go to your CRM Settings page and configure WhatsApp first.');
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`📋 Found ${companies.length} companies with WhatsApp enabled\n`);

    // Read public key
    const publicKeyPath = path.join(__dirname, '../keys/flow_public_key.pem');
    if (!fs.existsSync(publicKeyPath)) {
        console.error('❌ Public key not found. Run "node scripts/generate_flow_keys.js" first.');
        await mongoose.disconnect();
        process.exit(1);
    }

    const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
    console.log('📄 Public Key loaded from:', publicKeyPath);
    console.log('');

    // Upload for each company's enabled WhatsApp config
    for (const company of companies) {
        for (const config of company.whatsappConfigs) {
            if (!config.isEnabled) continue;

            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📱 Company: ${company.name}`);
            console.log(`   Config: ${config.name}`);
            console.log(`   Phone ID: ${config.phoneNumberId}`);

            if (!config.phoneNumberId || !config.accessToken) {
                console.log('   ⚠️  Skipping - Phone Number ID or Access Token missing');
                continue;
            }

            try {
                const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/whatsapp_business_encryption`;

                console.log(`   📤 Uploading to: ${url}`);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        'business_public_key': publicKey
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    console.log('   ✅ SUCCESS! Public key uploaded.');
                } else {
                    console.log('   ❌ Error:', JSON.stringify(data));
                }

            } catch (error) {
                console.log(`   ❌ Request failed: ${error.message}`);
            }
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('');
    console.log('1️⃣  Go to Meta Business Manager:');
    console.log('    WhatsApp Manager → Account Tools → Flows');
    console.log('');
    console.log('2️⃣  Edit your Flow → Settings');
    console.log('');
    console.log('3️⃣  Set Endpoint URL:');
    console.log('    https://srv1304549.hstgr.cloud/api/whatsapp/flow-endpoint');
    console.log('');
    console.log('4️⃣  Select your Phone Number from the dropdown');
    console.log('');
    console.log('5️⃣  The public key should show as "Signed" ✓');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
}

uploadPublicKey();
