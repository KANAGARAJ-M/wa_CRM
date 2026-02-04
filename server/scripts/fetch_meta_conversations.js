const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONFIG = {
    accessToken: 'EAAWWFVZAYmNQBQsFzivs2ZBmX3TdvcWcypksMIZAw4l8wZCLEI4AFax0vOZAQPZC2oaik9kzKPDIHwDyTWaad32xKSlPV1Y1IHPdgAclu8TOhHrJHIeAl1HmEZBcGcYrobxPodFFp6olJHxuu4pikN3EdfvuCKbAtKTQNnAUupofLdRXvEKfri1nbCAdbDqxwZDZD',
    phoneNumberId: '920774701130419'
};

async function fetchConversations() {
    console.log(`🚀 Fetching Conversations for Phone ID: ${CONFIG.phoneNumberId}...`);

    // NOTE: This endpoint typically returns conversation analytics/billing info, NOT message content.
    // WhatsApp Cloud API does not provide an endpoint to fetch historical message text.
    const url = `https://graph.facebook.com/v19.0/${CONFIG.phoneNumberId}/conversations`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.accessToken}`
            }
        });

        const data = await response.json();

        if (data.data) {
            console.log(`✅ Found ${data.data.length} Conversation Threads (Billing Sessions):`);
            console.log(JSON.stringify(data.data, null, 2));
            console.log('\nNOTE: These are billing "conversations" (24h windows). The API does NOT allow fetching the actual text content of past messages. You must rely on the Webhook to save them as they come in.');
        } else {
            console.log('❌ Failed to fetch conversations (or none found):', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Network/Script Error:', error);
    }
}

fetchConversations();
