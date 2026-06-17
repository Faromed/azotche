import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiCheck, FiLoader, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import usePageMeta from '../hooks/usePageMeta';
import { VILLES } from '../config/metiers';

export default function InscriptionClientPage() {
  usePageMeta({ title: 'Créer mon compte client — AZÔTCHÉ' });

  const { user, profile, registerClient, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/connexion', { replace: true });
    if (profile?.role === 'client') navigate('/client-dashboard', { replace: true });
  }, [user, profile, navigate]);

  const [form, setForm] = useState({ nom: '', ville: '', referredBy: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.nom.trim() || form.nom.trim().length < 2)
      e.nom = 'Votre nom doit contenir au moins 2 caractères.';
    if (!form.ville)
      e.ville = 'Veuillez choisir votre ville.';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const res = await registerClient(form);
    setLoading(false);
    if (res.success) navigate('/client-dashboard', { replace: true });
    else setErrors({ global: res.error || "Erreur lors de l'inscription." });
  };

  return (
    <div className="insc-client-page">
      <div className="insc-client-card">

        {/* En-tête verte */}
        <div className="insc-client-header">
          <div className="insc-client-icon"><FiUser size={28} /></div>
          <h1>Créer mon compte</h1>
          <p>Trouvez des artisans de confiance au Bénin</p>
        </div>

        {/* Formulaire */}
        <form className="insc-client-form" onSubmit={handleSubmit} noValidate>

          {errors.global && <div className="inscription-error">{errors.global}</div>}

          <div className="form-group">
            <label>Votre nom <span className="req">*</span></label>
            <input
              type="text"
              className={`form-input ${errors.nom ? 'error' : ''}`}
              placeholder="Ex: Aimée Hounkpe"
              value={form.nom}
              onChange={e => set('nom', e.target.value)}
              autoCapitalize="words"
              autoFocus
            />
            {errors.nom && <span className="form-error">{errors.nom}</span>}
          </div>

          <div className="form-group">
            <label>Votre ville <span className="req">*</span></label>
            <div className="select-wrap">
              <select
                className={`form-input ${errors.ville ? 'error' : ''}`}
                value={form.ville}
                onChange={e => set('ville', e.target.value)}
              >
                <option value="">Choisir votre ville</option>
                {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {errors.ville && <span className="form-error">{errors.ville}</span>}
          </div>

          <div className="form-group">
            <label>Code de parrainage <span className="form-hint-inline">(optionnel)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: C1A2B3"
              value={form.referredBy}
              onChange={e => set('referredBy', e.target.value.toUpperCase())}
              maxLength={10}
            />
            <span className="form-hint">Si quelqu'un vous a recommandé Azôtché</span>
          </div>

          <button
            type="submit"
            className="btn btn-green btn-full insc-client-submit"
            disabled={loading}
          >
            {loading ? <><FiLoader className="spin" /> Création…</> : <>Créer mon compte <FiCheck /></>}
          </button>

          <button
            type="button"
            className="insc-client-cancel"
            onClick={async () => { await signOut(); navigate('/connexion', { replace: true }); }}
          >
            Annuler
          </button>
        </form>
      </div>
    </div>
  );
}
