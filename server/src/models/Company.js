const mongoose = require('mongoose');

const whatsappConfigSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Sales Team", "Support"
    apiKey: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    phoneNumberId: { type: String, default: '' },
    businessAccountId: { type: String, default: '' },
    webhookVerifyToken: { type: String, default: '' },
    isEnabled: { type: Boolean, default: false }
}, { _id: true }); // Keep _id for identifying configs

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String
    },
    phone: {
        type: String
    },
    website: {
        type: String
    },
    // Users associated with this company
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // The owner/creator of the company
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // WhatsApp Integrations for this Company
    whatsappConfigs: [whatsappConfigSchema],
    products: [{
        type: String,
        trim: true
    }],
    settingsPassword: {
        type: String,
        default: 'Openthelock'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
