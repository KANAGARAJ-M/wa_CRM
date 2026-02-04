const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Company = require('../src/models/Company');
const Form = require('../src/models/Form');
const Product = require('../src/models/Product');

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB\n');

        const products = await Product.find().populate('company').populate('linkedForm');

        console.log(`Found ${products.length} Total Products.`);

        console.log('\n--- Products with Retailer IDs ---');
        let count = 0;
        for (const p of products) {
            if (p.retailerId) {
                count++;
                console.log(`\nProduct: ${p.name}`);
                console.log(`  Company: ${p.company?.name}`);
                console.log(`  Retailer ID: ${p.retailerId}`);
                console.log(`  Linked Form: ${p.linkedForm ? p.linkedForm.title : 'NONE'}`);
            }
        }

        if (count === 0) {
            console.log('⚠️ NO PRODUCTS HAVE A RETAILER ID set.');
            console.log('The auto-reply logic relies on matching the "product_retailer_id" from WhatsApp to this field.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

checkProducts();
