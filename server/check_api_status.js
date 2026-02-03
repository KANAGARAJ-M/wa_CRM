const axios = require('axios');

// Config
const BASE_URL = 'https://srv1304549.hstgr.cloud/api';
// Using credentials from .env
const CREDENTIALS = {
    email: 'admin@whatsappcrm.com',
    password: 'admin123'
};

const run = async () => {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
        const token = loginRes.data.data.token;
        console.log('   Login successful.');
        console.log('   Response Keys:', Object.keys(loginRes.data));
        console.log('   Token acquired:', token ? (token.substring(0, 50) + '...') : 'NULL');

        // Hardcode known company ID from database check
        let companyId = '697caa34aab6078af4d3f358';

        console.log(`2. Checking Subscription Status (Company: ${companyId}...`);

        try {
            const statusRes = await axios.get(`${BASE_URL}/whatsapp/subscription-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-company-id': companyId
                }
            });
            console.log('\nSUCCESS (200 OK):');
            console.log(JSON.stringify(statusRes.data, null, 2));
        } catch (err) {
            console.log('\nERROR calling subscription-status:');
            if (err.response) {
                console.log(`Status: ${err.response.status} ${err.response.statusText}`);
                console.log('Data:', JSON.stringify(err.response.data, null, 2));
            } else {
                console.log(err.message);
            }
        }

        console.log('\n3. Checking Health...');
        try {
            const healthRes = await axios.get(`${BASE_URL}/health`);
            console.log('Health:', healthRes.data);
        } catch (e) { console.log('Health check failed'); }

    } catch (error) {
        console.error('Fatal Error:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
};

run();
