const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONFIG = {
    accessToken: 'EAAWWFVZAYmNQBQlo1OtfNtEhOtbxuNyh7LOTWskkiBDgGSBlIuuEaPCmkadPNb5y3o779OI9RNkfFSRTCXZAhPdqPJ8aqpH50RB2jo14gSiZCGT88NgGwZA0BOdumACWGyY2JXqf8cMGZAsQ7G96ZCJXOyQ9bK55em7xeZAVhcIbFN6DP8KP1BV83MiTE824wZDZD',
    businessAccountId: '898353223160974'
};

async function subscribeApp() {
    console.log(`🚀 Attempting to subscribe WABA ${CONFIG.businessAccountId} to Webhooks...`);

    const url = `https://graph.facebook.com/v19.0/${CONFIG.businessAccountId}/subscribed_apps`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.accessToken}`
            }
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('✅ SUCCESS! App subscribed to Webhooks.');
        } else {
            console.log('❌ FAILED to subscribe.');
        }

    } catch (error) {
        console.error('Network/Script Error:', error);
    }
}

async function checkToken() {
    console.log('\n🔍 Debugging Access Token...');
    const url = `https://graph.facebook.com/v19.0/debug_token?input_token=${CONFIG.accessToken}&access_token=${CONFIG.accessToken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Token Info:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Token Check Error:', error);
    }
}

// Run
(async () => {
    await checkToken();
    await subscribeApp();
})();
