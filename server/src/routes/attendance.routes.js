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

module.exports = router;
