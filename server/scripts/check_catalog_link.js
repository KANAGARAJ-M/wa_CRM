const fetch = global.fetch;
const fs = require('fs');

async function checkCatalogLink() {
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    const phoneId = fs.readFileSync('temp_phone_id.txt', 'utf8').trim();

    console.log(`Checking catalog link for Phone ID: ${phoneId}`);

    // We need the Business Account ID, which we can get from the phone ID or assume from previous logs
    // WABA ID: 898353223160974
    const wabaId = '898353223160974';

    const url = `https://graph.facebook.com/v18.0/${wabaId}/product_catalogs`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('Connected Catalogs:', JSON.stringify(data, null, 2));

        if (data.data && data.data.length > 0) {
            console.log(`✅ Found ${data.data.length} connected catalog(s).`);
        } else {
            console.log('❌ NO connected catalogs found! This is why view_catalog fails.');
        }

    } catch (e) {
        console.error('Error checking catalog:', e);
    }
}

checkCatalogLink();
