const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { auth } = require('../middleware/auth.middleware');

// Middleware to check if user is admin (or has permission to manage roles)
const checkRolePermission = async (req, res, next) => {
    const user = req.user;
    const isAdmin = ['admin', 'superadmin'].includes(user.role);
    const permissions = user.customRole?.permissions || [];
    const canManageRoles = isAdmin || permissions.includes('manage_roles');

    if (!canManageRoles) {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

const User = require('../models/User');

// Get all roles for the current company
router.get('/', auth, checkRolePermission, async (req, res) => {
    try {
        const companyId = req.companyId;

        if (!companyId) {
            return res.status(400).json({ message: 'Company context required' });
        }

        const roles = await Role.find({ company: companyId }).lean();
        console.log(`Fetching roles for company: ${companyId}. Found ${roles.length} roles.`);

        const rolesWithCounts = await Promise.all(roles.map(async (role) => {
            const userCount = await User.countDocuments({
                customRole: role._id,
                companies: role.company
            });
            console.log(`Role ${role.name} (${role._id}): ${userCount} users`);
            return { ...role, userCount };
        }));

        res.json({ data: rolesWithCounts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get users for a specific role
router.get('/:id/users', auth, checkRolePermission, async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        const users = await User.find({
            customRole: role._id,
            companies: role.company
        }).select('-password');

        res.json({ data: users });
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
