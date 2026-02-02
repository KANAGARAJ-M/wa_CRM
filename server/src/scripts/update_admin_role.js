const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Role } = require('../models');

const ALL_PERMISSIONS = [
    'manage_workers',
    'assign_leads',
    'view_all_leads',
    'view_own_leads',
    'manage_roles',
    'view_analytics',
    'manage_settings',
    'export_data',
    'delete_leads',
    'create_company',
    'import_leads',
    'export_leads'
];

const updateAdminRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const role = await Role.findOne({ name: 'admin' });
        if (!role) {
            console.log('Role "admin" not found.');
            return;
        }

        console.log('Found role:', role.name);
        console.log('Current permissions:', role.permissions);

        // Update permissions
        role.permissions = ALL_PERMISSIONS;
        role.description = 'Full Administrator Access';

        await role.save();

        console.log('Updated permissions:', role.permissions);
        console.log('Admin role updated successfully.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

updateAdminRole();
