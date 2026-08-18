import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuthConfig, login } from "../api.js";

const ERRORES = {
  "1": "Contraseña incorrecta. Probá de nuevo.",
  limite: "Demasiados intentos. Esperá 15 minutos y probá de nuevo.",
  "no-autorizado": "Esa cuenta de Google no tiene acceso al panel. Pedile a un admin que te sume.",
  estado: "Algo falló verificando la sesión de Google. Probá de nuevo.",
  cancelado: "Cancelaste el inicio de sesión con Google.",
  google: "Google no devolvió los datos esperados. Probá de nuevo.",
  "google-no-configurado": "El login con Google todavía no está configurado en el servidor.",
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ googleDisponible: false, passwordDisponible: true });

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(ERRORES[oauthError] ?? "Algo salió mal. Probá de nuevo.");
    }
  }, [searchParams]);

  useEffect(() => {
    getAuthConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand">MetricsField</div>
        <p className="muted">Panel de la agencia · acceso restringido</p>
        {error && <p className="error">{error}</p>}

        {config.googleDisponible && (
          <>
            <a href="/api/admin/oauth/start" className="btn-google">
              <GoogleIcon />
              Entrar con Google
            </a>
            <div className="login-divider">
              <span>o</span>
            </div>
          </>
        )}

        {config.passwordDisponible ? (
          <>
            <label>
              Contraseña del equipo
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required={!config.googleDisponible}
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </>
        ) : (
          <p className="muted">
            El panel está bloqueado porque falta configurar{" "}
            <code>ADMIN_PASSWORD</code> en el servidor.
          </p>
        )}

        <p className="muted login-footer">
          ¿Sos cliente? Entrá con el link privado que te mandamos por WhatsApp.
        </p>
        <p className="muted login-footer small">
          <a href="/privacy">Privacidad</a> · <a href="/terms">Términos</a>
        </p>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="google-icon" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
