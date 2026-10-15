import jwt from "jsonwebtoken";

const genToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing in .env");
    }

    return jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

export default genToken;