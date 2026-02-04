const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    imageUrl: {
        type: String
    },
    retailerId: { // Meta Catalog Product SKU / Retailer ID
        type: String
    },
    active: {
        type: Boolean,
        default: true
    },
    linkedForm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form'
    },
    whatsappFlowId: {
        type: String, // ID of the WhatsApp Flow from Meta Business Manager
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
