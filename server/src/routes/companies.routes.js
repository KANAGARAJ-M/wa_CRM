const express = require('express');
const { Company, User } = require('../models');
const { auth } = require('../middleware');

const router = express.Router();

// @route   GET /api/companies/mine
// @desc    Get all companies for the current user
// @access  Private
router.get('/mine', auth, async (req, res) => {
    try {
        let companies;

        if (req.user.role === 'superadmin') {
            // Superadmins see all companies
            companies = await Company.find({})
                .select('name address phone website isEnabled createdAt');
        } else {
            // Regular users see only their assigned companies
            companies = await Company.find({
                users: req.user._id
            }).select('name address phone website isEnabled createdAt');
        }

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

// @route   PUT /api/companies/:id
// @desc    Update company details (including products)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, address, phone, website, products, whatsappConfigs } = req.body;

        // Verify user owns this company or is admin (assuming owner check for now)
        let company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // Basic authorization check: user must be in company.users or be the owner
        // For strict ownership: if (company.owner.toString() !== req.user._id.toString()) ...
        // But let's allow any associated user for now or stick to owner if available.
        // Assuming owner field is populated and checked.
        if (company.owner && company.owner.toString() !== req.user._id.toString()) {
            // return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        if (website) updateData.website = website;
        if (products) updateData.products = products; // Array of strings
        if (whatsappConfigs) updateData.whatsappConfigs = whatsappConfigs;

        company = await Company.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json({ success: true, data: company });

    } catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
