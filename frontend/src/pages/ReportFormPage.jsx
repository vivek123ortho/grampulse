// pages/ReportFormPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getCurrentLocation } from "../utils/geolocation";
import VoiceInputButton from "../components/VoiceInputButton.jsx";

const CATEGORIES = [
  { value: "water", label: "Water" },
  { value: "roads", label: "Roads" },
  { value: "electricity", label: "Electricity" },
  { value: "sanitation", label: "Sanitation" },
  { value: "healthcare", label: "Healthcare" },
  { value: "agriculture", label: "Agriculture" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export default function ReportFormPage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("water");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleGetLocation() {
    setLocating(true);
    setError("");
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Please describe the problem.");
      return;
    }
    if (!location) {
      setError("Please share your location before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("description", description);
      formData.append("category", category);
      formData.append("latitude", location.latitude);
      formData.append("longitude", location.longitude);
      if (image) formData.append("image", image);

      await api.post("/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      setTimeout(() => navigate("/reports"), 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="font-display text-2xl text-forest">Report submitted.</p>
        <p className="text-ink/60 text-sm mt-2">Taking you to your reports…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-display text-3xl text-forest mb-1">Report a problem</h1>
      <p className="text-ink/60 text-sm mb-8">
        Describe what you're seeing. A photo and your location help others understand it faster.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description + voice input */}
        <div>
          <label className="block text-sm text-ink/70 mb-1">What's the problem?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder='e.g. "Handpump water smells bad and looks yellow"'
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none resize-none"
          />
          <div className="mt-2">
            <VoiceInputButton
              onTranscript={(text) => setDescription((prev) => (prev ? prev + " " + text : text))}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm text-ink/70 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-ink/15 rounded-sm bg-white focus:border-forest outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm text-ink/70 mb-1">Photo (optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview of the uploaded report photo"
              className="mt-3 rounded-sm max-h-48 border border-ink/10"
            />
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm text-ink/70 mb-1">Location</label>
          {location ? (
            <p className="text-sm text-forest">
              ✓ Location captured ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
            </p>
          ) : (
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locating}
              className="text-sm px-4 py-2 rounded-sm bg-forest/5 text-forest hover:bg-forest/10 transition-colors disabled:opacity-50"
            >
              {locating ? "Getting location…" : "Share my location"}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-severity-high">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ochre text-white py-2.5 rounded-sm font-medium hover:bg-ochre-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}
