import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Page de redirection intelligente après connexion.
 * - Artisan (role === 'pro') → /espace-pro
 * - Client → /mon-compte
 */
export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (profile?.role === 'pro') {
      navigate('/espace-pro', { replace: true });
    } else {
      navigate('/mon-compte', { replace: true });
    }
  }, [profile, loading, navigate]);

  return (
    <div className="route-loading">
      <div className="route-loading-spinner" />
    </div>
  );
}
