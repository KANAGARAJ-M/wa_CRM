const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    fields: [{
        label: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['text', 'number', 'email', 'textarea', 'select', 'checkbox', 'date'],
            required: true
        },
        placeholder: String,
        required: {
            type: Boolean,
            default: false
        },
        options: [String] // For select/checkbox type
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Form', formSchema);
