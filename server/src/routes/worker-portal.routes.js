const express = require('express');
const { Lead, Call, WhatsAppMessage } = require('../models');
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

// @route   GET /api/worker/calls
// @desc    Get calls made by current worker
// @access  Private (Worker)
router.get('/calls', auth, async (req, res) => {
    try {
        const { leadId, limit = 50 } = req.query;
        
        const query = { workerId: req.user._id };
        if (leadId) query.leadId = leadId;

        const calls = await Call.find(query)
            .populate('leadId', 'name phone email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, data: calls });
    } catch (error) {
        console.error('Get worker calls error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/worker/calls
// @desc    Log a call by worker
// @access  Private (Worker)
router.post('/calls', auth, async (req, res) => {
    try {
        const {
            leadId,
            phoneNumber,
            leadName,
            status,
            outcome,
            duration,
            notes,
            followUpDate,
            followUpNotes,
            priority
        } = req.body;

        // Verify lead is assigned to worker (if leadId provided)
        let companyId;
        if (leadId) {
            const lead = await Lead.findOne({
                _id: leadId,
                assignedTo: req.user._id
            });

            if (!lead) {
                return res.status(403).json({ success: false, message: 'Lead not assigned to you' });
            }
            companyId = lead.companyId;
        }

        const call = new Call({
            leadId,
            workerId: req.user._id,
            companyId,
            phoneNumber,
            leadName,
            status: status || 'completed',
            outcome: outcome || 'other',
            duration: duration || 0,
            notes,
            followUpDate,
            followUpNotes,
            priority,
            callStartTime: new Date(Date.now() - (duration || 0) * 1000),
            callEndTime: new Date()
        });

        await call.save();

        // Update lead's last interaction
        if (leadId) {
            await Lead.findByIdAndUpdate(leadId, {
                lastInteraction: new Date(),
                $push: {
                    commentHistory: {
                        content: `Call logged: ${status} - ${outcome}${notes ? ` - ${notes}` : ''}`,
                        createdBy: req.user._id
                    }
                }
            });
        }

        res.status(201).json({ success: true, data: call });
    } catch (error) {
        console.error('Create worker call error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/worker/follow-ups
// @desc    Get pending follow-ups for worker
// @access  Private (Worker)
router.get('/follow-ups', auth, async (req, res) => {
    try {
        const followUps = await Call.find({
            workerId: req.user._id,
            followUpDate: { $exists: true, $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
            status: { $nin: ['converted', 'not-interested'] }
        })
            .populate('leadId', 'name phone email')
            .sort({ followUpDate: 1 });

        res.json({ success: true, data: followUps });
    } catch (error) {
        console.error('Get worker follow-ups error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/worker/stats
// @desc    Get worker's call statistics
// @access  Private (Worker)
router.get('/stats', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalCalls = await Call.countDocuments({ workerId: req.user._id });
        const todayCalls = await Call.countDocuments({
            workerId: req.user._id,
            createdAt: { $gte: today }
        });
        const totalLeads = await Lead.countDocuments({ assignedTo: req.user._id });
        const conversions = await Call.countDocuments({
            workerId: req.user._id,
            outcome: 'converted'
        });

        res.json({
            success: true,
            data: {
                totalCalls,
                todayCalls,
                totalLeads,
                conversions,
                conversionRate: totalCalls > 0 ? ((conversions / totalCalls) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        console.error('Get worker stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
