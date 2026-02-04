const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Company = require('../src/models/Company');

const NEW_CONFIG = {
    accessToken: 'EAAWWFVZAYmNQBQsFzivs2ZBmX3TdvcWcypksMIZAw4l8wZCLEI4AFax0vOZAQPZC2oaik9kzKPDIHwDyTWaad32xKSlPV1Y1IHPdgAclu8TOhHrJHIeAl1HmEZBcGcYrobxPodFFp6olJHxuu4pikN3EdfvuCKbAtKTQNnAUupofLdRXvEKfri1nbCAdbDqxwZDZD',
    businessAccountId: '898353223160974',
    phoneNumberId: '920774701130419',
    catalogId: '1988568121874576',
    name: 'Main WhatsApp Integration',
    isEnabled: true
};

async function updateConfig() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // Find the company - assuming single company or we update all that have this phone ID
        // First, let's try to find a company that ALREADY has this phone ID to update it
        let company = await Company.findOne({ 'whatsappConfigs.phoneNumberId': NEW_CONFIG.phoneNumberId });

        if (!company) {
            console.log('Company with this Phone Number ID not found. finding ANY company...');
            company = await Company.findOne(); // Fallback to first company
        }

        if (!company) {
            console.error('❌ No company found in database.');
            process.exit(1);
        }

        console.log(`Found Company: ${company.name} (${company._id})`);

        // Check if config exists
        const configIndex = company.whatsappConfigs.findIndex(c => c.phoneNumberId === NEW_CONFIG.phoneNumberId);

        if (configIndex >= 0) {
            console.log('Updating existing configuration...');
            company.whatsappConfigs[configIndex].accessToken = NEW_CONFIG.accessToken;
            company.whatsappConfigs[configIndex].businessAccountId = NEW_CONFIG.businessAccountId;
            company.whatsappConfigs[configIndex].catalogId = NEW_CONFIG.catalogId;
            company.whatsappConfigs[configIndex].isEnabled = true;
        } else {
            console.log('Adding new configuration...');
            company.whatsappConfigs.push(NEW_CONFIG);
        }

        // Also update the global metaCatalogConfig just in case
        company.metaCatalogConfig = {
            catalogId: NEW_CONFIG.catalogId,
            accessToken: NEW_CONFIG.accessToken
        };

        await company.save();
        console.log('✅ Configuration successfully updated!');

    } catch (error) {
        console.error('Error updating config:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

updateConfig();
