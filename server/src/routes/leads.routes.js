const express = require('express');
const { Lead } = require('../models');
const { auth, adminOnly } = require('../middleware');

const router = express.Router();

// @route   POST /api/leads/bulk
// @desc    Bulk create leads
// @access  Private/Admin
router.post('/bulk', auth, adminOnly, async (req, res) => {
    try {
        const { leads } = req.body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of leads'
            });
        }

        const createdLeads = await Lead.insertMany(leads);

        res.json({
            success: true,
            data: createdLeads,
            count: createdLeads.length
        });
    } catch (error) {
        console.error('Bulk lead create error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error processing leads'
        });
    }
});

// @route   POST /api/leads
// @desc    Create a single lead
// @access  Private/Admin
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, phone, email, source, notes, priority, value } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name and phone are required'
            });
        }

        const lead = await Lead.create({
            name,
            phone,
            email,
            source: source || 'manual',
            notes,
            priority,
            value,
            stage: 'new',
            status: 'new',
            uploadDate: new Date()
        });

        res.status(201).json({
            success: true,
            data: lead
        });
    } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating lead'
        });
    }
});

// @route   GET /api/leads
// @desc    Get leads filtered by date
// @access  Private/Admin
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const { date, page = 1, limit = 50, search } = req.query;

        const query = {};

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.uploadDate = { $gte: startOfDay, $lte: endOfDay };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const leads = await Lead.find(query)
            .sort({ uploadDate: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('assignedTo', 'name email');

        const total = await Lead.countDocuments(query);

        res.json({
            success: true,
            data: leads,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching leads'
        });
    }
});

// @route   GET /api/leads/kanban
// @desc    Get leads grouped by stage for Kanban board
// @access  Private/Admin
router.get('/kanban', auth, adminOnly, async (req, res) => {
    try {
        const stages = ['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost'];

        const result = await Promise.all(
            stages.map(async (stage) => {
                const leads = await Lead.find({ stage })
                    .sort({ stageOrder: 1, updatedAt: -1 })
                    .populate('assignedTo', 'name email');
                return {
                    id: stage,
                    name: stage.charAt(0).toUpperCase() + stage.slice(1),
                    leads
                };
            })
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get kanban error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/leads/:id/stage
// @desc    Move lead to different stage (drag-drop)
// @access  Private/Admin
router.put('/:id/stage', auth, adminOnly, async (req, res) => {
    try {
        const { stage, stageOrder } = req.body;

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            {
                stage,
                stageOrder: stageOrder || 0
            },
            { new: true }
        );

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Update stage error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/leads/:id
// @desc    Get single lead by ID
// @access  Private/Admin
router.get('/:id', auth, adminOnly, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assignedTo', 'name email');

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/leads/:id
// @desc    Update lead
// @access  Private/Admin
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { name, phone, email, stage, status, notes, priority, value } = req.body;

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { name, phone, email, stage, status, notes, priority, value },
            { new: true }
        );

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/leads/:id
// @desc    Delete lead
// @access  Private/Admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/leads/:id/comment
// @desc    Add comment to lead
// @access  Private
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const { content } = req.body;

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    commentHistory: {
                        content,
                        createdBy: req.user._id,
                        timestamp: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
