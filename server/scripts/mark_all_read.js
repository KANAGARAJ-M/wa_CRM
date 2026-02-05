const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('whatsappmessages').updateMany(
        { direction: 'incoming', status: 'received' },
        { $set: { status: 'read' } }
    );

    console.log(`Marked ${result.modifiedCount} messages as read`);
    process.exit();
};

run().catch(err => {
    console.error(err);
    process.exit(1);
});
