const { auth, adminOnly, superAdminOnly, companyAuth } = require('./auth.middleware');

module.exports = {
    auth,
    adminOnly,
    superAdminOnly,
    companyAuth
};
