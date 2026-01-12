const express = require('express');
const { Company, User } = require('../models');
const { auth } = require('../middleware');

const router = express.Router();

// @route   GET /api/companies/mine
// @desc    Get all companies for the current user
// @access  Private
router.get('/mine', auth, async (req, res) => {
    try {
        // Find companies where user is in the users array
        // We can also use User.populate('companies') but this is direct
        const companies = await Company.find({
            users: req.user._id
        }).select('name address phone website isEnabled createdAt');

        res.json({ success: true, data: companies });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/companies
// @desc    Create a new company
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name, address, phone, website } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Company name is required' });
        }

        // Create Company
        const company = await Company.create({
            name,
            address,
            phone,
            website,
            owner: req.user._id,
            users: [req.user._id],
            whatsappConfigs: [] // Empty start
        });

        // Add company to user's list
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { companies: company._id }
        });

        res.status(201).json({ success: true, data: company });
    } catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
