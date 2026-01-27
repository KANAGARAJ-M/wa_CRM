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
            $or: [
                { assignedTo: req.user._id },
                { 'assignedAgents.agentId': req.user._id }
            ]
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

        // Normalize phone for matching: remove non-digits and leading zeros
        const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');

        let query;
        if (cleanPhone.length >= 7) {
            // If we have a decent length number, match as suffix
            const regex = new RegExp(cleanPhone + '$');
            query = {
                $or: [
                    { from: regex },
                    { to: regex },
                    { from: phone }, // Keep exact match as backup
                    { to: phone }
                ]
            };
        } else {
            // Fallback to exact match for short numbers
            query = {
                $or: [
                    { from: phone },
                    { to: phone }
                ]
            };
        }

        const messages = await WhatsAppMessage.find(query).sort({ timestamp: 1 });

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

        let query = {};
        if (leadId) {
            // Verify lead is assigned to this worker
            const lead = await Lead.findOne({
                _id: leadId,
                $or: [
                    { assignedTo: req.user._id },
                    { 'assignedAgents.agentId': req.user._id }
                ]
            });

            if (!lead) {
                return res.status(403).json({ success: false, message: 'Access denied to this lead history' });
            }

            // If viewing a specific lead, show all calls for that lead (history)
            query.leadId = leadId;
        } else {
            // Otherwise show only this worker's calls
            query.workerId = req.user._id;
        }

        const calls = await Call.find(query)
            .populate('leadId', 'name phone email')
            .populate('workerId', 'name')
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
            priority,
            product,
            location,
            businessDetails,
            orderStatus
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

        // Fallback to user's company if not found from lead (e.g. manual call or lead missing company)
        if (!companyId && req.companyId) {
            companyId = req.companyId;
        } else if (!companyId && req.user.companies && req.user.companies.length > 0) {
            companyId = req.user.companies[0];
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
            product,
            location,
            businessDetails,
            orderStatus,
            callStartTime: new Date(Date.now() - (duration || 0) * 1000),
            callEndTime: new Date()
        });

        await call.save();

        // Update lead's last interaction and status based on call outcome
        if (leadId) {
            const updateData = {
                lastInteraction: new Date(),
                $push: {
                    commentHistory: {
                        content: `Call logged: ${status} - ${outcome}${notes ? ` - ${notes}` : ''}`,
                        createdBy: req.user._id
                    }
                }
            };

            // Map Call Outcome to Lead Status/Stage
            if (outcome === 'interested') {
                updateData.status = 'interested';
                updateData.stage = 'interested';
            } else if (outcome === 'converted') {
                updateData.status = 'converted';
                updateData.stage = 'converted';
            } else if (outcome === 'not-interested') {
                updateData.status = 'not-interested';
                updateData.stage = 'lost';
            } else if (outcome === 'follow-up') {
                updateData.status = 'follow-up';
                // Keep current stage or move to contacted? Let's keep stage but update status
            } else if (outcome === 'contacted') {
                updateData.status = 'contacted';
                updateData.stage = 'contacted';
            } else if (outcome === 'wrong-number' || outcome === 'not-reachable') {
                // Maybe don't change stage, just status?
                // updateData.status = 'follow-up'; 
            }

            await Lead.findByIdAndUpdate(leadId, updateData);
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
