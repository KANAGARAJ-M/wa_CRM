const express = require('express');
const mongoose = require('mongoose');
const { Call, Lead, User } = require('../models');
const { auth, companyAuth } = require('../middleware');
const router = express.Router();

// @route   GET /api/calls
// @desc    Get all calls for the company (admin)
// @access  Private (Admin)
router.get('/', auth, companyAuth, async (req, res) => {
    try {
        const { status, outcome, workerId, leadId, startDate, endDate, limit = 100 } = req.query;

        const query = { companyId: req.companyId };

        if (status) query.status = status;
        if (outcome) query.outcome = outcome;
        if (workerId) query.workerId = workerId;
        if (leadId) query.leadId = leadId;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const calls = await Call.find(query)
            .populate('leadId', 'name phone email stage')
            .populate('workerId', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, data: calls });
    } catch (error) {
        console.error('Get calls error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/calls/analytics
// @desc    Get call analytics summary
// @access  Private (Admin)
router.get('/analytics', auth, companyAuth, async (req, res) => {
    try {
        const { startDate, endDate, workerId } = req.query;

        const matchQuery = {
            companyId: new mongoose.Types.ObjectId(req.companyId)
        };

        if (workerId) {
            matchQuery.workerId = new mongoose.Types.ObjectId(workerId);
        }

        if (startDate || endDate) {
            matchQuery.createdAt = {};
            if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
            if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
        }

        console.log('Analytics Match Query:', JSON.stringify(matchQuery));

        // Get overall stats
        const totalCalls = await Call.countDocuments(matchQuery);

        // Status breakdown
        const statusStats = await Call.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Outcome breakdown
        const outcomeStats = await Call.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$outcome', count: { $sum: 1 } } }
        ]);

        // Worker performance
        const workerStats = await Call.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$workerId',
                    totalCalls: { $sum: 1 },
                    completedCalls: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    totalDuration: { $sum: '$duration' },
                    conversions: {
                        $sum: { $cond: [{ $eq: ['$outcome', 'converted'] }, 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'worker'
                }
            },
            { $unwind: '$worker' },
            {
                $project: {
                    workerId: '$_id',
                    workerName: '$worker.name',
                    workerEmail: '$worker.email',
                    totalCalls: 1,
                    completedCalls: 1,
                    avgDuration: { $divide: ['$totalDuration', { $max: ['$totalCalls', 1] }] },
                    conversions: 1,
                    conversionRate: {
                        $multiply: [
                            { $divide: ['$conversions', { $max: ['$totalCalls', 1] }] },
                            100
                        ]
                    }
                }
            }
        ]);

        // Daily call trend (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyTrend = await Call.aggregate([
            {
                $match: {
                    ...matchQuery,
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    completedCalls: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Pending follow-ups
        const pendingFollowUps = await Call.countDocuments({
            ...matchQuery,
            followUpDate: { $lte: new Date() },
            status: { $nin: ['converted', 'not-interested'] }
        });

        res.json({
            success: true,
            data: {
                totalCalls,
                statusBreakdown: statusStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
                outcomeBreakdown: outcomeStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
                workerPerformance: workerStats,
                dailyTrend,
                pendingFollowUps
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/calls
// @desc    Log a new call
// @access  Private (Worker/Admin)
router.post('/', auth, async (req, res) => {
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
            location,
            businessDetails,
            orderStatus
        } = req.body;

        // Get companyId from lead or header
        let companyId = req.companyId;

        if (leadId) {
            const lead = await Lead.findById(leadId);
            if (lead) {
                companyId = lead.companyId;
            }
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
            location,
            businessDetails,
            orderStatus,
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
        console.error('Create call error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/calls/:id
// @desc    Update a call record
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { status, outcome, notes, followUpDate, followUpNotes, priority } = req.body;

        const call = await Call.findByIdAndUpdate(
            req.params.id,
            { status, outcome, notes, followUpDate, followUpNotes, priority },
            { new: true }
        ).populate('leadId', 'name phone')
            .populate('workerId', 'name email');

        if (!call) {
            return res.status(404).json({ success: false, message: 'Call not found' });
        }

        res.json({ success: true, data: call });
    } catch (error) {
        console.error('Update call error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/calls/follow-ups
// @desc    Get pending follow-ups
// @access  Private
router.get('/follow-ups', auth, companyAuth, async (req, res) => {
    try {
        const { workerId } = req.query;

        const query = {
            companyId: req.companyId,
            followUpDate: { $exists: true, $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Due within 24 hours
            status: { $nin: ['converted', 'not-interested'] }
        };

        if (workerId) query.workerId = workerId;

        const followUps = await Call.find(query)
            .populate('leadId', 'name phone email')
            .populate('workerId', 'name')
            .sort({ followUpDate: 1 });

        res.json({ success: true, data: followUps });
    } catch (error) {
        console.error('Get follow-ups error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
