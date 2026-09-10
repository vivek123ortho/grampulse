// pages/RegisterPage.jsx
//
// NOTE: villageId is currently a plain text field where the user pastes a
// Village ObjectId (from your seed data). A proper village-picker dropdown
// is a nice enhancement, but wasn't essential for Phase 2 — comes later
// once the village listing endpoint exists.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", villageId: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ ...form, role: "citizen" });
      navigate("/report");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't register. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-display text-3xl text-forest mb-1">Join GramPulse</h1>
      <p className="text-ink/60 text-sm mb-8">Register as a citizen to start reporting issues.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-ink/70 mb-1">Full name</label>
          <input
            required
            value={form.name}
            onChange={update("name")}
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={update("password")}
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Village ID</label>
          <input
            required
            value={form.villageId}
            onChange={update("villageId")}
            placeholder="Paste your village's ID (from seed data)"
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none text-sm"
          />
        </div>

        {error && <p className="text-sm text-severity-high">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-forest text-white py-2.5 rounded-sm font-medium hover:bg-forest-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-ink/60 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-forest underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
