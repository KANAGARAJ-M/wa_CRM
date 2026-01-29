const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env file.');
    process.exit(1);
}

// Define a schema with strict: false to access fields that might not be in the latest code schema
const leadSchema = new mongoose.Schema({}, { strict: false });
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

const checkMigration = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to database.');

        // Count documents that have the old field 'assignedDateTime'
        const count = await Lead.countDocuments({ assignedDateTime: { $exists: true } });

        console.log('\n--- Migration Analysis ---');
        console.log(`Checking for leads with 'assignedDateTime' field...`);
        console.log(`Total leads requiring migration: ${count}`);

        if (count > 0) {
            console.log('\nSample of leads to be updated:');
            const samples = await Lead.find({ assignedDateTime: { $exists: true } }).limit(5).select('_id name assignedDateTime');
            samples.forEach(doc => {
                console.log(`- ID: ${doc._id}, Name: ${doc.name}, Assigned Date: ${doc.assignedDateTime}`);
            });
            console.log(`\nTo fix these, run the migration script.`);
        } else {
            console.log('No leads found with the old field name. System is up to date.');
        }

    } catch (error) {
        console.error('Error checking leads:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

checkMigration();
