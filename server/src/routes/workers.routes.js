const express = require('express');
const { User } = require('../models');
const { auth, adminOnly } = require('../middleware');
const router = express.Router();

// @route   GET /api/workers
// @desc    Get all workers for the company
// @access  Private/Admin
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const workers = await User.find({
            role: 'worker',
            companies: req.companyId
        }).select('-password');

        res.json({ success: true, data: workers });
    } catch (error) {
        console.error('Get workers error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/workers
// @desc    Create a new worker
// @access  Private/Admin
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        user = await User.create({
            name,
            email,
            password,
            role: 'worker',
            companies: [req.companyId]
        });

        res.status(201).json({ success: true, data: user.toJSON() });
    } catch (error) {
        console.error('Create worker error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/workers/:id
// @desc    Delete a worker
// @access  Private/Admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
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
