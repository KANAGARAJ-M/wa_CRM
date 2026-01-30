import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const AgentStatus = () => {
    const { token } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedRow, setExpandedRow] = useState(null);

    useEffect(() => {
        fetchAttendance();
    }, [selectedDate]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/attendance/all?date=${selectedDate}`);
            setAttendance(response.data);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };


    const toggleRow = (id) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    const getDuration = (start, end) => {
        if (!end) return 'Active';
        const diff = new Date(end) - new Date(start);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Agent Status & Attendance</h1>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-600">Agent</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Check In</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Check Out</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Duration</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Call Logs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        Loading attendance data...
                                    </td>
                                </tr>
                            ) : attendance.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No attendance records found for this date.
                                    </td>
                                </tr>
                            ) : (
                                attendance.map((record) => (
                                    <React.Fragment key={record._id}>
                                        <tr className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold mr-3">
                                                        {record.agent?.name?.[0] || 'A'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{record.agent?.name || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-500">{record.agent?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {format(new Date(record.checkInTime), 'h:mm a')}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {record.checkOutTime ? format(new Date(record.checkOutTime), 'h:mm a') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {getDuration(record.checkInTime, record.checkOutTime)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.status === 'CHECKED_IN'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {record.status === 'CHECKED_IN' ? 'Active' : 'Completed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {record.callLogs && record.callLogs.length > 0 && (
                                                    <button
                                                        onClick={() => toggleRow(record._id)}
                                                        className="text-green-600 hover:text-green-700 font-medium text-sm"
                                                    >
                                                        {expandedRow === record._id ? 'Hide Logs' : `View ${record.callLogs.length} Logs`}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedRow === record._id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan="6" className="px-6 py-4">
                                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="bg-gray-100 border-b border-gray-200">
                                                                    <th className="px-4 py-2 text-gray-600">Type</th>
                                                                    <th className="px-4 py-2 text-gray-600">Number</th>
                                                                    <th className="px-4 py-2 text-gray-600">Name</th>
                                                                    <th className="px-4 py-2 text-gray-600">Time</th>
                                                                    <th className="px-4 py-2 text-gray-600">Duration</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {record.callLogs.map((log, idx) => (
                                                                    <tr key={idx}>
                                                                        <td className="px-4 py-2">
                                                                            <span className={`text-xs font-bold ${log.type === 'INCOMING' ? 'text-blue-600' :
                                                                                log.type === 'OUTGOING' ? 'text-green-600' : 'text-red-600'
                                                                                }`}>
                                                                                {log.type}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-gray-700">{log.number}</td>
                                                                        <td className="px-4 py-2 text-gray-700">{log.name || '-'}</td>
                                                                        <td className="px-4 py-2 text-gray-500">
                                                                            {log.date ? format(new Date(log.date), 'h:mm a') : '-'}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-gray-500">{log.duration}s</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AgentStatus;
