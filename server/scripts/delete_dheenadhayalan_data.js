const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Company, WhatsAppMessage, Lead, FlowResponse, FormSubmission } = require('../src/models');

const TARGET_COMPANY_NAME = 'THULIR HERBA KL';
const TARGET_PHONE_NUMBERS = [
    '917397705276',
    '+917397705276',
    '7397705276',
    '91 73977 05276',
    '+91 73977 05276'
];

async function deleteData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Find the Company
        const company = await Company.findOne({ name: TARGET_COMPANY_NAME });
        if (!company) {
            console.error(`Company "${TARGET_COMPANY_NAME}" not found!`);
            process.exit(1);
        }
        console.log(`Found Company: ${company.name} (ID: ${company._id})`);

        // Build Phone Regex for flexible matching
        // Create regex that matches the number ending with the last 10 digits
        const last10 = '7397705276';
        const phoneRegex = new RegExp(`${last10}$`);

        console.log(`Targeting data for phone number ending in: ${last10}`);

        // 2. Delete WhatsApp Messages (Orders and Chats)
        // Check filtering for specific company and phone number involved
        const messageQuery = {
            companyId: company._id,
            $or: [
                { from: { $in: TARGET_PHONE_NUMBERS } },
                { to: { $in: TARGET_PHONE_NUMBERS } },
                { from: phoneRegex },
                { to: phoneRegex }
            ]
        };

        const messagesCount = await WhatsAppMessage.countDocuments(messageQuery);
        console.log(`Found ${messagesCount} WhatsApp Messages/Orders to delete.`);

        if (messagesCount > 0) {
            const deleteResult = await WhatsAppMessage.deleteMany(messageQuery);
            console.log(`Deleted ${deleteResult.deletedCount} messages.`);
        }

        // 3. Delete Leads
        const leadQuery = {
            companyId: company._id,
            $or: [
                { phone: { $in: TARGET_PHONE_NUMBERS } },
                { phone: phoneRegex }
            ]
        };

        const leadsCount = await Lead.countDocuments(leadQuery);
        console.log(`Found ${leadsCount} Leads to delete.`);

        if (leadsCount > 0) {
            const deleteResult = await Lead.deleteMany(leadQuery);
            console.log(`Deleted ${deleteResult.deletedCount} leads.`);
        }

        // 4. Delete Flow Responses
        const flowQuery = {
            companyId: company._id,
            from: { $in: TARGET_PHONE_NUMBERS } // FlowResponse usually has 'from' as the user phone
        };
        // Also try regex for flow
        const flowRegexQuery = {
            companyId: company._id,
            from: phoneRegex
        }

        const flowsCount = await FlowResponse.countDocuments(flowRegexQuery);
        console.log(`Found ${flowsCount} Flow Responses to delete.`);

        if (flowsCount > 0) {
            const deleteResult = await FlowResponse.deleteMany(flowRegexQuery);
            console.log(`Deleted ${deleteResult.deletedCount} flow responses.`);
        }

        // 5. Delete Form Submissions
        // FormSubmission has submitterIdentifier
        const formQuery = {
            companyId: company._id,
            submitterIdentifier: phoneRegex
        };

        const formsCount = await FormSubmission.countDocuments(formQuery);
        console.log(`Found ${formsCount} Form Submissions to delete.`);

        if (formsCount > 0) {
            const deleteResult = await FormSubmission.deleteMany(formQuery);
            console.log(`Deleted ${deleteResult.deletedCount} form submissions.`);
        }

        console.log('Operation completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteData();
