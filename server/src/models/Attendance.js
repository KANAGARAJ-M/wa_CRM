const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true
    },
    name: String,
    type: String, // INCOMING, OUTGOING, MISSED
    date: Number, // Timestamp
    duration: Number, // Seconds
    simDisplayName: String
});

const attendanceSchema = new mongoose.Schema({
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    checkInTime: {
        type: Date,
        required: true
    },
    checkOutTime: {
        type: Date
    },
    callLogs: [callLogSchema],
    status: {
        type: String,
        enum: ['CHECKED_IN', 'CHECKED_OUT'],
        default: 'CHECKED_IN'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
