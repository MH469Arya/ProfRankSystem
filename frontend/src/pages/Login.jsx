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

  const handleResetPassword = (e) => {
    e.preventDefault();
    setResetMsg("reset password mail is sent to principal's mail id");
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
    } catch (err) {
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

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            click{" "}
            <button
              onClick={handleResetPassword}
              className="font-bold underline hover:text-black transition-colors"
            >
              here
            </button>{" "}
            to reset password for principal
          </p>
          {resetMsg && (
            <p className="mt-4 p-2 bg-gray-50 border border-gray-200 font-bold text-gray-800">
              {resetMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
