const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true
    },
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    // Call details
    phoneNumber: {
        type: String,
        required: true
    },
    leadName: {
        type: String
    },
    // Call status
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'missed', 'no-answer', 'busy', 'callback-requested', 'not-interested', 'converted'],
        default: 'completed'
    },
    // Call outcome
    outcome: {
        type: String,
        enum: ['contacted', 'interested', 'not-interested', 'follow-up', 'callback', 'converted', 'wrong-number', 'not-reachable', 'other'],
        default: 'other'
    },
    // Duration in seconds
    duration: {
        type: Number,
        default: 0
    },
    // Call notes
    notes: {
        type: String,
        trim: true
    },
    // Follow-up scheduling
    followUpDate: {
        type: Date
    },
    followUpNotes: {
        type: String
    },
    // Call direction (incoming, outgoing, missed)
    callDirection: {
        type: String,
        enum: ['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED'],
        default: 'OUTGOING'
    },
    // SIM card display name
    simDisplayName: {
        type: String,
        trim: true
    },
    // Call timestamps
    callStartTime: {
        type: Date,
        default: Date.now
    },
    callEndTime: {
        type: Date
    },
    // Priority for follow-up
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    product: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    businessDetails: {
        type: String,
        trim: true
    },
    orderStatus: {
        type: String,
        enum: ['not-ordered', 'ordered', 'already-ordered'],
        default: 'not-ordered'
    }
}, {
    timestamps: true
});

// Indexes for analytics queries
callSchema.index({ companyId: 1, createdAt: -1 });
callSchema.index({ workerId: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ outcome: 1 });
callSchema.index({ followUpDate: 1 });

module.exports = mongoose.model('Call', callSchema);
