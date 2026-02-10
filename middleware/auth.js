const checkAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === "SECRET_VIBESPHERE_KEY_123") {
        next();
    } else {
        res.status(403).json({ error: "Access Denied" });
    }
};

module.exports = { checkAuth };
