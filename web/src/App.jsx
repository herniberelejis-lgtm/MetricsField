import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clientes from "./pages/Clientes.jsx";
import ClienteDetalle from "./pages/ClienteDetalle.jsx";
import NuevoCliente from "./pages/NuevoCliente.jsx";
import EditarCliente from "./pages/EditarCliente.jsx";
import Hardware from "./pages/Hardware.jsx";
import Portal from "./pages/Portal.jsx";
import Administradores from "./pages/Administradores.jsx";
import Actividad from "./pages/Actividad.jsx";
import ClienteLinks from "./pages/ClienteLinks.jsx";
import ClienteCompetencia from "./pages/ClienteCompetencia.jsx";
import ClienteCRM from "./pages/ClienteCRM.jsx";
import ClienteMetricas from "./pages/ClienteMetricas.jsx";
import NuevaSucursal from "./pages/NuevaSucursal.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";
import ProtectedAdmin from "./components/ProtectedAdmin.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal/:codigo" element={<Portal />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacidad" element={<Privacy />} />
      <Route path="/terminos" element={<Terms />} />
      <Route element={<ProtectedAdmin />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/clientes" element={<Clientes />} />
        <Route path="/admin/clientes/nuevo" element={<NuevoCliente />} />
        <Route path="/admin/clientes/:id/editar" element={<EditarCliente />} />
        <Route path="/admin/clientes/:id/links" element={<ClienteLinks />} />
        <Route path="/admin/clientes/:id/crm" element={<ClienteCRM />} />
        <Route path="/admin/clientes/:id/metricas" element={<ClienteMetricas />} />
        <Route path="/admin/clientes/:id/competencia" element={<ClienteCompetencia />} />
        <Route path="/admin/clientes/:id/sucursales/nueva" element={<NuevaSucursal />} />
        <Route path="/admin/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/admin/hardware" element={<Hardware />} />
        <Route path="/admin/actividad" element={<Actividad />} />
        <Route path="/admin/administradores" element={<Administradores />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
