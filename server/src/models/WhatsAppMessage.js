const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema({
    phoneNumberId: {
        type: String,
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true
    },
    from: {
        type: String,
        required: true
    },
    fromName: {
        type: String
    },
    type: {
        type: String,
        enum: ['text', 'image', 'document', 'audio', 'video', 'sticker', 'location', 'contacts', 'unknown'],
        default: 'text'
    },
    body: {
        type: String // For text messages
    },
    mediaUrl: {
        type: String // For media messages
    },
    mediaId: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    messageId: {
        type: String,
        unique: true
    },
    direction: {
        type: String,
        enum: ['incoming', 'outgoing'],
        default: 'incoming'
    },
    to: {
        type: String
    },
    status: {
        type: String,
        // Incoming: received, read, replied
        // Outgoing: pending, sent, delivered, read, failed
        enum: ['received', 'read', 'replied', 'pending', 'sent', 'delivered', 'failed'],
        default: 'received'
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('WhatsAppMessage', whatsappMessageSchema);
