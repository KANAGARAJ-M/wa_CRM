const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration from your DB (Catlog / THULIR HERBA KL)
const CONFIG = {
    accessToken: 'EAAWWFVZAYmNQBQsFzivs2ZBmX3TdvcWcypksMIZAw4l8wZCLEI4AFax0vOZAQPZC2oaik9kzKPDIHwDyTWaad32xKSlPV1Y1IHPdgAclu8TOhHrJHIeAl1HmEZBcGcYrobxPodFFp6olJHxuu4pikN3EdfvuCKbAtKTQNnAUupofLdRXvEKfri1nbCAdbDqxwZDZD',
    businessAccountId: '898353223160974',
    catalogId: '1988568121874576'
};

async function fetchCommerceOrders() {
    console.log('🔍 Checking for Commerce Manager Orders (Facebook/Instagram Shops)...');

    // 1. First we need to find the Commerce Merchant ID (CMS ID) linked to this user/business
    // It's often linked to the Catalog

    // Attempt 1: Check via Catalog? Catalog usually belongs to a Business.
    // Let's try to get the Commerce Accounts for this user token.
    try {
        const url = `https://graph.facebook.com/v19.0/me/commerce_merchant_settings`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${CONFIG.accessToken}` }
        });
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            console.log(`✅ Found ${data.data.length} Commerce Merchant Accounts.`);

            for (const merchant of data.data) {
                console.log(`\n🛍️ Checking Merchant: ${merchant.display_name} (ID: ${merchant.id})`);
                await getOrdersForMerchant(merchant.id);
            }
        } else {
            console.log('⚠️ No Commerce Merchant Accounts found for this token.');
            console.log('If you are using basic "WhatsApp Carts" (Catalog Messages), these are NOT stored in Commerce Manager.');
            console.log('They are simple messages and CANNOT be fetched historically via API if the webhook was missed.');
        }

    } catch (error) {
        console.error('Error fetching merchants:', error);
    }
}

async function getOrdersForMerchant(merchantId) {
    try {
        // Fetch Orders for this merchant
        const url = `https://graph.facebook.com/v19.0/${merchantId}/orders?fields=id,amount,buyer_details,channel,merchant_order_id,order_status`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${CONFIG.accessToken}` }
        });
        const data = await response.json();

        if (data.data) {
            console.log(`   📦 Found ${data.data.length} Orders:`);
            data.data.forEach(order => {
                console.log(`   - Order #${order.id} | Status: ${order.order_status} | Amount: ${order.amount?.formatted_amount}`);
            });
        } else {
            console.log('   ❌ Failed to fetch orders:', data.error?.message);
        }
    } catch (error) {
        console.error('   Error fetching orders:', error.message);
    }
}

fetchCommerceOrders();
