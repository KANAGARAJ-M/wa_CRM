const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Adjust path if needed
const mongoose = require('mongoose');
const { Company } = require('../src/models'); // Adjust path to models
const fetch = global.fetch; // Use native fetch in Node 18+

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.log('Warning: MONGODB_URI not found in env, using default localhost');
} else {
    console.log('Loaded MONGODB_URI from env');
}

const finalURI = MONGODB_URI || 'mongodb://127.0.0.1:27017/crm_db';

async function checkTemplate() {
    try {
        await mongoose.connect(finalURI);
        console.log('Connected to MongoDB.');

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
        const { businessAccountId, accessToken } = config;

        if (!businessAccountId || !accessToken) {
            console.error('Config missing businessAccountId or accessToken.');
            process.exit(1);
        }

        const templateName = process.argv[2] || 'view_catalog'; // Default to view_catalog
        const language = process.argv[3]; // Optional language filter

        console.log(`Checking template: ${templateName} for WABA: ${businessAccountId}`);

        const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
        let url = `${GRAPH_API_URL}/${businessAccountId}/message_templates?name=${templateName}`;

        // Note: The API usually returns all languages for the name, but we can inspect the specific one.

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.json();

        if (data.error) {
            console.error('Meta API Error:', JSON.stringify(data.error, null, 2));
        } else {
            console.log(`Found ${data.data.length} variations for "${templateName}":`);

            data.data.forEach((tmpl, idx) => {
                if (language && tmpl.language !== language) return;

                console.log(`\n--- Variation ${idx + 1} (${tmpl.language}) ---`);
                console.log(`Status: ${tmpl.status}`);
                console.log(`Components:`);
                tmpl.components.forEach(comp => {
                    console.log(`  - Type: ${comp.type}`);
                    if (comp.text) console.log(`    Text: "${comp.text}"`);
                    if (comp.format) console.log(`    Format: ${comp.format}`); // For HEADER (IMAGE, DOCUMENT, etc.)
                    if (comp.buttons) {
                        console.log(`    Buttons:`);
                        comp.buttons.forEach(btn => {
                            console.log(`      [${btn.type}] ${btn.text} ${btn.url ? '(' + btn.url + ')' : ''}`);
                        });
                    }
                    if (comp.example) console.log(`    Example: ${JSON.stringify(comp.example)}`);
                });
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkTemplate();
