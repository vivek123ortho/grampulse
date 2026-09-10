// components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // brief flash while checking localStorage on load
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
