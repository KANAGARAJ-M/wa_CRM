const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate RSA Key Pair for WhatsApp Flows
 * 
 * This generates a 2048-bit RSA key pair as required by Meta.
 * The public key needs to be uploaded to Meta via the Cloud API.
 */

const keysDir = path.join(__dirname, '../keys');

// Create keys directory if it doesn't exist
if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
}

// Generate 2048-bit RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

// Save keys to files
fs.writeFileSync(path.join(keysDir, 'flow_private_key.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'flow_public_key.pem'), publicKey);

console.log('✅ RSA Key Pair Generated Successfully!\n');
console.log('📁 Keys saved to:', keysDir);
console.log('   - flow_private_key.pem (KEEP THIS SECRET!)');
console.log('   - flow_public_key.pem');
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 YOUR PUBLIC KEY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(publicKey);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📝 NEXT STEPS:');
console.log('');
console.log('1️⃣  Upload public key to Meta using this command:');
console.log('');
console.log('   Run: node scripts/upload_flow_public_key.js');
console.log('');
console.log('2️⃣  Add to your .env file:');
console.log('   FLOW_PRIVATE_KEY_PATH=./keys/flow_private_key.pem');
console.log('');
console.log('3️⃣  Set your endpoint URL in Meta Flow settings:');
console.log('   https://srv1304549.hstgr.cloud/api/whatsapp/flow-endpoint');
console.log('\n');
