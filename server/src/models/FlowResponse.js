const mongoose = require('mongoose');

const flowResponseSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    phoneNumberId: {
        type: String,
        required: true,
        index: true
    },
    flowId: {
        type: String,
        required: true,
        index: true
    },
    flowToken: {
        type: String   // Token sent when launching the flow, can be used to track context
    },
    from: {
        type: String,  // Customer's phone number
        required: true,
        index: true
    },
    fromName: {
        type: String
    },
    // The actual response data from the flow
    responseData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    // Parsed/structured version of response
    parsedFields: [{
        fieldName: String,
        fieldValue: mongoose.Schema.Types.Mixed,
        fieldType: String
    }],
    status: {
        type: String,
        enum: ['draft', 'in_progress', 'completed', 'error'],
        default: 'completed'
    },
    // Link to related product if applicable
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    // Link to lead if found
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    },
    // Original webhook message ID
    messageId: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

// Index for quick lookup
flowResponseSchema.index({ companyId: 1, createdAt: -1 });
flowResponseSchema.index({ companyId: 1, flowId: 1 });

module.exports = mongoose.model('FlowResponse', flowResponseSchema);
