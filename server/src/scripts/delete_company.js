require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

// Import models
const Company = require('../models/Company');
const Lead = require('../models/Lead');
const Call = require('../models/Call');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const User = require('../models/User');
const Role = require('../models/Role'); // Added Role

const companyId = process.argv[2];

if (!companyId) {
    console.log('Please provide a company ID');
    process.exit(1);
}

async function deleteCompanyData() {
    try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log(`Deleting data for Company ID: ${companyId}`);

        // 1. Delete Leads
        const leadsResult = await Lead.deleteMany({ companyId: companyId });
        console.log(`Deleted ${leadsResult.deletedCount} leads.`);

        // 2. Delete Calls
        const callsResult = await Call.deleteMany({ companyId: companyId });
        console.log(`Deleted ${callsResult.deletedCount} calls.`);

        // 3. Delete WhatsAppMessages
        const msgsResult = await WhatsAppMessage.deleteMany({ companyId: companyId });
        console.log(`Deleted ${msgsResult.deletedCount} WhatsApp messages.`);

        // 4. Delete Roles
        // Note: Role uses 'company' field, not 'companyId' based on previous file check
        const rolesResult = await Role.deleteMany({ company: companyId });
        console.log(`Deleted ${rolesResult.deletedCount} roles.`);

        // 5. Update Users (remove company from companies array)
        const usersResult = await User.updateMany(
            { companies: companyId },
            { $pull: { companies: companyId } }
        );
        console.log(`Updated ${usersResult.modifiedCount} users.`);

        // 6. Delete Company
        const companyResult = await Company.deleteOne({ _id: companyId });
        console.log(`Deleted Company document: ${companyResult.deletedCount}`);

        console.log('Deletion complete.');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error during deletion:', error);
        process.exit(1);
    }
}

deleteCompanyData();
