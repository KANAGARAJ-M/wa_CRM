const express = require('express');
const { Form, FormSubmission, Lead } = require('../models');
const { auth } = require('../middleware');

const router = express.Router();

// @route   GET /api/forms
// @desc    Get all forms for the company
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const forms = await Form.find({ companyId: req.companyId })
            .sort({ createdAt: -1 });

        res.json({ success: true, data: forms });
    } catch (error) {
        console.error('Error fetching forms:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/forms/submissions/all
// @desc    Get ALL form submissions for the company
// @access  Private
router.get('/submissions/all', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const { page = 1, limit = 50, status } = req.query;

        const query = { companyId: req.companyId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const submissions = await FormSubmission.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('formId', 'title fields')
            .populate('submittedBy', 'name phone email');

        const total = await FormSubmission.countDocuments(query);

        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching all submissions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/forms/public/:id
// @desc    Get form definition (Public access for rendering)
// @access  Public
router.get('/public/:id', async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);

        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        if (!form.isPublished) { // Optional: strict check
            // allow preview if queried by creator? otherwise maybe block
            // For simplicity, we just return it, frontend can decide how to handle "Draft" mode
        }

        res.json({ success: true, data: form });
    } catch (error) {
        console.error('Error fetching public form:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/forms
// @desc    Create a new form
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const { title, description, fields } = req.body;

        const form = await Form.create({
            companyId: req.companyId,
            title,
            description,
            fields: fields || [],
            isPublished: false,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: form });
    } catch (error) {
        console.error('Error creating form:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/forms/:id
// @desc    Update a form
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const { title, description, fields, isPublished } = req.body;

        const form = await Form.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            { title, description, fields, isPublished },
            { new: true }
        );

        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        res.json({ success: true, data: form });
    } catch (error) {
        console.error('Error updating form:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/forms/:id
// @desc    Delete a form
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const form = await Form.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });

        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        // Also delete submissions? For now keep them or maybe delete
        await FormSubmission.deleteMany({ formId: req.params.id });

        res.json({ success: true, message: 'Form deleted' });
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/forms/:id/submit
// @desc    Submit data to a form (Public)
// @access  Public
router.post('/:id/submit', async (req, res) => {
    try {
        const { data, submitterInfo, status = 'completed', currentStep, totalSteps } = req.body;

        const form = await Form.findById(req.params.id);
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        // Optional: Try to link to a lead if phone exists
        let leadId = null;
        if (submitterInfo && (submitterInfo.phone || submitterInfo.email)) {
            const lead = await Lead.findOne({
                $or: [
                    { phone: submitterInfo.phone },
                    { email: submitterInfo.email }
                ].filter(Boolean),
                companyId: form.companyId
            });
            if (lead) leadId = lead._id;
        }

        const submission = await FormSubmission.create({
            formId: form._id,
            companyId: form.companyId,
            data,
            status,
            currentStep: currentStep || (form.fields?.length || 1),
            totalSteps: totalSteps || (form.fields?.length || 1),
            submittedBy: leadId,
            submitterIdentifier: submitterInfo?.phone || submitterInfo?.email || 'Anonymous',
            submitterName: submitterInfo?.name || data?.name || data?.Name || null
        });

        res.status(201).json({ success: true, message: 'Form submitted successfully', data: submission });
    } catch (error) {
        console.error('Error submitting form:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/forms/:id/submissions
// @desc    Get submissions for a form
// @access  Private
router.get('/:id/submissions', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        // Verify ownership
        const form = await Form.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        const submissions = await FormSubmission.find({ formId: req.params.id })
            .sort({ createdAt: -1 })
            .populate('submittedBy', 'name phone email');

        res.json({ success: true, data: submissions });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
