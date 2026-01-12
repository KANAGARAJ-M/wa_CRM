const express = require('express');
const { Settings } = require('../models');
const { auth, adminOnly } = require('../middleware');

const router = express.Router();

// @route   GET /api/settings
// @desc    Get all settings
// @access  Private/Admin
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/settings
// @desc    Update settings
// @access  Private/Admin
router.put('/', auth, adminOnly, async (req, res) => {
    try {
        const { whatsappConfigs } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (whatsappConfigs !== undefined) {
            settings.whatsappConfigs = whatsappConfigs;
        }

        await settings.save();

        res.json({ success: true, data: settings });
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

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        settings.whatsappConfigs.push({
            name,
            apiKey: apiKey || '',
            accessToken: accessToken || '',
            phoneNumberId: phoneNumberId || '',
            businessAccountId: businessAccountId || '',
            webhookVerifyToken: webhookVerifyToken || '',
            isEnabled: isEnabled || false
        });

        await settings.save();

        res.json({ success: true, data: settings });
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

        const settings = await Settings.findOne();
        if (!settings || !settings.whatsappConfigs[index]) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        if (name !== undefined) settings.whatsappConfigs[index].name = name;
        if (apiKey !== undefined) settings.whatsappConfigs[index].apiKey = apiKey;
        if (accessToken !== undefined) settings.whatsappConfigs[index].accessToken = accessToken;
        if (phoneNumberId !== undefined) settings.whatsappConfigs[index].phoneNumberId = phoneNumberId;
        if (businessAccountId !== undefined) settings.whatsappConfigs[index].businessAccountId = businessAccountId;
        if (webhookVerifyToken !== undefined) settings.whatsappConfigs[index].webhookVerifyToken = webhookVerifyToken;
        if (isEnabled !== undefined) settings.whatsappConfigs[index].isEnabled = isEnabled;

        await settings.save();

        res.json({ success: true, data: settings });
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

        const settings = await Settings.findOne();
        if (!settings || !settings.whatsappConfigs[index]) {
            return res.status(404).json({ success: false, message: 'Configuration not found' });
        }

        settings.whatsappConfigs.splice(index, 1);
        await settings.save();

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Delete WhatsApp config error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
