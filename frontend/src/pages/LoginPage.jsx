// pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/report");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't log in. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-display text-3xl text-forest mb-1">Welcome back</h1>
      <p className="text-ink/60 text-sm mb-8">Log in to report or track village issues.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-ink/70 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none"
          />
        </div>

        {error && <p className="text-sm text-severity-high">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-forest text-white py-2.5 rounded-sm font-medium hover:bg-forest-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-ink/60 mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-forest underline">
          Register
        </Link>
      </p>
    </div>
  );
}
