import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiPhone, FiShield, FiEdit2, FiRefreshCw, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { usePhoneAuth } from '../hooks/usePhoneAuth';
import usePageMeta from '../hooks/usePageMeta';

const BENIN_PREFIX = '+229';

export default function ConnexionPage() {
  usePageMeta({ title: 'Connexion — AZOTCHE' });

  const { user, loading, checkProfileExists } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // mode: 'login' | 'register'
  const [mode, setMode] = useState(location.state?.mode || 'login');

  const { step, sendOTP, verifyOTP, resetStep, loading: otpLoading, error, setError }
    = usePhoneAuth('recaptcha-container');

  const [phone, setPhone]           = useState('');
  const [otp,   setOtp]             = useState('');
  const [resendCooldown, setResend] = useState(0);

  // Rediriger si deja connecte
  useEffect(() => {
    if (!user || loading) return;
    redirectByRole(user.uid);
  }, [user, loading]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResend(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  /* ── Redirection selon le role ── */
  const redirectByRole = async (uid) => {
    const { exists, role } = await checkProfileExists(uid);
    if (!exists) {
      navigate('/choix-role', { replace: true });
    } else if (role === 'pro') {
      navigate('/espace-pro', { replace: true });
    } else if (role === 'client') {
      navigate('/client-dashboard', { replace: true });
    } else if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/choix-role', { replace: true });
    }
  };

  const normalizePhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('229'))                          return '+' + digits;
    if (digits.startsWith('01') && digits.length === 10)  return BENIN_PREFIX + digits;
    if (digits.length === 8)                               return BENIN_PREFIX + digits;
    return digits.length > 0 ? '+' + digits : raw;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone.trim()) { setError('Entrez votre numero de telephone.'); return; }
    const res = await sendOTP(normalizePhone(phone.trim()));
    if (res.success) setResend(60);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { setError('Le code doit contenir 6 chiffres.'); return; }
    const res = await verifyOTP(otp);
    if (res.success && res.user) {
      await redirectByRole(res.user.uid);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtp('');
    const res = await sendOTP(normalizePhone(phone.trim()));
    if (res.success) setResend(60);
  };

  const switchMode = (m) => {
    setMode(m); setError(null); setPhone(''); setOtp('');
    if (step !== 'phone') resetStep();
  };

  return (
    <div className="connexion-page">
      <div id="recaptcha-container" />

      <div className="connexion-card">
        <Link to="/" className="connexion-logo">
          <img src="/logo.png" alt="AZOTCHE" />
          <span>AZO<span>TCHE</span></span>
        </Link>

        {/* Tab switcher */}
        <div className="connexion-tabs">
          <button
            className={`connexion-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            <FiPhone /> Me connecter
          </button>
          <button
            className={`connexion-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            <FiUserPlus /> Creer mon compte
          </button>
        </div>

        {step === 'phone' ? (
          <>
            <div className="connexion-icon-wrap">
              <FiPhone className="connexion-main-icon" />
            </div>
            <h1>{mode === 'register' ? 'Inscription' : 'Connexion'}</h1>
            <p className="connexion-sub">
              {mode === 'register'
                ? 'Entrez votre numero pour creer votre compte.'
                : 'Entrez votre numero pour recevoir un code SMS.'}
            </p>

            {error && <div className="connexion-error">{error}</div>}

            <form onSubmit={handleSendOTP} className="otp-form">
              <div className="phone-input-group">
                <span className="phone-prefix">BJ +229</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="01 XX XX XX XX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                  autoFocus
                  className="phone-input"
                  maxLength={15}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={otpLoading}
              >
                {otpLoading ? 'Envoi en cours...' : 'Recevoir le code SMS'}
              </button>
            </form>

            {mode === 'register' && (
              <p className="connexion-register-hint">
                Apres verification, vous choisissez votre profil : artisan ou client.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="connexion-icon-wrap">
              <FiShield className="connexion-main-icon" />
            </div>
            <h1>Verification</h1>
            <p className="connexion-sub">
              Code envoye au <strong>{normalizePhone(phone.trim())}</strong>
              <button className="inline-edit-btn" onClick={() => { resetStep(); setOtp(''); }} title="Modifier">
                <FiEdit2 />
              </button>
            </p>

            {error && <div className="connexion-error">{error}</div>}

            <form onSubmit={handleVerifyOTP} className="otp-form">
              <input
                type="text"
                inputMode="numeric"
                placeholder="______"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                autoFocus
                className="otp-input"
                maxLength={6}
              />
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={otpLoading || otp.length < 6}
              >
                {otpLoading ? 'Verification...' : 'Confirmer le code'}
              </button>
            </form>

            <button className="resend-btn" onClick={handleResend} disabled={resendCooldown > 0}>
              <FiRefreshCw />
              {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
            </button>
          </>
        )}

        <Link to="/artisans" className="connexion-back">
          <FiArrowLeft /> Continuer sans connexion
        </Link>
      </div>
    </div>
  );
}
