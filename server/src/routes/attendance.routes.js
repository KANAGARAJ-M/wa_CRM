const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth.middleware');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Check In
router.post('/check-in', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if already checked in
        const existingAttendance = await Attendance.findOne({
            agent: userId,
            status: 'CHECKED_IN'
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Already checked in' });
        }

        const attendance = new Attendance({
            agent: userId,
            checkInTime: new Date(),
            status: 'CHECKED_IN'
        });

        await attendance.save();

        res.status(201).json(attendance);
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Check Out
router.post('/check-out', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { callLogs } = req.body;

        const attendance = await Attendance.findOne({
            agent: userId,
            status: 'CHECKED_IN'
        });

        if (!attendance) {
            return res.status(400).json({ message: 'Not checked in' });
        }

        attendance.checkOutTime = new Date();
        attendance.status = 'CHECKED_OUT';
        if (callLogs && Array.isArray(callLogs)) {
            attendance.callLogs = callLogs;
        }

        await attendance.save();

        res.json(attendance);
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Current Status
router.get('/status', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const attendance = await Attendance.findOne({
            agent: userId,
            status: 'CHECKED_IN'
        });

        if (attendance) {
            res.json({ status: 'CHECKED_IN', data: attendance });
        } else {
            res.json({ status: 'CHECKED_OUT' });
        }
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get All Attendance (Admin)
router.get('/all', auth, async (req, res) => {
    try {
        // Optional: Add role check here if needed
        // if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') { ... }

        const { date } = req.query;
        let query = {};

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.checkInTime = { $gte: start, $lte: end };
        }

        const records = await Attendance.find(query)
            .populate('agent', 'name email role')
            .sort({ checkInTime: -1 });

        res.json(records);
    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get detailed logs with check-in/checkout and call info (Admin)
router.get('/detailed-logs', auth, async (req, res) => {
    try {
        const { date, agentId, startDate, endDate } = req.query;
        let query = {};

        if (agentId) {
            query.agent = agentId;
        }

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.checkInTime = { $gte: start, $lte: end };
        } else if (startDate || endDate) {
            query.checkInTime = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                query.checkInTime.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.checkInTime.$lte = end;
            }
        }

        const records = await Attendance.find(query)
            .populate('agent', 'name email role')
            .sort({ checkInTime: -1 });

        // Process records to summarize call logs
        const processedRecords = records.map(record => {
            const callLogs = record.callLogs || [];

            // Categorize calls
            const incomingCalls = callLogs.filter(c => c.type === 'INCOMING');
            const outgoingCalls = callLogs.filter(c => c.type === 'OUTGOING');
            const missedCalls = callLogs.filter(c => c.type === 'MISSED');

            // Calculate durations
            const totalIncomingDuration = incomingCalls.reduce((acc, c) => acc + (c.duration || 0), 0);
            const totalOutgoingDuration = outgoingCalls.reduce((acc, c) => acc + (c.duration || 0), 0);
            const totalDuration = totalIncomingDuration + totalOutgoingDuration;

            // Calculate session duration
            let sessionDuration = 0;
            if (record.checkInTime && record.checkOutTime) {
                sessionDuration = Math.floor((new Date(record.checkOutTime) - new Date(record.checkInTime)) / 1000);
            }

            return {
                _id: record._id,
                agent: record.agent,
                checkInTime: record.checkInTime,
                checkOutTime: record.checkOutTime,
                status: record.status,
                sessionDuration,
                callSummary: {
                    totalCalls: callLogs.length,
                    incomingCount: incomingCalls.length,
                    outgoingCount: outgoingCalls.length,
                    missedCount: missedCalls.length,
                    totalIncomingDuration,
                    totalOutgoingDuration,
                    totalDuration
                },
                callLogs: callLogs.map(c => ({
                    number: c.number,
                    name: c.name,
                    type: c.type,
                    date: c.date,
                    duration: c.duration,
                    simDisplayName: c.simDisplayName
                }))
            };
        });

        res.json({ success: true, data: processedRecords });
    } catch (error) {
        console.error('Get detailed logs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
