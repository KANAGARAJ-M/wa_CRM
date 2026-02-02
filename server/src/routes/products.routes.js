const express = require('express');
const { Product, Company } = require('../models');
const { auth } = require('../middleware');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products for the company
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const products = await Product.find({ company: req.companyId, active: true }).sort({ createdAt: -1 });
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/products
// @desc    Add a new product
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const { name, price, description, imageUrl, retailerId, currency } = req.body;

        const newProduct = new Product({
            company: req.companyId,
            name,
            price,
            description,
            imageUrl,
            retailerId,
            currency
        });

        await newProduct.save();
        res.json({ success: true, data: newProduct });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const { name, price, description, imageUrl, retailerId, currency, active } = req.body;

        const product = await Product.findOne({ _id: req.params.id, company: req.companyId });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (name !== undefined) product.name = name;
        if (price !== undefined) product.price = price;
        if (description !== undefined) product.description = description;
        if (imageUrl !== undefined) product.imageUrl = imageUrl;
        if (retailerId !== undefined) product.retailerId = retailerId;
        if (currency !== undefined) product.currency = currency;
        if (active !== undefined) product.active = active;

        await product.save();
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/products/sync
// @desc    Sync products from Meta Catalog
// @access  Private
router.post('/sync', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        const { catalogId, accessToken } = company.metaCatalogConfig || {};

        if (!catalogId || !accessToken) {
            return res.status(400).json({ success: false, message: 'Meta Catalog configuration is missing (Catalog ID or Access Token).' });
        }

        // Fetch from Meta Graph API
        const metaUrl = `https://graph.facebook.com/v19.0/${catalogId}/products?fields=name,description,price,currency,image_url,retailer_id&access_token=${accessToken}&limit=100`;

        const response = await fetch(metaUrl);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const metaProducts = data.data || [];
        let syncedCount = 0;
        const validRetailerIds = [];

        for (const item of metaProducts) {
            const priceValue = parseFloat((item.price || '0').replace(/[^0-9.]/g, ''));
            validRetailerIds.push(item.retailer_id);

            const updateData = {
                name: item.name,
                description: item.description,
                price: priceValue || 0,
                currency: item.currency || 'INR', // Default to INR based on user region
                active: true,
                retailerId: item.retailer_id
            };

            // Only update image if Meta returns a valid URL
            if (item.image_url) {
                updateData.imageUrl = item.image_url;
            }

            await Product.findOneAndUpdate(
                { company: req.companyId, retailerId: item.retailer_id },
                updateData,
                { upsert: true, new: true }
            );
            syncedCount++;
        }

        // Deactivate local products that are NOT in Meta anymore
        // Only consider products that HAVE a retailerId (meaning they were synced before)
        const deactivated = await Product.updateMany(
            {
                company: req.companyId,
                active: true,
                retailerId: { $exists: true, $ne: '' },
                retailerId: { $nin: validRetailerIds }
            },
            { active: false }
        );

        res.json({
            success: true,
            message: `Sync complete: ${syncedCount} from Meta, ${deactivated.modifiedCount} deactivated locally.`,
            count: syncedCount,
            deactivated: deactivated.modifiedCount
        });

    } catch (error) {
        console.error('Sync products error:', error);
        res.status(500).json({ success: false, message: 'Failed to sync: ' + error.message });
    }
});

