const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    data: {
        type: Map,
        of: mongoose.Schema.Types.Mixed // Flexible to store various field types
    },
    submittedBy: { // If submitted by a known lead/user
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    },
    submitterIdentifier: { // Phone or email if anonymous but captured
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
