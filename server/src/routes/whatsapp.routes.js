const express = require('express');
const { WhatsAppMessage, Settings, Lead } = require('../models');
const { auth, adminOnly } = require('../middleware');

const router = express.Router();

// @route   POST /api/whatsapp/send
// @desc    Send a WhatsApp message
// @access  Private/Admin
router.post('/send', auth, adminOnly, async (req, res) => {
    try {
        const { message, phone, leadId } = req.body;

        if (!message || !phone) {
            return res.status(400).json({ success: false, message: 'Message and phone are required' });
        }

        // Get Settings to find WhatsApp Config
        const settings = await Settings.findOne();
        if (!settings || !settings.whatsappConfigs || settings.whatsappConfigs.length === 0) {
            return res.status(404).json({ success: false, message: 'No WhatsApp configuration found' });
        }

        // Use the first enabled config for now (or improve to select based on context)
        const config = settings.whatsappConfigs.find(c => c.isEnabled) || settings.whatsappConfigs[0];

        if (!config || !config.phoneNumberId || !config.accessToken) {
            return res.status(400).json({ success: false, message: 'Invalid WhatsApp configuration' });
        }

        const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
        const url = `${GRAPH_API_URL}/${config.phoneNumberId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: { preview_url: false, body: message }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp Graph API Error:', data);
            return res.status(response.status).json({ success: false, message: 'Failed to send message', error: data });
        }

        // Save to Database
        const newMessage = await WhatsAppMessage.create({
            phoneNumberId: config.phoneNumberId,
            from: config.phoneNumberId, // Sender is the business
            to: phone,
            direction: 'outgoing',
            type: 'text',
            body: message,
            messageId: data.messages?.[0]?.id || `sent-${Date.now()}`,
            status: 'sent',
            metadata: data
        });

        res.json({ success: true, data: newMessage });

    } catch (error) {
        console.error('Send WhatsApp message error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/whatsapp/messages
// @desc    Get all WhatsApp messages, optionally filtered by phoneNumberId
// @access  Private/Admin
router.get('/messages', auth, adminOnly, async (req, res) => {
    try {
        const { phoneNumberId, page = 1, limit = 50 } = req.query;

        const query = {};
        if (phoneNumberId) {
            query.phoneNumberId = phoneNumberId;
        }

        const messages = await WhatsAppMessage.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await WhatsAppMessage.countDocuments(query);

        res.json({
            success: true,
            data: messages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get WhatsApp messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /whatsapp
// @desc    Webhook for WhatsApp Cloud API
// @access  Public
router.post('/', async (req, res) => {
    try {
        const body = req.body;

        // Check if this is an event from WhatsApp Cloud API
        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
                const from = body.entry[0].changes[0].value.messages[0].from;
                const msgBody = body.entry[0].changes[0].value.messages[0].text?.body;
                const msgType = body.entry[0].changes[0].value.messages[0].type;
                const messageId = body.entry[0].changes[0].value.messages[0].id;
                const fromName = body.entry[0].changes[0].value.contacts[0].profile.name;

                // Check if message already exists (to prevent duplicates)
                const existingMessage = await WhatsAppMessage.findOne({ messageId });
                if (!existingMessage) {
                    // Save the WhatsApp message
                    await WhatsAppMessage.create({
                        phoneNumberId,
                        from,
                        fromName,
                        type: msgType,
                        body: msgBody,
                        messageId,
                        metadata: body.entry[0].changes[0].value.messages[0]
                    });

                    // Create or update lead from WhatsApp message
                    try {
                        // Check if lead already exists with this phone number
                        let lead = await Lead.findOne({ phone: from });

                        if (!lead) {
                            // Create new lead
                            lead = await Lead.create({
                                name: fromName || `WhatsApp User ${from}`,
                                phone: from,
                                source: 'whatsapp',
                                stage: 'new',
                                status: 'new',
                                notes: `Initial message via WhatsApp: ${msgBody || `[${msgType} message]`}`,
                                uploadDate: new Date()
                            });
                            console.log(`✅ Created new lead from WhatsApp: ${fromName} (${from})`);
                        } else {
                            // Update existing lead with new message
                            const newNote = `\n\n[${new Date().toLocaleString()}] WhatsApp message: ${msgBody || `[${msgType} message]`}`;
                            lead.notes = (lead.notes || '') + newNote;

                            // Add to comment history
                            if (!lead.commentHistory) {
                                lead.commentHistory = [];
                            }
                            lead.commentHistory.push({
                                timestamp: new Date(),
                                content: `WhatsApp message: ${msgBody || `[${msgType} message]`}`
                            });

                            await lead.save();
                            console.log(`✅ Updated existing lead from WhatsApp: ${fromName} (${from})`);
                        }
                    } catch (leadError) {
                        console.error('Error creating/updating lead from WhatsApp:', leadError);
                        // Don't fail the webhook if lead creation fails
                    }
                }
            } else if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.statuses &&
                body.entry[0].changes[0].value.statuses[0]
            ) {
                // Handle Status Updates (Sent, Delivered, Read)
                const statusUpdate = body.entry[0].changes[0].value.statuses[0];
                const messageId = statusUpdate.id;
                const newStatus = statusUpdate.status; // sent, delivered, read, failed

                try {
                    await WhatsAppMessage.findOneAndUpdate(
                        { messageId: messageId },
                        { status: newStatus }
                    );
                } catch (statusError) {
                    console.error('Error updating message status:', statusError);
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('WhatsApp webhook error:', error);
        res.sendStatus(500);
    }
});

// @route   GET /whatsapp
// @desc    Verification for WhatsApp Webhook
// @access  Public
router.get('/', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('WhatsApp Webhook Verification:', { mode, token, challenge });

    // Hardcoded verify token (can also check database)
    const VERIFY_TOKEN = 'meta_integration_1121';

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('❌ Verification failed - Invalid token');
            res.sendStatus(403);
        }
    } else {
        console.log('❌ Verification failed - Missing parameters');
        res.sendStatus(400);
    }
});

// @route   POST /whatsapp/subscribe
// @desc    Manually subscribe App to Business Account (Self-Heal)
// @access  Private/Admin
router.post('/subscribe', auth, adminOnly, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.whatsappConfigs || settings.whatsappConfigs.length === 0) {
            return res.status(404).json({ success: false, message: 'No WhatsApp configuration found' });
        }

        const results = [];
        const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

        // Iterate through all configs and subscribe them
        for (const config of settings.whatsappConfigs) {
            if (config.businessAccountId && config.accessToken) {
                try {
                    const url = `${GRAPH_API_URL}/${config.businessAccountId}/subscribed_apps`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${config.accessToken}`
                        }
                    });
                    const data = await response.json();

                    results.push({
                        name: config.name,
                        success: data.success || false,
                        error: data.error
                    });
                } catch (err) {
                    results.push({
                        name: config.name,
                        success: false,
                        error: err.message
                    });
                }
            }
        }

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /whatsapp/subscription-status
// @desc    Check if app is subscribed to WhatsApp Business Account
// @access  Private/Admin
router.get('/subscription-status', auth, adminOnly, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings || !settings.whatsappConfigs || settings.whatsappConfigs.length === 0) {
            return res.status(404).json({ success: false, message: 'No WhatsApp configuration found' });
        }

        const results = [];
        const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

        // Check subscription status for each config
        for (const config of settings.whatsappConfigs) {
            if (config.businessAccountId && config.accessToken) {
                try {
                    // Check subscribed apps
                    const url = `${GRAPH_API_URL}/${config.businessAccountId}/subscribed_apps`;
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${config.accessToken}`
                        }
                    });
                    const data = await response.json();

                    results.push({
                        name: config.name,
                        businessAccountId: config.businessAccountId,
                        phoneNumberId: config.phoneNumberId,
                        isEnabled: config.isEnabled,
                        subscriptionData: data.data || [],
                        isSubscribed: data.data && data.data.length > 0,
                        error: data.error
                    });
                } catch (err) {
                    results.push({
                        name: config.name,
                        businessAccountId: config.businessAccountId,
                        isSubscribed: false,
                        error: err.message
                    });
                }
            } else {
                results.push({
                    name: config.name,
                    isSubscribed: false,
                    error: 'Missing businessAccountId or accessToken'
                });
            }
        }

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Subscription status check error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
