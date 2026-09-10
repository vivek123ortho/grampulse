// components/Navbar.jsx

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-forest/10">
      <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-forest tracking-tight">
          GramPulse
        </Link>
        {user && (
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/report" className="text-ink/70 hover:text-forest transition-colors">
              Report a problem
            </Link>
            <Link to="/reports" className="text-ink/70 hover:text-forest transition-colors">
              My reports
            </Link>
            <span className="text-ink/40">|</span>
            <span className="text-ink/60">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-ink/70 hover:text-severity-high transition-colors"
            >
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
