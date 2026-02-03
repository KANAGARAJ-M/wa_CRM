import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function PublicForm() {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // We need a separate axios instance or just use fully qualified URL if api/axios has interceptors
    // Assuming api/axios is strictly for protected routes, we'll use vanilla axios or fetch here.
    // Ideally we use an environment variable for API URL.
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const [formData, setFormData] = useState({});
    const [submitterInfo, setSubmitterInfo] = useState({ name: '', phone: '', email: '' });

    useEffect(() => {
        fetchForm();
    }, [id]);

    const fetchForm = async () => {
        try {
            const response = await axios.get(`${API_URL}/forms/public/${id}`);
            setForm(response.data.data);

            // Initialize form data
            const initialData = {};
            response.data.data.fields.forEach(field => {
                if (field.type === 'checkbox') initialData[field.label] = [];
                else initialData[field.label] = '';
            });
            setFormData(initialData);

        } catch (error) {
            console.error('Error loading form:', error);
            setError('Form not found or unavailable.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (label, value) => {
        setFormData(prev => ({
            ...prev,
            [label]: value
        }));
    };

    const handleCheckboxChange = (label, option, checked) => {
        setFormData(prev => {
            const current = Array.isArray(prev[label]) ? prev[label] : [];
            if (checked) {
                return { ...prev, [label]: [...current, option] };
            } else {
                return { ...prev, [label]: current.filter(item => item !== option) };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await axios.post(`${API_URL}/forms/${id}/submit`, {
                data: formData,
                submitterInfo
            });
            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting form:', error);
            setError('Failed to submit form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
        );
    }

    if (error && !form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-xl">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Unavailable</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
                    <p className="text-gray-600 mb-6">Your submission has been received successfully.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-green-600 font-medium hover:underline"
                    >
                        Submit another response
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-green-600 px-8 py-6 text-white text-center">
                        <h1 className="text-3xl font-bold mb-2">{form.title}</h1>
                        {form.description && (
                            <p className="text-green-100 opacity-90">{form.description}</p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-100 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        {/* Contact Info Section */}
                        <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                            <h3 className="font-semibold text-gray-700">Your Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={submitterInfo.name}
                                        onChange={e => setSubmitterInfo({ ...submitterInfo, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Phone (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        required
                                        value={submitterInfo.phone}
                                        onChange={e => setSubmitterInfo({ ...submitterInfo, phone: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                        placeholder="+1..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="email"
                                        value={submitterInfo.email}
                                        onChange={e => setSubmitterInfo({ ...submitterInfo, email: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100 my-6" />

                        {/* Dynamic Fields */}
                        <div className="space-y-6">
                            {form.fields.map((field, idx) => (
                                <div key={idx} className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-800">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>

                                    {field.type === 'textarea' ? (
                                        <textarea
                                            required={field.required}
                                            value={formData[field.label] || ''}
                                            onChange={e => handleInputChange(field.label, e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300 min-h-[100px]"
                                            placeholder={field.placeholder}
                                        />
                                    ) : field.type === 'select' ? (
                                        <select
                                            required={field.required}
                                            value={formData[field.label] || ''}
                                            onChange={e => handleInputChange(field.label, e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                        >
                                            <option value="">Select an option</option>
                                            {field.options?.map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : field.type === 'checkbox' ? (
                                        <div className="space-y-2 mt-2">
                                            {field.options?.map((opt, i) => (
                                                <label key={i} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData[field.label] || []).includes(opt)}
                                                        onChange={e => handleCheckboxChange(field.label, opt, e.target.checked)}
                                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-gray-700">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <input
                                            type={field.type}
                                            required={field.required}
                                            value={formData[field.label] || ''}
                                            onChange={e => handleInputChange(field.label, e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 border-gray-300"
                                            placeholder={field.placeholder}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-green-600 text-white font-bold text-lg py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting && <Loader2 className="animate-spin w-5 h-5" />}
                                Submit Form
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-4">
                                Securely powered by WhatsApp CRM
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
