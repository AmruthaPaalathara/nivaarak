const jwt = require('jsonwebtoken');

const verifyRefreshToken = (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token is missing from cookies.' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
        }

        // Attach user information from the decoded refresh token to the request object
        req.user = decoded;
        next();
    });
};

module.exports = verifyRefreshToken;
