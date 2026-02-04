const express = require('express');
const { WhatsAppMessage, Settings, Lead, Company, Product } = require('../models');
const { auth, adminOnly } = require('../middleware');

const router = express.Router();

// @route   POST /api/whatsapp/send
// @desc    Send a WhatsApp message
// @access  Private/Admin
// @route   POST /api/whatsapp/send
// @desc    Send a WhatsApp message
// @access  Private (Admin or Assigned Worker)
router.post('/send', auth, async (req, res) => {
    try {
        let { message, phone, leadId, phoneNumberId } = req.body;

        if (!message || !phone) {
            return res.status(400).json({ success: false, message: 'Message and phone are required' });
        }

        // Check permissions
        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];
        const canViewAll = isAdmin || permissions.includes('view_all_leads');
        const canViewOwn = permissions.includes('view_own_leads');

        if (!canViewAll && !canViewOwn) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!canViewAll && canViewOwn) {
            const lead = await Lead.findOne({ phone: phone, assignedTo: user._id, companyId: req.companyId });
            if (!lead) {
                return res.status(403).json({ success: false, message: 'Not authorized to message this lead' });
            }
        }

        // Get Company Settings to find WhatsApp Config
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company || !company.whatsappConfigs || company.whatsappConfigs.length === 0) {
            return res.status(404).json({ success: false, message: 'No WhatsApp configuration found for this company' });
        }

        // If phoneNumberId not provided, try to get from Lead
        if (!phoneNumberId) {
            const lead = await Lead.findOne({ phone: phone, companyId: req.companyId });
            if (lead && lead.phoneNumberId) {
                phoneNumberId = lead.phoneNumberId;
            }
        }

        // Use the specified phoneNumberId, or fallback to first enabled
        const config = phoneNumberId
            ? company.whatsappConfigs.find(c => c.phoneNumberId === phoneNumberId)
            : (company.whatsappConfigs.find(c => c.isEnabled) || company.whatsappConfigs[0]);

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
            companyId: req.companyId,
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

