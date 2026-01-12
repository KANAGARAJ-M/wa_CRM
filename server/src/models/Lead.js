const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    // Pipeline stage for Kanban
    stage: {
        type: String,
        enum: ['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost'],
        default: 'new'
    },
    stageOrder: {
        type: Number,
        default: 0
    },
    // Legacy status (keep for compatibility)
    status: {
        type: String,
        enum: ['new', 'contacted', 'interested', 'converted', 'closed', 'follow-up', 'not-interested'],
        default: 'new'
    },
    source: {
        type: String,
        default: 'manual'
    },
    notes: {
        type: String
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Notes/Comments timeline
    commentHistory: [{
        timestamp: { type: Date, default: Date.now },
        content: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    // Lead value/score
    value: {
        type: Number,
        default: 0
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Index for faster querying
leadSchema.index({ uploadDate: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ stage: 1, stageOrder: 1 });
leadSchema.index({ assignedTo: 1, stage: 1 });

module.exports = mongoose.model('Lead', leadSchema);
