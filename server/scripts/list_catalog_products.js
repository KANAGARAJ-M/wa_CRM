const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONFIG = {
    accessToken: 'EAAWWFVZAYmNQBQsFzivs2ZBmX3TdvcWcypksMIZAw4l8wZCLEI4AFax0vOZAQPZC2oaik9kzKPDIHwDyTWaad32xKSlPV1Y1IHPdgAclu8TOhHrJHIeAl1HmEZBcGcYrobxPodFFp6olJHxuu4pikN3EdfvuCKbAtKTQNnAUupofLdRXvEKfri1nbCAdbDqxwZDZD',
    catalogId: '1988568121874576'
};

async function listProducts() {
    console.log(`🚀 Fetching products from Catalog ${CONFIG.catalogId}...`);

    // The endpoint to list products in a catalog is slightly different, usually batch or via product_products edge?
    // Actually it's /{catalog_id}/products
    const url = `https://graph.facebook.com/v19.0/${CONFIG.catalogId}/products?fields=id,retailer_id,name`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.accessToken}`
            }
        });

        const data = await response.json();

        if (data.data) {
            console.log(`✅ Found ${data.data.length} products in Meta Catalog:\n`);
            data.data.forEach(p => {
                console.log(`- [${p.name}]`);
                console.log(`  Meta ID: ${p.id}`);
                console.log(`  Retailer ID (SKU): ${p.retailer_id}`);
                console.log('---');
            });

            console.log('\nIMPORTANT: Your local database "Retailer ID" MUST match the "Retailer ID (SKU)" listed above for the auto-reply to work.');

        } else {
            console.log('❌ Failed to list products:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Network/Script Error:', error);
    }
}

listProducts();
