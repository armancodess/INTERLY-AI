import jwt from "jsonwebtoken";

const isAuth = (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                message: "Authentication token missing"
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing");
            return res.status(500).json({
                message: "Server authentication configuration error"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.userId) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error("Authentication error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired authentication token"
        });
    }
};

export default isAuth;