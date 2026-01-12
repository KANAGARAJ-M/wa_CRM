const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT token
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found.'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated.'
                });
            }

            req.user = user;

            // Handle Multi-Tenancy
            const headerCompanyId = req.headers['x-company-id'];

            if (headerCompanyId) {
                // Check if user belongs to this company (assuming companies are ObjectIds)
                if (user.companies && user.companies.some(id => id.toString() === headerCompanyId)) {
                    req.companyId = headerCompanyId;
                } else {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You do not belong to this company.'
                    });
                }
            } else {
                // Default to first company if available
                if (user.companies && user.companies.length > 0) {
                    req.companyId = user.companies[0].toString();
                }
            }

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token.'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

// Check if user is admin or superadmin
const adminOnly = (req, res, next) => {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
    next();
};

// Check if user is superadmin
const superAdminOnly = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Superadmin only.'
        });
    }
    next();
};

module.exports = {
    auth,
    adminOnly,
    superAdminOnly
};
