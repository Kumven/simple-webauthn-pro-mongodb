const jwt = require('jsonwebtoken')
const path = require('path')

const verifyToken = (req, res, next) => {
    const userInfo = req.cookies.userInfo;
    if (!userInfo) return res.status(401).sendFile(path.join(__dirname, '../../public/pages/login.html'));
    // if (!userInfo) return res.status(401).json({ error: 'Access denied' });

    try {
        const verified = jwt.verify(userInfo, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        // res.status(400).json({ error: 'Invalid token' });
        res.status(400).sendFile(path.join(__dirname, '../../public/pages/login.html'));
    }
};

module.exports = verifyToken;
