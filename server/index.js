
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import connectDb from "./config/connectDb.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import interviewRouter from "./routes/interview.routes.js";
import paymentRouter from "./routes/payment.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "https://interly-ai-client.onrender.com",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/payment", paymentRouter);

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDb();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();