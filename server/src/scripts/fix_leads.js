require('dotenv').config();
const mongoose = require('mongoose');
const { Lead, WhatsAppMessage } = require('../models');

async function fixLeads() {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB');

        // Find ALL leads to update their lastMessage and lastInteraction
        const leads = await Lead.find({});

        console.log(`Processing ${leads.length} leads for metadata updates...`);

        let updatedCount = 0;

        for (const lead of leads) {
            // Find most recent message for this lead
            const message = await WhatsAppMessage.findOne({
                $or: [{ from: lead.phone }, { to: lead.phone }]
            }).sort({ timestamp: -1 });

            let needsSave = false;
            let updates = [];

            if (message) {
                // 1. Fix phoneNumberId if missing
                if (!lead.phoneNumberId && message.phoneNumberId) {
                    lead.phoneNumberId = message.phoneNumberId;
                    needsSave = true;
                    updates.push(`Account: ${message.phoneNumberId}`);
                }

                // 2. Update lastMessage
                const msgContent = message.body || `[${message.type} message]`;
                if (lead.lastMessage !== msgContent) {
                    lead.lastMessage = msgContent;
                    needsSave = true;
                    updates.push('lastMessage updated');
                }

                // 3. Update lastInteraction
                if (!lead.lastInteraction || new Date(lead.lastInteraction).getTime() !== new Date(message.timestamp).getTime()) {
                    lead.lastInteraction = message.timestamp;
                    needsSave = true;
                    updates.push(`lastInteraction: ${message.timestamp}`);
                }

                if (needsSave) {
                    await lead.save();
                    console.log(`✅ Updated ${lead.name} (${lead.phone}): ${updates.join(', ')}`);
                    updatedCount++;
                }
            } else {
                if (!lead.phoneNumberId) {
                    console.log(`⚠️ No message history for ${lead.name} (${lead.phone}) - skipping assignment`);
                }
            }
        }

        console.log(`\nMigration complete. Updated ${updatedCount} / ${leads.length} leads.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during migration:', error);
        process.exit(1);
    }
}

fixLeads();
