const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env file.');
    process.exit(1);
}

// Define a schema for migration - strict: false allows us to see fields not in schema
// We want to access 'assignedDateTime' even if it was removed from the main codebase schema definition
// And write to 'leadDate'.
const leadSchema = new mongoose.Schema({}, { strict: false });

// Reuse existing model if exists (unlikely in standalone script) or compile check
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

const migrateLeads = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // Find leads that have assignedDateTime
        const leadsToUpdate = await Lead.find({ assignedDateTime: { $exists: true } });
        console.log(`Found ${leadsToUpdate.length} leads to migrate.`);

        if (leadsToUpdate.length === 0) {
            console.log('No leads with assignedDateTime found. Migration might have already run.');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const lead of leadsToUpdate) {
            try {
                // Determine the date to move
                const dateToMove = lead.assignedDateTime;

                if (dateToMove) {
                    // Update object: set leadDate, unset assignedDateTime
                    await Lead.updateOne(
                        { _id: lead._id },
                        {
                            $set: { leadDate: dateToMove },
                            $unset: { assignedDateTime: "" }
                        }
                    );
                    successCount++;
                } else {
                    // If it exists but is null/undefined, just unset it
                    await Lead.updateOne(
                        { _id: lead._id },
                        { $unset: { assignedDateTime: "" } }
                    );
                    successCount++;
                }

                // Optional: Progress log every 100 items
                if (successCount % 100 === 0) {
                    process.stdout.write(`.`);
                }
            } catch (err) {
                console.error(`Failed to update lead ${lead._id}:`, err);
                errorCount++;
            }
        }

        console.log('\nMigration completed.');
        console.log(`Successfully migrated: ${successCount}`);
        console.log(`Failed: ${errorCount}`);

    } catch (error) {
        console.error('Migration Fatal Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    }
};

migrateLeads();
