
import React from "react";
import { BsRobot } from "react-icons/bs";
import { IoSparkles } from "react-icons/io5";
import { motion } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase.js";
import { ServerUrl } from "../App";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";

function Auth({ isModel = false, onClose }) {
  const dispatch = useDispatch();

  const handleGoogleAuth = async () => {
    try {
      const response = await signInWithPopup(auth, provider);
      const firebaseUser = response.user;

      const name = firebaseUser.displayName;
      const email = firebaseUser.email;

      if (!email) {
        throw new Error("Google account did not provide an email.");
      }

      const result = await axios.post(
        `${ServerUrl}/api/auth/google`,
        { name, email },
        { withCredentials: true }
      );

      console.log("Google auth response:", result.data);

      const userData = result.data?.user || result.data;

      if (!userData) {
        throw new Error("Backend did not return user data.");
      }

      dispatch(setUserData(userData));

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error(
        "Google login failed:",
        error.response?.data || error.message || error
      );
    }
  };

  return (
    <div
      className={`w-full ${
        isModel
          ? "py-4"
          : "min-h-screen bg-[#f3f3f3] flex items-center justify-center px-6 py-20"
      }`}
    >
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-200/30 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-100/40 blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.05 }}
        className={`w-full ${
          isModel
            ? "max-w-md p-8 rounded-3xl"
            : "max-w-lg p-12 rounded-[32px]"
        } bg-white shadow-2xl border border-gray-200`}
      >
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md shadow-slate-900/10 flex items-center justify-center">
            <BsRobot size={18} />
          </div>
          <h2 className="font-bold text-xl tracking-tight text-slate-900">
            InterLy<span className="text-purple-600">.AI</span>
          </h2>
        </div>

        <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 text-center leading-tight tracking-tight mb-4 flex flex-col items-center gap-2">
          <span>Continue with</span>
          <span className="bg-purple-50 text-purple-600 px-4 py-1.5 rounded-full inline-flex items-center gap-2 text-sm font-semibold border border-purple-100/80 shadow-[inset_0_1px_2px_rgba(147,51,234,0.05)]">
            <IoSparkles size={14} className="text-purple-500" />
            AI Smart Interview
          </span>
        </h1>

        <p className="text-slate-500 text-center text-sm md:text-[15px] leading-relaxed max-w-[340px] mb-8">
          Sign in to start AI-powered mock interviews, track your progress,
          and unlock detailed performance insights.
        </p>

        <motion.button
          type="button"
          onClick={handleGoogleAuth}
          whileHover={{ opacity: 0.9, scale: 1.03 }}
          whileTap={{ opacity: 1, scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3.5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-2xl transition-colors duration-200 shadow-lg shadow-slate-900/10"
        >
          <div className="bg-white p-1 rounded-md flex items-center justify-center shadow-sm">
            <FcGoogle size={18} />
          </div>
          Continue with Google
        </motion.button>
      </motion.div>
    </div>
  );
}

export default Auth;
