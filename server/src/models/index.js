const User = require('./User');
const Lead = require('./Lead');
const Settings = require('./Settings');
const WhatsAppMessage = require('./WhatsAppMessage');
const Company = require('./Company');
const Call = require('./Call');
const Role = require('./Role');
const Product = require('./Product');

module.exports = {
    User,
    Lead,
    Settings,
    WhatsAppMessage,
    Company,
    Call,
    Role,
    Product,
    Form: require('./Form'),
    FormSubmission: require('./FormSubmission'),
    FlowResponse: require('./FlowResponse')
};
