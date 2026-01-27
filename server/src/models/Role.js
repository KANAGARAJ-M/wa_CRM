const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    permissions: [{
        type: String,
        enum: [
            'manage_workers',
            'assign_leads',
            'view_all_leads',
            'view_own_leads',
            'manage_roles',
            'view_analytics',
            'manage_settings',
            'export_data',
            'delete_leads'
        ]
    }],
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    isSystem: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index to ensure role names are unique per company
roleSchema.index({ name: 1, company: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
