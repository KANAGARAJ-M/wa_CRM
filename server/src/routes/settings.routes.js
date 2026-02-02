const express = require('express');
const { Company } = require('../models');
const { auth, adminOnly } = require('../middleware');

const router = express.Router();

// @route   GET /api/settings
// @desc    Get all settings
// @access  Private/Admin
// @route   GET /api/settings
// @desc    Get all settings
// @access  Private/Admin/Agent
router.get('/', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        // Permission Check
        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];
        const canManageSettings = isAdmin || permissions.includes('manage_settings');

        if (!canManageSettings) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        res.json({ success: true, data: company });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/settings
// @desc    Update settings
// @access  Private/Admin
// @route   PUT /api/settings
// @desc    Update settings
// @access  Private/Admin/Agent
router.put('/', auth, async (req, res) => {
    try {
        // Permission Check
        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];
        const canManageSettings = isAdmin || permissions.includes('manage_settings');

        if (!canManageSettings) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const {
            whatsappConfigs, name, address, phone, website, products,
            metaCatalogConfig, autoReplyConfig, paymentConfig, clientFormConfig
        } = req.body;

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        if (whatsappConfigs !== undefined) company.whatsappConfigs = whatsappConfigs;
        if (name !== undefined) company.name = name;
        if (address !== undefined) company.address = address;
        if (phone !== undefined) company.phone = phone;
        if (website !== undefined) company.website = website;
        if (products !== undefined) company.products = products;

        if (metaCatalogConfig !== undefined) company.metaCatalogConfig = metaCatalogConfig;
        if (autoReplyConfig !== undefined) company.autoReplyConfig = autoReplyConfig;
        if (paymentConfig !== undefined) company.paymentConfig = paymentConfig;
        if (clientFormConfig !== undefined) company.clientFormConfig = clientFormConfig;

        await company.save();

        res.json({ success: true, data: company });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/settings/whatsapp-config
// @desc    Add new WhatsApp configuration
// @access  Private/Admin
router.post('/whatsapp-config', auth, adminOnly, async (req, res) => {
    try {
        const { name, apiKey, accessToken, phoneNumberId, businessAccountId, webhookVerifyToken, isEnabled } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Configuration name is required' });
        }

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        company.whatsappConfigs.push({
            name,
            apiKey: apiKey || '',
            accessToken: accessToken || '',
            phoneNumberId: phoneNumberId || '',
            businessAccountId: businessAccountId || '',
            webhookVerifyToken: webhookVerifyToken || '',
            isEnabled: isEnabled || false
        });

        await company.save();

        res.json({ success: true, data: company });
    } catch (error) {
        console.error('Add WhatsApp config error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/settings/whatsapp-config/:index
// @desc    Update specific WhatsApp configuration
// @access  Private/Admin
router.put('/whatsapp-config/:index', auth, adminOnly, async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const { name, apiKey, accessToken, phoneNumberId, businessAccountId, webhookVerifyToken, isEnabled } = req.body;

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company || !company.whatsappConfigs[index]) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        if (name !== undefined) company.whatsappConfigs[index].name = name;
        if (apiKey !== undefined) company.whatsappConfigs[index].apiKey = apiKey;
        if (accessToken !== undefined) company.whatsappConfigs[index].accessToken = accessToken;
        if (phoneNumberId !== undefined) company.whatsappConfigs[index].phoneNumberId = phoneNumberId;
        if (businessAccountId !== undefined) company.whatsappConfigs[index].businessAccountId = businessAccountId;
        if (webhookVerifyToken !== undefined) company.whatsappConfigs[index].webhookVerifyToken = webhookVerifyToken;
        if (isEnabled !== undefined) company.whatsappConfigs[index].isEnabled = isEnabled;

        await company.save();

        res.json({ success: true, data: company });
    } catch (error) {
        console.error('Update WhatsApp config error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/settings/whatsapp-config/:index
// @desc    Delete specific WhatsApp configuration
// @access  Private/Admin
router.delete('/whatsapp-config/:index', auth, adminOnly, async (req, res) => {
    try {
        const index = parseInt(req.params.index);

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company || !company.whatsappConfigs[index]) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        company.whatsappConfigs.splice(index, 1);
        await company.save();

        res.json({ success: true, data: company });
    } catch (error) {
        console.error('Delete WhatsApp config error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
