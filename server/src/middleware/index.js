const { auth, adminOnly, superAdminOnly } = require('./auth.middleware');

module.exports = {
    auth,
    adminOnly,
    superAdminOnly
};
