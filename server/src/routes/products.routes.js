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

        for (const item of metaProducts) {
            const priceValue = parseFloat((item.price || '0').replace(/[^0-9.]/g, ''));

            await Product.findOneAndUpdate(
                { company: req.companyId, retailerId: item.retailer_id },
                {
                    name: item.name,
                    description: item.description,
                    price: priceValue || 0,
                    currency: item.currency || 'USD',
                    imageUrl: item.image_url,
                    active: true,
                    retailerId: item.retailer_id
                },
                { upsert: true, new: true }
            );
            syncedCount++;
        }

        res.json({ success: true, message: `Successfully synced ${syncedCount} products from Meta Catalog.`, count: syncedCount });

    } catch (error) {
        console.error('Sync products error:', error);
        res.status(500).json({ success: false, message: 'Failed to sync: ' + error.message });
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