// @route   POST /api/whatsapp/mark-read
// @desc    Mark messages as read (send read receipt to Meta)
// @access  Private/Admin
// @route   POST /api/whatsapp/mark-read
// @desc    Mark messages as read (send read receipt to Meta)
// @access  Private (Admin or Assigned Worker)
router.post('/mark-read', auth, async (req, res) => {
    try {
        const { contactPhone, phoneNumberId } = req.body;

        if (!contactPhone || !phoneNumberId) {
            return res.status(400).json({ success: false, message: 'Contact phone and phoneNumberId are required' });
        }

        // Check permissions
        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];
        const canViewAll = isAdmin || permissions.includes('view_all_leads');
        const canViewOwn = permissions.includes('view_own_leads');

        if (!canViewAll && !canViewOwn) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!canViewAll && canViewOwn) {
            const lead = await Lead.findOne({ phone: contactPhone, assignedTo: user._id, companyId: req.companyId });
            if (!lead) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        // Get company config
        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        const config = company.whatsappConfigs.find(c => c.phoneNumberId === phoneNumberId);
        if (!config || !config.accessToken) {
            return res.status(400).json({ success: false, message: 'Configuration not found' });
        }

        // Find unread incoming messages from this contact
        const unreadMessages = await WhatsAppMessage.find({
            companyId: req.companyId,
            from: contactPhone,
            phoneNumberId: phoneNumberId,
            status: { $in: ['received', 'pending'] }, // pending shouldn't happen for incoming but safe check
            direction: 'incoming'
        });

        if (unreadMessages.length === 0) {
            return res.json({ success: true, count: 0 });
        }

        const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

        // Mark each as read on Meta
        // We can do this in parallel
        await Promise.all(unreadMessages.map(async (msg) => {
            if (!msg.messageId) return;

            try {
                await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.accessToken}`
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        status: 'read',
                        message_id: msg.messageId
                    })
                });

                // Update local status
                msg.status = 'read';
                await msg.save();
            } catch (err) {
                console.error(`Failed to mark message ${msg.messageId} as read:`, err);
            }
        }));

        res.json({ success: true, count: unreadMessages.length });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/whatsapp/unread-count
// @desc    Get total count of unread incoming messages
// @access  Private/Admin/Agent
router.get('/unread-count', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];

        // Basic query for unread incoming messages
        const query = {
            companyId: req.companyId,
            direction: 'incoming',
            status: { $in: ['received', 'pending'] } // 'received' is the main one, 'pending' shouldn't be incoming but safe to check
        };

        // If user can only view own leads, we need to filter messages
        // effective permission check: canViewAll vs canViewOwn
        const canViewAll = isAdmin || permissions.includes('view_all_leads');
        const canViewOwn = permissions.includes('view_own_leads');

        if (!canViewAll && !canViewOwn) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!canViewAll && canViewOwn) {
            // Find leads assigned to this user
            const leads = await Lead.find({ assignedTo: user._id, companyId: req.companyId }).select('phone');
            const phoneNumbers = leads.map(l => l.phone);

            // Only count messages from these phone numbers
            query.from = { $in: phoneNumbers };
        }

        const count = await WhatsAppMessage.countDocuments(query);

        res.json({ success: true, count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/whatsapp/messages
// @desc    Get all WhatsApp messages, optionally filtered by phoneNumberId
// @access  Private/Admin/Agent
router.get('/messages', auth, async (req, res) => {
    try {
        const { phoneNumberId, page = 1, limit = 50 } = req.query;

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        // Permission Check
        const user = req.user;
        const isAdmin = ['admin', 'superadmin'].includes(user.role);
        const permissions = user.customRole?.permissions || [];
        const canViewAll = isAdmin || permissions.includes('view_all_leads');
        const canViewOwn = permissions.includes('view_own_leads');

        if (!canViewAll && !canViewOwn) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const query = { companyId: req.companyId };
        if (phoneNumberId) {
            query.phoneNumberId = phoneNumberId;
        }

        // If cannot view all, filter by assigned leads
        if (!canViewAll && canViewOwn) {
            const leads = await Lead.find({ assignedTo: user._id, companyId: req.companyId }).select('phone');
            const phoneNumbers = leads.map(l => l.phone);

            // Filter messages where from OR to is in phoneNumbers
            // Note: This might be slow if there are many leads/messages. Indexing 'from' and 'to' is recommended.
            query.$or = [
                { from: { $in: phoneNumbers } },
                { to: { $in: phoneNumbers } }
            ];
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
                const messageData = body.entry[0].changes[0].value.messages[0];
                const from = messageData.from;
                const msgBody = messageData.text?.body;
                const msgType = messageData.type;
                const messageId = messageData.id;
                const fromName = body.entry[0].changes[0].value.contacts[0].profile.name;
                const referral = messageData.referral;
                const context = messageData.context;

                // Check if message already exists (to prevent duplicates)
                const existingMessage = await WhatsAppMessage.findOne({ messageId });
                if (!existingMessage) {

                    // Find which Company owns this phoneNumberId
                    const company = await Company.findOne({ 'whatsappConfigs.phoneNumberId': phoneNumberId });

                    if (!company) {
                        console.error(`Received webhook for unknown phoneNumberId: ${phoneNumberId}`);
                        // Still return 200 to acknowledge receipt to Meta
                        return res.sendStatus(200);
                    }

                    const companyId = company._id;

                    // Save the WhatsApp message
                    await WhatsAppMessage.create({
                        companyId: companyId,
                        phoneNumberId,
                        from,
                        fromName,
                        type: msgType,
                        body: msgBody,
                        messageId,
                        metadata: messageData
                    });

                    // PRODUCT INQUIRY AUTO-REPLY LOGIC
                    if (context && context.referred_product && context.referred_product.product_retailer_id) {
                        const retailerId = context.referred_product.product_retailer_id;
                        console.log(`🛒 Received product inquiry for retailerId: ${retailerId}`);

                        // Find the product
                        const product = await Product.findOne({ company: companyId, retailerId: retailerId }).populate('linkedForm');

                        if (product && product.linkedForm) {
                            console.log(`✨ Product ${product.name} has linked form: ${product.linkedForm.title}. Sending auto-reply...`);

                            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                            const formUrl = `${clientUrl}/form/${product.linkedForm._id}`;
                            const replyMessage = `Thanks for your interest in *${product.name}*! \n\nPlease complete your order by filling out this form:\n${formUrl}`;

                            // Determine which config to use for sending reply
                            const config = company.whatsappConfigs.find(c => c.phoneNumberId === phoneNumberId);

                            if (config && config.accessToken) {
                                const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
                                const url = `${GRAPH_API_URL}/${phoneNumberId}/messages`;

                                try {
                                    await fetch(url, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${config.accessToken}`
                                        },
                                        body: JSON.stringify({
                                            messaging_product: 'whatsapp',
                                            recipient_type: 'individual',
                                            to: from,
                                            type: 'text',
                                            text: { body: replyMessage }
                                        })
                                    });

                                    // Save the auto-reply to DB
                                    await WhatsAppMessage.create({
                                        companyId: companyId,
                                        phoneNumberId,
                                        from: phoneNumberId,
                                        to: from,
                                        direction: 'outgoing',
                                        type: 'text',
                                        body: replyMessage,
                                        messageId: `auto-reply-${Date.now()}`,
                                        status: 'sent'
                                    });
                                    console.log('✅ Auto-reply sent successfully.');
                                } catch (replyErr) {
                                    console.error('Failed to send auto-reply:', replyErr);
                                }
                            }
                        }
                    }

                    // ORDER / CART AUTO-REPLY LOGIC
                    if (msgType === 'order' && messageData.order && messageData.order.product_items) {
                        const productItems = messageData.order.product_items;
                        console.log(`🛒 Received order with ${productItems.length} items`);

                        const retailerIds = productItems.map(item => item.product_retailer_id);

                        // Find products with linked forms
                        const products = await Product.find({
                            company: companyId,
                            retailerId: { $in: retailerIds },
                            linkedForm: { $ne: null }
                        }).populate('linkedForm');

                        if (products.length > 0) {
                            console.log(`✨ Found ${products.length} products with linked forms in the order.`);

                            // Deduplicate by form ID
                            const uniqueForms = {};
                            products.forEach(p => {
                                if (p.linkedForm) {
                                    uniqueForms[p.linkedForm._id] = {
                                        form: p.linkedForm,
                                        productName: p.name
                                    };
                                }
                            });

                            // Send a link for each unique form
                            for (const formId of Object.keys(uniqueForms)) {
                                const { form, productName } = uniqueForms[formId];
                                const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                                const formUrl = `${clientUrl}/form/${form._id}`;
                                const replyMessage = `Thanks for your order including *${productName}*! \n\nPlease complete the necessary details here:\n${formUrl}`;

                                // Determine config
                                const config = company.whatsappConfigs.find(c => c.phoneNumberId === phoneNumberId);

                                if (config && config.accessToken) {
                                    const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
                                    const url = `${GRAPH_API_URL}/${phoneNumberId}/messages`;

                                    try {
                                        await fetch(url, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${config.accessToken}`
                                            },
                                            body: JSON.stringify({
                                                messaging_product: 'whatsapp',
                                                recipient_type: 'individual',
                                                to: from,
                                                type: 'text',
                                                text: { body: replyMessage }
                                            })
                                        });

                                        // Save auto-reply
                                        await WhatsAppMessage.create({
                                            companyId: companyId,
                                            phoneNumberId,
                                            from: phoneNumberId,
                                            to: from,
                                            direction: 'outgoing',
                                            type: 'text',
                                            body: replyMessage,
                                            messageId: `auto-reply-order-${Date.now()}`,
                                            status: 'sent'
                                        });
                                        console.log(`✅ Form link sent for order (Form: ${form.title})`);
                                    } catch (replyErr) {
                                        console.error('Failed to send order form link:', replyErr);
                                    }
                                }
                            }
                        } else {
                            console.log('ℹ️ No linked forms found for the ordered products.');
                        }
                    }

                    // Create or update lead from WhatsApp message
                    try {
                        // Check if lead already exists with this phone number FOR THIS COMPANY
                        let lead = await Lead.findOne({ phone: from, companyId: companyId });

                        if (!lead) {
                            // ONLY create new lead if it's from an Ad (has referral)
                            if (referral) {
                                const referralSource = referral.source_url || 'Facebook/Instagram Ad';
                                const referralHeadline = referral.headline || 'Ad Response';

                                // Create new lead
                                lead = await Lead.create({
                                    companyId: companyId,
                                    name: fromName || `WhatsApp User ${from}`,
                                    phone: from,
                                    phoneNumberId: phoneNumberId,
                                    source: 'whatsapp_ad',
                                    stage: 'new',
                                    status: 'new',
                                    notes: `Lead generated from Ad Click.\nHeadline: ${referralHeadline}\nSource: ${referralSource}\n\nInitial message: ${msgBody || `[${msgType} message]`}`,
                                    uploadDate: new Date()
                                });
                                console.log(`✅ Created new lead from WhatsApp Ad: ${fromName} (${from}) for account ${phoneNumberId}`);
                            } else {
                                console.log(`ℹ️ Message from ${from} is a regular chat with no referral, skipping Lead creation.`);
                            }
                        } else {
                            // Associate with this account if not already associated
                            if (!lead.phoneNumberId) {
                                lead.phoneNumberId = phoneNumberId;
                            }

                            // Update existing lead with new message
                            const newNote = `\n\n[${new Date().toLocaleString()}] WhatsApp message: ${msgBody || `[${msgType} message]`}`;
                            lead.notes = (lead.notes || '') + newNote;
                            lead.lastMessage = msgBody || `[${msgType} message]`;
                            lead.lastInteraction = new Date();

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
        const { businessAccountId } = req.body;

        let configs = [];
        const settings = await Settings.findOne();
        if (settings && settings.whatsappConfigs && settings.whatsappConfigs.length > 0) {
            configs = settings.whatsappConfigs;
        }

        // Use company-specific configs if global ones are missing
        if (configs.length === 0 && req.companyId) {
            const company = await Company.findById(req.companyId);
            if (company && company.whatsappConfigs && company.whatsappConfigs.length > 0) {
                configs = company.whatsappConfigs;
            }
        }

        if (configs.length === 0) {
            return res.status(404).json({ success: false, message: 'No WhatsApp configuration found in Settings or Company' });
        }

        const results = [];
        const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

        // Iterate through configs and subscribe them
        for (const config of configs) {
            // If businessAccountId is provided, only subscribe that specific one
            if (businessAccountId && config.businessAccountId !== businessAccountId) continue;

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

// Public test route to verify path availability
router.get('/test-route', (req, res) => res.send('WhatsApp Router is ALIVE!'));

// @route   GET /whatsapp/subscription-status
// @desc    Check if app is subscribed to WhatsApp Business Account
// @access  Private/Admin
router.get('/subscription-status', auth, adminOnly, async (req, res) => {
    console.log('DEBUG: Hit /subscription-status route');
    try {
        let configs = [];
        const settings = await Settings.findOne();
        if (settings && settings.whatsappConfigs && settings.whatsappConfigs.length > 0) {
            configs = settings.whatsappConfigs;
        }

        // Use company-specific configs if global ones are missing
        if (configs.length === 0 && req.companyId) {
            const company = await Company.findById(req.companyId);
            if (company && company.whatsappConfigs && company.whatsappConfigs.length > 0) {
                configs = company.whatsappConfigs;
            }
        }

        if (configs.length === 0) {
            return res.status(404).json({ success: false, message: 'No WhatsApp configuration found in Settings or Company' });
        }

        const results = [];
        const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

        // Check subscription status for each config
        for (const config of configs) {
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

// @route   POST /api/whatsapp/link-catalog
// @desc    Link a Catalog to the WhatsApp Business Account (Connect Inventory)
// @access  Private
router.post('/link-catalog', auth, async (req, res) => {
    try {
        const { phoneNumberId, catalogId } = req.body;
        console.log('🔗 Link Catalog Request:', { phoneNumberId, catalogId, companyId: req.companyId });

        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        const config = company.whatsappConfigs.find(c => c.phoneNumberId === phoneNumberId);
        if (!config) {
            console.log('❌ Config not found for:', phoneNumberId);
            return res.status(404).json({ success: false, message: 'WhatsApp configuration not found for this Phone Number ID' });
        }

        console.log('✅ Found Config:', config.name);

        if (!config.businessAccountId || !config.accessToken) {
            return res.status(400).json({ success: false, message: 'Business Account ID or Access Token missing in configuration' });
        }

        // Determine which catalog to use (Payload > Config Override > Global)
        const targetCatalogId = catalogId || config.catalogId || company.metaCatalogConfig?.catalogId;
        console.log('🎯 Target Catalog ID:', targetCatalogId);

        if (!targetCatalogId) {
            return res.status(400).json({ success: false, message: 'No Catalog ID specified or found in configuration' });
        }

        const GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

        // Validate that the businessAccountId is actually a WABA
        console.log(`🔍 Validating Business Account ID: ${config.businessAccountId}...`);
        const typeCheckUrl = `${GRAPH_API_URL}/${config.businessAccountId}?metadata=1`;
        const typeCheckResponse = await fetch(typeCheckUrl, {
            headers: { 'Authorization': `Bearer ${config.accessToken}` }
        });
        const typeCheckData = await typeCheckResponse.json();

        if (typeCheckData.metadata && typeCheckData.metadata.type) {
            console.log(`ℹ️ Object Type: ${typeCheckData.metadata.type}`);
            const type = typeCheckData.metadata.type.toLowerCase();
            if (type !== 'whatsappbusinessaccount') {
                return res.status(400).json({
                    success: false,
                    message: `Invalid Account Type. The provided ID (${config.businessAccountId}) is a '${typeCheckData.metadata.type}', but a 'WhatsAppBusinessAccount' ID (WABA) is required to link a catalog.`
                });
            }
        } else if (typeCheckData.error) {
            return res.status(400).json({
                success: false,
                message: `Failed to validate Account ID: ${typeCheckData.error.message}`
            });
        }

        const url = `${GRAPH_API_URL}/${config.businessAccountId}/product_catalogs`;

        console.log('🚀 Sending request to Meta:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.accessToken}`
            },
            body: JSON.stringify({
                catalog_id: targetCatalogId
            })
        });

        const data = await response.json();
        console.log('📦 Meta Response:', JSON.stringify(data));

        if (data.error) {
            console.error('Meta API Error Details:', data.error);
            // Handle "already connected" gracefully if possible, but raw error is usually okay
            throw new Error(data.error.message);
        }

        // Verify the link by fetching connected catalogs
        console.log('🔍 Verifying connected catalogs...');
        const verifyUrl = `${GRAPH_API_URL}/${config.businessAccountId}/product_catalogs`;
        const verifyResponse = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`
            }
        });
        const verifyData = await verifyResponse.json();
        console.log('📋 Connected Catalogs:', JSON.stringify(verifyData));

        res.json({
            success: true,
            message: 'Catalog link request processed. Check console for verification details.',
            connectedCatalogs: verifyData.data || [],
            metaResponse: data
        });

    } catch (error) {
        console.error('🔥 Link catalog EXCEPTION:', error);
        res.status(500).json({ success: false, message: 'Failed to link catalog: ' + error.message });
    }
});

module.exports = router;
