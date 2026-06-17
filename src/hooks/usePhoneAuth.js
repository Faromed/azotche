import { useState, useEffect, useRef, useCallback } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';

// CRITIQUE : doit etre defini AVANT toute creation de RecaptchaVerifier
// En DEV, Firebase utilise un MockReCaptchaWidget interne (pas de reseau Google)
// qui genere un token accepte par le serveur pour les numeros de test
if (import.meta.env.DEV) {
  auth.settings.appVerificationDisabledForTesting = true;
}

function parsePhoneError(e) {
  switch (e.code) {
    case 'auth/invalid-phone-number':
      return 'Numero invalide. Format attendu : 01XXXXXXXX';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Reessayez dans quelques minutes.';
    case 'auth/invalid-verification-code':
      return 'Code incorrect. Verifiez et reessayez.';
    case 'auth/code-expired':
      return 'Code expire. Demandez un nouveau code.';
    case 'auth/operation-not-allowed':
      return 'Authentification SMS non activee. Contactez le support.';
    case 'auth/quota-exceeded':
      return 'Quota SMS depasse. Reessayez demain.';
    case 'auth/missing-phone-number':
      return 'Veuillez entrer votre numero de telephone.';
    case 'auth/network-request-failed':
      return 'Erreur reseau. Verifiez votre connexion internet.';
    case 'auth/captcha-check-failed':
      return 'Verification reCAPTCHA echouee. Rechargez la page.';
    default:
      return e.message || 'Une erreur est survenue. Reessayez.';
  }
}

/**
 * Hook pour l authentification par numero de telephone (OTP SMS).
 * DEV  : appVerificationDisabledForTesting=true -> MockReCaptcha interne Firebase
 * PROD : vrai RecaptchaVerifier invisible
 */
export function usePhoneAuth(recaptchaContainerId = 'recaptcha-container') {
  const [step, setStep]       = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const verifierRef = useRef(null);
  const confirmRef  = useRef(null);

  const initVerifier = useCallback(() => {
    // Nettoyer l ancien verifier si present
    try { verifierRef.current?.clear(); } catch (_) {}
    verifierRef.current = null;

    try {
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setError('Session reCAPTCHA expiree. Rechargez la page.');
          verifierRef.current = null;
        },
      });
      verifierRef.current = verifier;
      // render() non bloquant : si ca echoue en dev (rare), sendOTP appellera
      // verify() qui rappelle render() en interne de toute facon
      verifier.render().catch(e => {
        console.warn('[PhoneAuth] render():', e.code || e.message);
      });
    } catch (e) {
      console.error('[PhoneAuth] RecaptchaVerifier init:', e);
    }
  }, [recaptchaContainerId]);

  useEffect(() => {
    initVerifier();
    return () => {
      try { verifierRef.current?.clear(); } catch (_) {}
      verifierRef.current = null;
    };
  }, [initVerifier]);

  const sendOTP = useCallback(async (phoneNumber) => {
    setError(null);
    setLoading(true);
    try {
      // Re-init verifier si null (apres une erreur precedente)
      if (!verifierRef.current) initVerifier();
      if (!verifierRef.current) throw new Error('reCAPTCHA non initialise. Rechargez la page.');

      const result = await signInWithPhoneNumber(auth, phoneNumber, verifierRef.current);
      confirmRef.current = result;
      setStep('otp');
      setLoading(false);
      return { success: true };
    } catch (e) {
      // Recreer le verifier apres echec pour permettre un retry
      try { verifierRef.current?.clear(); } catch (_) {}
      verifierRef.current = null;
      setError(parsePhoneError(e));
      setLoading(false);
      return { success: false };
    }
  }, [initVerifier]);

  const verifyOTP = useCallback(async (code) => {
    if (!confirmRef.current) return { success: false, error: 'Session expiree.' };
    setError(null);
    setLoading(true);
    try {
      const result = await confirmRef.current.confirm(code);
      setLoading(false);
      return { success: true, user: result.user };
    } catch (e) {
      setError(parsePhoneError(e));
      setLoading(false);
      return { success: false };
    }
  }, []);

  const resetStep = useCallback(() => {
    setStep('phone');
    setError(null);
    confirmRef.current = null;
    // Re-init verifier pour le prochain envoi
    initVerifier();
  }, [initVerifier]);

  return { step, sendOTP, verifyOTP, resetStep, loading, error, setError };
}
