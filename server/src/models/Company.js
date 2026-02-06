const mongoose = require('mongoose');

const whatsappConfigSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Sales Team", "Support"
    apiKey: { type: String, default: '' },
    phoneNumber: { type: String, default: '' }, // Added display Phone Number
    accessToken: { type: String, default: '' },
    phoneNumberId: { type: String, default: '' },
    businessAccountId: { type: String, default: '' },
    webhookVerifyToken: { type: String, default: '' },
    isEnabled: { type: Boolean, default: false },
    // Per-account Catalog Override
    catalogId: { type: String, default: '' },
    catalogAccessToken: { type: String, default: '' }
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
    },
    metaCatalogConfig: {
        catalogId: { type: String, default: '' },
        accessToken: { type: String, default: '' }
    },
    autoReplyConfig: {
        enabled: { type: Boolean, default: false },
        message: { type: String, default: '' }
    },
    // Dynamic Keyword Rules
    autoReplyRules: [{
        keyword: { type: String, required: true, trim: true },
        matchType: { type: String, enum: ['exact', 'contains'], default: 'contains' },
        responseType: { type: String, enum: ['text', 'product', 'all_products_prices', 'flow'], required: true },
        responseText: { type: String },
        linkedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        flowId: { type: String }
    }],
    paymentConfig: {
        provider: { type: String, default: 'manual' }, // stripe, manual, etc.
        enabled: { type: Boolean, default: false },
        details: { type: Object, default: {} } // For storing keys or instructions
    },
    clientFormConfig: {
        enabled: { type: Boolean, default: false },
        formLink: { type: String, default: '' }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
