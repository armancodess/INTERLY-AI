import genToken from "../config/token.js";
import User from "../models/user.model.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
};

export const googleAuth = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        let user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            user = await User.create({
                name,
                email: normalizedEmail
            });
        }

        const token = genToken(user._id);

        res.cookie("token", token, cookieOptions);

        return res.status(200).json(user);
    } catch (error) {
        console.error("Google auth error:", error);

        return res.status(500).json({
            message: "Google authentication failed"
        });
    }
};

export const logOut = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/"
        });

        return res.status(200).json({
            message: "Logout successful"
        });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            message: "Logout failed"
        });
    }
};