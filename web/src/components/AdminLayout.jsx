import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../api.js";

const NAV = [
  { to: "/admin", label: "Panel", end: true },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/hardware", label: "Hardware" },
  { to: "/admin/actividad", label: "Actividad" },
  { to: "/admin/administradores", label: "Equipo" },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>MetricsField</strong>
          <span className="muted">Express + React</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="ghost sidebar-logout" onClick={onLogout}>
          Salir
        </button>
      </aside>
      <main className="shell-main">{children}</main>
    </div>
  );
}
