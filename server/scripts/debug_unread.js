const mongoose = require('mongoose');
const { WhatsAppMessage } = require('../src/models');
require('dotenv').config({ path: './server/.env' });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    console.log('--- Unread Incoming Messages ---');
    const unreadMsgs = await WhatsAppMessage.find({
        direction: 'incoming',
        status: { $in: ['received', 'pending'] }
    }).limit(20).lean();

    console.log(`Found ${unreadMsgs.length} unread messages:`);
    unreadMsgs.forEach(msg => {
        console.log(`  ID: ${msg._id} | From: ${msg.from} | Status: ${msg.status} | PhoneNumID: ${msg.phoneNumberId} | Body: ${(msg.body || '').substring(0, 30)}...`);
    });

    console.log('\n--- Mark all as read (for testing)? ---');
    console.log('To fix, run: db.whatsappmessages.updateMany({ direction: "incoming", status: "received" }, { $set: { status: "read" } })');

    process.exit();
};

run();
