require('dotenv').config();
const mongoose = require('mongoose');
const { User, Lead, WhatsAppMessage, Settings, Company } = require('../models');

async function migrate() {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Create Default Company if needed
        let defaultCompany = await Company.findOne({ name: 'Default Company' });

        if (!defaultCompany) {
            console.log('Creating Default Company...');
            // Try to find an owner (first admin or superadmin)
            const admin = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });

            // Get existing Settings to migrate configs
            const settings = await Settings.findOne();
            const configs = settings ? settings.whatsappConfigs : [];

            defaultCompany = await Company.create({
                name: 'Default Company',
                whatsappConfigs: configs,
                owner: admin ? admin._id : null,
                users: admin ? [admin._id] : []
            });
            console.log('✅ Default Company created:', defaultCompany._id);
        } else {
            console.log('ℹ️ Default Company already exists:', defaultCompany._id);
        }

        // 2. Assign All Users to Default Company (if not already assigned)
        // We find users who do NOT have the defaultCompany._id in their companies array
        const usersToUpdate = await User.find({
            companies: { $nin: [defaultCompany._id] }
        });

        if (usersToUpdate.length > 0) {
            console.log(`Assigning ${usersToUpdate.length} users to Default Company...`);
            for (const user of usersToUpdate) {
                user.companies.push(defaultCompany._id);
                await user.save();
            }
            // Also update Company's users list
            const userIds = usersToUpdate.map(u => u._id);
            await Company.findByIdAndUpdate(defaultCompany._id, {
                $addToSet: { users: { $each: userIds } }
            });
            console.log('✅ Users assigned.');
        } else {
            console.log('ℹ️ All users already assigned.');
        }

        // 3. Migrate Leads
        console.log('Migrating Leads...');
        const leadsResult = await Lead.updateMany(
            { companyId: { $exists: false } },
            { $set: { companyId: defaultCompany._id } }
        );
        console.log(`✅ Migrated ${leadsResult.modifiedCount} leads.`);

        // 4. Migrate WhatsAppMessages
        console.log('Migrating Messages...');
        const msgsResult = await WhatsAppMessage.updateMany(
            { companyId: { $exists: false } },
            { $set: { companyId: defaultCompany._id } }
        );
        console.log(`✅ Migrated ${msgsResult.modifiedCount} messages.`);

        console.log('\nMigration complete.');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
