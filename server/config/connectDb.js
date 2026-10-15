import mongoose from "mongoose";

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("Database Connected");
    } catch (error) {
        console.error("Database Error:", error.message);
        console.error("Error Code:", error.code);
    }
};

export default connectDb;