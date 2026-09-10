// components/VoiceInputButton.jsx
//
// Uses the browser's built-in Web Speech API (SpeechRecognition) to convert
// spoken words into text. Not all browsers support this (notably Firefox
// doesn't) — the button quietly disables itself if unsupported rather than
// showing a broken control.

import { useState, useRef } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceInputButton({ onTranscript, lang = "en-US" }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  if (!SpeechRecognition) {
    return (
      <p className="text-xs text-ink/40">
        Voice input isn't supported in this browser — try Chrome or Edge.
      </p>
    );
  }

  function startListening() {
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
        listening
          ? "bg-severity-high text-white"
          : "bg-forest/5 text-forest hover:bg-forest/10"
      }`}
    >
      <span aria-hidden="true">{listening ? "●" : "🎤"}</span>
      {listening ? "Listening… tap to stop" : "Speak your report"}
    </button>
  );
}
