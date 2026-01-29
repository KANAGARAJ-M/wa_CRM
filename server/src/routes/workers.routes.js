const express = require('express');
const { User, Role, Company } = require('../models');
const { auth, adminOnly } = require('../middleware');
const router = express.Router();

// @route   GET /api/workers
// @desc    Get all workers for the company
// @access  Private/Admin/Agent
router.get('/', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        // Permission Check
        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];
        const canManageWorkers = isAdmin || permissions.includes('manage_workers');

        if (!canManageWorkers) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const workers = await User.find({
            companies: req.companyId
        }).select('-password').populate('customRole', 'name');

        res.json({ success: true, data: workers });
    } catch (error) {
        console.error('Get workers error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/workers
// @desc    Create a new worker
// @access  Private/Admin/Agent
router.post('/', auth, async (req, res) => {
    try {
        // Permission Check
        const currentUser = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(currentUser.role);
        const permissions = currentUser.customRole?.permissions || [];
        const canManageWorkers = isAdmin || permissions.includes('manage_workers');

        if (!canManageWorkers) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { name, email, password, roleId, companyId } = req.body;

        // If roleId is provided, derive the company from the role
        let targetCompanyId = companyId || req.companyId;

        if (roleId) {
            const role = await Role.findById(roleId);
            if (role && role.company) {
                targetCompanyId = role.company.toString();
            }
        }

        if (!targetCompanyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        console.log('Create worker body:', req.body);

        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // If user exists, check if they are already in this company
            if (user.companies.some(c => c.toString() === targetCompanyId.toString())) {
                // If roleId is provided, update the role
                if (roleId) {
                    user.customRole = roleId;
                    await user.save();
                    return res.status(200).json({ success: true, data: user.toJSON(), message: 'User role updated' });
                }
                return res.status(400).json({ success: false, message: 'User already in this company' });
            }

            // Add company to user
            user.companies.push(targetCompanyId);

            if (roleId) {
                user.customRole = roleId;
            }

            await user.save();

            // Also add user to company's users array
            await Company.findByIdAndUpdate(targetCompanyId, {
                $addToSet: { users: user._id }
            });

            return res.status(200).json({ success: true, data: user.toJSON() });
        }

        const userData = {
            name,
            email,
            password,
            role: 'worker',
            companies: [targetCompanyId]
        };

        if (roleId) {
            userData.customRole = roleId;
        }

        user = await User.create(userData);

        // Add user to company's users array
        await Company.findByIdAndUpdate(targetCompanyId, {
            $addToSet: { users: user._id }
        });

        res.status(201).json({ success: true, data: user.toJSON() });
    } catch (error) {
        console.error('Create worker error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/workers/:id
// @desc    Delete a worker
// @access  Private/Admin/Agent
router.delete('/:id', auth, async (req, res) => {
    try {
        // Permission Check
        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];
        const canManageWorkers = isAdmin || permissions.includes('manage_workers');

        if (!canManageWorkers) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        await User.findOneAndDelete({
            _id: req.params.id,
            role: 'worker',
            companies: req.companyId
        });
        res.json({ success: true, message: 'Worker deleted' });
    } catch (error) {
        console.error('Delete worker error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
