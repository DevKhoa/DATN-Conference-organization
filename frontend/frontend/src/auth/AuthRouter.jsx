import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TwoFactorPage from "./pages/TwoFactorPage";

const AuthRouter = () => {
  const navigate = useNavigate();

  // Hàm điều hướng chung
  const onNavigate = (screen) => {
    switch (screen) {
      case "login":
        navigate("/auth/login");
        break;
      case "signup":
        navigate("/auth/signup");
        break;
      case "forgot":
        navigate("/auth/forgot");
        break;
      case "verify-email":
        navigate("/auth/verify-email");
        break;
      case "reset":
        navigate("/auth/reset");
        break;
      case "2fa":
        navigate("/auth/2fa");
        break;
      default:
        navigate("/auth/login");
    }
  };

  return (
    <Routes>
      <Route path="/" element={<LoginPage onNavigate={onNavigate} />} />
      <Route path="/login" element={<LoginPage onNavigate={onNavigate} />} />
      <Route path="/signup" element={<SignupPage onNavigate={onNavigate} />} />
      <Route path="/forgot" element={<ForgotPasswordPage onNavigate={onNavigate} />} />
      <Route path="/verify-email" element={<VerifyEmailPage onNavigate={onNavigate} />} />
      <Route path="/reset" element={<ResetPasswordPage onNavigate={onNavigate} />} />
      <Route path="/2fa" element={<TwoFactorPage onNavigate={onNavigate} />} />
    </Routes>
  );
};

export default AuthRouter;