// @route   POST /api/products/push-to-meta
// @desc    Push local products to Meta Catalog (Create/Update)
// @access  Private
router.post('/push-to-meta', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const company = await Company.findById(req.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        const { catalogId, accessToken } = company.metaCatalogConfig || {};
        const whatsappConfigs = company.whatsappConfigs || [];

        // Collect all unique catalogs (Global + Per-Account)
        const catalogsToSync = [];

        // Add Global Catalog if exists
        if (catalogId && accessToken) {
            catalogsToSync.push({
                name: 'Default Global Catalog',
                id: catalogId,
                token: accessToken
            });
        }

        // Add Per-Account Catalogs if they differ
        for (const config of whatsappConfigs) {
            if (config.catalogId && config.catalogAccessToken) {
                // Check if already in list to avoid duplicates
                const exists = catalogsToSync.find(c => c.id === config.catalogId);
                if (!exists) {
                    catalogsToSync.push({
                        name: `Account ${config.name} Catalog`,
                        id: config.catalogId,
                        token: config.catalogAccessToken
                    });
                }
            }
        }

        if (catalogsToSync.length === 0) {
            return res.status(400).json({ success: false, message: 'No Meta Catalog configurations found (neither Global nor Per-Account).' });
        }

        // Fetch all active products
        const products = await Product.find({ company: req.companyId, active: true });

        if (products.length === 0) {
            return res.json({ success: true, message: 'No products to sync.' });
        }

        const results = [];
        const productsToUpdateRetailerId = [];

        // Prepare request payload (same for all catalogs)
        const requests = [];

        for (const product of products) {
            let method = 'UPDATE';
            let retailerId = product.retailerId;

            if (!retailerId) {
                method = 'CREATE';
                retailerId = product._id.toString(); // Use Mongo ID as Retailer ID if missing
                // Only push to update list if not already there
                const alreadyQueued = productsToUpdateRetailerId.find(p => p._id.toString() === product._id.toString());
                if (!alreadyQueued) {
                    productsToUpdateRetailerId.push({ _id: product._id, retailerId });
                }
            }

            const payloadData = {
                id: retailerId,
                title: product.name,
                description: product.description || product.name,
                availability: 'in stock',
                condition: 'new',
                price: `${product.price} ${product.currency || 'INR'}`, // Ensure currency matches catalog
                link: company.website || `https://example.com/product/${product._id}`,
                image_link: product.imageUrl, // Must be a PUBLIC URL
                brand: company.name || 'Generic',
                origin_country_code: 'IN' // Helps with validation for IN accounts
            };

            // Validate Image URL (Must be public for Meta to download)
            if (!product.imageUrl || product.imageUrl.includes('localhost') || product.imageUrl.includes('127.0.0.1')) {
                console.warn(`[Push] Skipping image for ${product.name} - Invalid/Local URL: ${product.imageUrl}`);
                payloadData.image_link = 'https://via.placeholder.com/500x500.png?text=Product+Image';
            }

            requests.push({
                method: method,
                data: payloadData
            });
        }

        // Push to each catalog
        for (const catalog of catalogsToSync) {
            try {
                // Using v24.0 as requested
                const metaUrl = `https://graph.facebook.com/v24.0/${catalog.id}/items_batch`;

                const payload = {
                    item_type: 'PRODUCT_ITEM',
                    requests: requests
                };

                const response = await fetch(metaUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: catalog.token,
                        ...payload
                    })
                });

                const data = await response.json();

                if (data.error) {
                    results.push({ catalog: catalog.name, success: false, error: data.error.message });
                } else {
                    results.push({ catalog: catalog.name, success: true, count: requests.length });
                }
            } catch (err) {
                results.push({ catalog: catalog.name, success: false, error: err.message });
            }
        }

        // If at least one sync was successful (or we attempted), update local Retailer IDs
        if (productsToUpdateRetailerId.length > 0) {
            for (const item of productsToUpdateRetailerId) {
                await Product.findByIdAndUpdate(item._id, { retailerId: item.retailerId });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        // More detailed message
        let message = `Sync complete. ${successCount}/${totalCount} catalogs updated successfully.`;
        if (successCount === 0 && totalCount > 0) {
            message = `Failed to sync to any catalogs. See details.`;
        }

        res.json({
            success: successCount > 0,
            message: message,
            details: results
        });
    } catch (error) {
        console.error('Push to Meta error:', error);
        res.status(500).json({ success: false, message: 'Failed to push to Meta: ' + error.message });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        if (!req.companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const product = await Product.findOne({ _id: req.params.id, company: req.companyId });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.active = false;
        await product.save();
        res.json({ success: true, message: 'Product removed' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
