const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    whatsappConfigs: [{
        name: { type: String, required: true }, // e.g., "Sales Team", "Support"
        apiKey: { type: String, default: '' },
        accessToken: { type: String, default: '' },
        phoneNumberId: { type: String, default: '' },
        businessAccountId: { type: String, default: '' },
        webhookVerifyToken: { type: String, default: '' },
        isEnabled: { type: Boolean, default: false }
    }]
}, {
    timestamps: true
});

// Only one settings document should exist
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
