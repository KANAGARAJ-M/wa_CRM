const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("No MONGODB_URI found in .env");
    process.exit(1);
}

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected.');

        // Define schemas just enough to read data
        const settingsSchema = new mongoose.Schema({}, { strict: false });
        const Settings = mongoose.model('Settings', settingsSchema, 'settings');

        const companySchema = new mongoose.Schema({}, { strict: false });
        const Company = mongoose.model('Company', companySchema, 'companies');

        console.log('\n--- Checking Settings Collection ---');
        const allSettings = await Settings.find({});

        if (allSettings.length === 0) console.log('No Settings documents found.');

        allSettings.forEach(doc => {
            console.log(`Settings ID: ${doc._id}`);
            if (doc.whatsappConfigs) {
                console.log('WhatsApp Configs:', JSON.stringify(doc.whatsappConfigs, null, 2));
            } else {
                console.log('No whatsappConfigs in this document.');
            }
        });

        console.log('\n--- Checking Companies Collection ---');
        // Search for Thulir Herba specifically if needed, or just list with configs
        const companies = await Company.find({
            $or: [
                { name: { $regex: 'Thulir', $options: 'i' } },
                { 'whatsappConfigs.name': { $regex: 'REORTHO', $options: 'i' } }
            ]
        });

        if (companies.length === 0) {
            console.log('No companies found matching "Thulir" or having "REORTHO" config.');
            // Fallback: List all checking for configs
            const allCompanies = await Company.find({ 'whatsappConfigs.0': { $exists: true } });
            console.log(`Found ${allCompanies.length} companies with ANY WhatsApp config.`);
            allCompanies.forEach(c => {
                console.log(`Company: ${c.name}, Configs: ${c.whatsappConfigs?.map(conf => conf.name).join(', ')}`);
            });
        } else {
            companies.forEach(c => {
                console.log(`\nCompany Found: ${c.name} (ID: ${c._id})`);
                if (c.whatsappConfigs && c.whatsappConfigs.length > 0) {
                    console.log('WhatsApp Configs:');
                    c.whatsappConfigs.forEach(conf => {
                        console.log(` - Name: ${conf.name}`);
                        console.log(`   PhoneID: ${conf.phoneNumberId}`);
                        console.log(`   BizID: ${conf.businessAccountId}`);
                        console.log(`   Status: ${conf.isEnabled ? 'Enabled' : 'Disabled'}`);
                        console.log(`   VerifyToken: ${conf.webhookVerifyToken}`);
                    });
                } else {
                    console.log('No WhatsApp Configs.');
                }
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

run();
