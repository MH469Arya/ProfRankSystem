import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (isSending) return; // prevent spam

    setIsSending(true);
    setResetMsg("Sending reset email...");
    setIsResetting(true); // Switch to the OTP input screen immediately

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setResetMsg("Reset password email sent successfully. Please check your inbox for the OTP.");
      } else {
        setResetMsg(data.message || "Failed to send email");
      }
    } catch {
      setResetMsg("Server error. Try again later.");
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpResetConfirm = async (e) => {
    e.preventDefault();
    if (!otpCode || !newPassword) {
      setError("OTP and new password are required");
      return;
    }
    setError("");
    setIsConfirming(true);
    setResetMsg("Verifying OTP and resetting password...");

    try {
      const res = await fetch("/api/reset-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setResetMsg("Password reset successfully! Redirecting...");
        setOtpCode("");
        setNewPassword("");
        setTimeout(() => {
          setIsResetting(false);
          setResetMsg("");
        }, 3000);
      } else {
        setResetMsg(data.message || "Failed to reset password. Please check your OTP.");
      }
    } catch {
      setResetMsg("Server error. Try again later.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetMsg("");
    setIsLoading(true);

    try {
      const user = await login(username, password);
      if (user.role === "principal") {
        navigate("/principal/dashboard");
      } else if (user.role === "hod") {
        navigate("/hod/dashboard");
      }
    } catch {
      setError("Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 border border-gray-300">
        <h1 className="text-2xl font-bold mb-6 text-center tracking-tight">
          Professor Ranking System
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-gray-100 border border-black text-sm text-center font-medium">
            {error}
          </div>
        )}

        {isResetting ? (
          <form onSubmit={handleOtpResetConfirm} className="space-y-6">
            <h2 className="text-lg font-bold text-center uppercase tracking-wide">
              Principal Password Reset
            </h2>
            <p className="text-xs text-gray-500 text-center">
              An OTP has been requested for the principal account. Please check the registered email.
            </p>

            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                className="w-full p-3 border border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none font-mono text-center tracking-widest text-lg"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={4}
                className="w-full p-3 border border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={isConfirming}
              className="w-full bg-black text-white p-3 font-bold uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-500 rounded-none mb-2"
            >
              {isConfirming ? "Confirming..." : "Reset Password"}
            </button>

            <div className="flex justify-between items-center text-xs mt-4">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isSending}
                className="font-bold underline hover:text-black transition-colors"
              >
                {isSending ? "Resending..." : "Resend OTP"}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsResetting(false);
                  setError("");
                  setResetMsg("");
                }}
                className="font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                Username
              </label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full p-3 border border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white p-3 font-bold uppercase hover:bg-gray-800 transition-colors disabled:bg-gray-500 rounded-none mb-4"
            >
              {isLoading ? "Authenticating..." : "Login"}
            </button>
          </form>
        )}

        {!isResetting && (
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              click{" "}
              <button
                onClick={handleResetPassword}
                disabled={isSending}
                className={`font-bold underline transition-colors ${
                  isSending
                    ? "text-gray-400 cursor-not-allowed"
                    : "hover:text-black"
                }`}
              >
                {isSending ? "sending..." : "here"}
              </button>{" "}
              to reset password for principal
            </p>
          </div>
        )}

        {resetMsg && (
          <div className="mt-4">
            <p
              className={`p-2 border text-sm font-bold text-center ${
                resetMsg.includes("successfully") || resetMsg.includes("Redirecting")
                  ? "bg-green-50 border-green-400 text-green-700"
                  : resetMsg.includes("Sending") || resetMsg.includes("Verifying")
                    ? "bg-yellow-50 border-yellow-400 text-yellow-700"
                    : "bg-red-50 border-red-400 text-red-700"
              }`}
            >
              {resetMsg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
