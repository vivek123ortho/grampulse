// pages/MyReportsPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const SEVERITY_LABEL = { high: "High", medium: "Medium", low: "Low" };
const SEVERITY_CLASS = {
  high: "text-severity-high",
  medium: "text-severity-medium",
  low: "text-severity-low",
};

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/reports/mine")
      .then((res) => setReports(res.data.reports))
      .catch(() => setError("Couldn't load your reports."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-3xl text-forest">My reports</h1>
        <Link to="/report" className="text-sm text-forest underline">
          + New report
        </Link>
      </div>

      {loading && <p className="text-ink/50 text-sm">Loading…</p>}
      {error && <p className="text-severity-high text-sm">{error}</p>}

      {!loading && !error && reports.length === 0 && (
        <div className="border border-dashed border-ink/15 rounded-sm px-6 py-10 text-center">
          <p className="text-ink/60 text-sm">You haven't submitted a report yet.</p>
          <Link to="/report" className="text-forest underline text-sm mt-2 inline-block">
            Report your first problem
          </Link>
        </div>
      )}

      <ul className="divide-y divide-ink/10">
        {reports.map((r) => (
          <li key={r._id} className="py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-ink">{r.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-ink/50">
                  <span className="capitalize">{r.category}</span>
                  <span>·</span>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span className={SEVERITY_CLASS[r.severity] || ""}>
                    {SEVERITY_LABEL[r.severity] || r.severity} severity
                  </span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-sm bg-forest/5 text-forest whitespace-nowrap">
                {r.status.replace("_", " ")}
              </span>
            </div>
            {r.imageUrl && (
              <img
                src={r.imageUrl}
                alt="Photo submitted with this report"
                className="mt-3 rounded-sm max-h-40 border border-ink/10"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
