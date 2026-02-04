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

    console.log('--- All Unique PhoneNumberIds in DB ---');
    const phoneIds = await WhatsAppMessage.distinct('phoneNumberId');
    console.log('Phone Number IDs:', phoneIds);

    console.log('\n--- Messages for Dheenadhayalan (917397705276) ---');
    const messages = await WhatsAppMessage.find({
        $or: [
            { from: '917397705276' },
            { to: '917397705276' }
        ]
    }).sort({ timestamp: -1 }).limit(30);

    console.log(`Found ${messages.length} messages:`);
    messages.forEach(msg => {
        console.log(`  [${msg.type}] PhoneID: ${msg.phoneNumberId} | Dir: ${msg.direction} | From: ${msg.from} | To: ${msg.to || 'N/A'}`);
    });

    console.log('\n--- Grouping by Phone + PhoneNumberId ---');
    const groups = {};
    messages.forEach(msg => {
        const contact = msg.direction === 'incoming' ? msg.from : msg.to;
        const phoneId = msg.phoneNumberId || 'MISSING';
        const key = `${contact}_${phoneId}`;
        if (!groups[key]) groups[key] = { count: 0, phoneId: phoneId };
        groups[key].count++;
    });
    console.log('Groups:', groups);

    process.exit();
};

run();
