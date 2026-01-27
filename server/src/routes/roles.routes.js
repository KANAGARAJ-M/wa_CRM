const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { auth } = require('../middleware/auth.middleware');

// Middleware to check if user is admin (or has permission to manage roles)
const checkRolePermission = async (req, res, next) => {
    // For now, only allow admins or superadmins to manage roles
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        // TODO: Check for 'manage_roles' permission in customRole
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

// Get all roles for the current company
router.get('/', auth, async (req, res) => {
    try {
        // Assuming req.user.companyId is set by auth middleware or we use the first company
        // For now, let's assume we pass companyId in query or header, or derive from user
        // In the current app context, users seem to have 'companies' array.
        // Let's assume the frontend sends 'x-company-id' header or we use the first one.

        const companyId = req.headers['x-company-id'] || req.user.companies[0];

        if (!companyId) {
            return res.status(400).json({ message: 'Company context required' });
        }

        const roles = await Role.find({ company: companyId });
        res.json({ data: roles });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new role
router.post('/', auth, checkRolePermission, async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'] || req.user.companies[0];

        const { name, description, permissions } = req.body;

        const role = new Role({
            name,
            description,
            permissions,
            company: companyId
        });

        await role.save();
        res.status(201).json({ data: role });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a role
router.put('/:id', auth, checkRolePermission, async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (role.isSystem) {
            return res.status(403).json({ message: 'Cannot modify system roles' });
        }

        role.name = name || role.name;
        role.description = description || role.description;
        role.permissions = permissions || role.permissions;

        await role.save();
        res.json({ data: role });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a role
router.delete('/:id', auth, checkRolePermission, async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (role.isSystem) {
            return res.status(403).json({ message: 'Cannot delete system roles' });
        }

        await role.deleteOne();
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
