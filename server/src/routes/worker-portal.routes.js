const express = require('express');
const { Lead } = require('../models');
const { auth } = require('../middleware');
const router = express.Router();

// @route   GET /api/worker/leads
// @desc    Get leads assigned to current worker
// @access  Private (Worker)
router.get('/leads', auth, async (req, res) => {
    try {
        const leads = await Lead.find({
            assignedTo: req.user._id
        }).sort({ updatedAt: -1 });

        res.json({ success: true, data: leads });
    } catch (error) {
        console.error('Get worker leads error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/worker/messages/:phone
// @desc    Get messages for a specific lead
// @access  Private (Worker)
router.get('/messages/:phone', auth, async (req, res) => {
    try {
        const { phone } = req.params;

        // Verify lead is assigned to worker
        const lead = await Lead.findOne({
            phone,
            assignedTo: req.user._id
        });

        if (!lead) {
            return res.status(403).json({ success: false, message: 'Lead not assigned to you' });
        }

        // Fetch messages
        // We need to import WhatsAppMessage model. 
        // Assuming it's exported from ../models
        const { WhatsAppMessage } = require('../models');

        const messages = await WhatsAppMessage.find({
            $or: [
                { from: phone },
                { to: phone }
            ]
        }).sort({ timestamp: 1 });

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Get worker messages error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
