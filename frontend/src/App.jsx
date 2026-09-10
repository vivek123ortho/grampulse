// App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ReportFormPage from "./pages/ReportFormPage.jsx";
import MyReportsPage from "./pages/MyReportsPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/report" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <ReportFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <MyReportsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
