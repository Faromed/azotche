import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protège une route : redirige vers /connexion si l'utilisateur n'est pas connecté.
 * Conserve l'URL d'origine dans `state.from` pour rediriger après connexion.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Attendre que Firebase Auth soit initialisé
  if (loading) {
    return (
      <div className="route-loading">
        <div className="route-loading-spinner" />
      </div>
    );
  }

  // Non connecté → redirection vers /connexion
  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  // Rôle requis non satisfait : redirection intelligente selon le rôle réel
  if (requiredRole && profile?.role !== requiredRole) {
    if (profile?.role === 'pro')    return <Navigate to="/espace-pro"       replace />;
    if (profile?.role === 'client') return <Navigate to="/client-dashboard" replace />;
    return <Navigate to="/connexion" replace />;
  }

  return children;
}
