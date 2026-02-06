const fetch = global.fetch;
const fs = require('fs');

async function sendTest() {
    const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
    const phoneId = fs.readFileSync('temp_phone_id.txt', 'utf8').trim();
    // Use the user's phone number from previous logs: 916383588281
    const to = '917397705276';
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
            name: 'view_catalog',
            language: { code: 'ta' },
            components: [
                {
                    type: 'button',
                    sub_type: 'CATALOG',
                    index: 0,
                    parameters: []
                }
            ]
        }
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
}

sendTest();
