import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMe } from "../api.js";
import AdminLayout from "../components/AdminLayout.jsx";

export default function ProtectedAdmin() {
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    getMe()
      .then(() => setEstado("ok"))
      .catch(() => setEstado("no"));
  }, []);

  if (estado === "cargando") {
    return (
      <div className="page-center">
        <p className="muted">Verificando sesión…</p>
      </div>
    );
  }

  if (estado === "no") {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
