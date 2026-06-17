/**
 * usePayment — Hook paiement FedaPay pour Azotche Web
 *
 * MODE DEV (npm run dev)
 *   - Appel direct FedaPay via proxy Vite (pas de CORS)
 *   - Cle secrete dans VITE_FEDAPAY_SECRET (.env.local)
 *
 * MODE PROD (Vercel)
 *   - Appel POST /api/fedapay (route Vercel serverless)
 *   - Cle secrete cote serveur (FEDAPAY_SECRET_KEY)
 *   - Firestore mis a jour par Firebase Admin SDK (serveur)
 */

import { useState, useCallback } from 'react';
import {
  collection, addDoc, doc, updateDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Detection de l'environnement
const IS_DEV      = import.meta.env.DEV;
const USE_SANDBOX = import.meta.env.VITE_FEDAPAY_SANDBOX === 'true';
const DEV_SECRET  = import.meta.env.VITE_FEDAPAY_SECRET || '';
const DEV_PROXY   = USE_SANDBOX ? '/fedapay-sandbox' : '/fedapay-proxy';

function cleanPhone(phone) {
  let p = (phone || '').replace(/[^\d]/g, '');
  if (p.startsWith('229')) p = p.substring(3);
  return p;
}

function devHeaders() {
  return {
    'Content-Type':    'application/json',
    'Authorization':   `Bearer ${DEV_SECRET}`,
    'FedaPay-Version': '2021-01-01',
  };
}

// =============================================================================
//  createFedaPayTransaction
// =============================================================================
async function createFedaPayTransaction({
  amount, description,
  customerFirstName, customerLastName, customerPhone,
  callbackUrl,
}) {
  const cbUrl = callbackUrl || `${window.location.origin}/payment/callback`;

  if (IS_DEV) {
    if (!DEV_SECRET) {
      throw new Error(
        'Paiement non configure en developpement.\n' +
        'Creez un fichier .env.local avec :\n' +
        'VITE_FEDAPAY_SECRET=sk_live_votre_cle_fedapay'
      );
    }

    const txRes = await fetch(`${DEV_PROXY}/v1/transactions`, {
      method:  'POST',
      headers: devHeaders(),
      body: JSON.stringify({
        description, amount,
        currency:     { iso: 'XOF' },
        callback_url: cbUrl,
        customer: {
          firstname:    customerFirstName,
          lastname:     customerLastName || 'Client',
          phone_number: { number: cleanPhone(customerPhone), country: 'bj' },
        },
      }),
    });

    if (!txRes.ok) {
      const err = await txRes.json().catch(() => ({}));
      throw new Error(err.message || `FedaPay create error ${txRes.status}`);
    }

    const txData = await txRes.json();
    const txId   = txData['v1/transaction']?.id;
    if (!txId) throw new Error('ID transaction FedaPay introuvable dans la reponse');

    const tokenRes = await fetch(`${DEV_PROXY}/v1/transactions/${txId}/token`, {
      method:  'POST',
      headers: devHeaders(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      throw new Error(err.message || `FedaPay token error ${tokenRes.status}`);
    }

    const tokenData  = await tokenRes.json();
    const paymentUrl = tokenData.url
      || (tokenData.token ? `https://checkout.fedapay.com/${tokenData.token}` : null);

    if (!paymentUrl) throw new Error('URL de paiement FedaPay introuvable');
    return { transactionId: txId, paymentUrl };
  }

  // PROD
  const res = await fetch('/api/fedapay', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      amount, description,
      customerFirstName, customerLastName, customerPhone,
      callbackUrl: cbUrl,
    }),
  });

  const respData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(respData.error || `Erreur API paiement (${res.status})`);
  return respData;
}

// =============================================================================
//  verifyFedaPayTransaction
// =============================================================================
async function verifyFedaPayTransaction({
  fedapayTransactionId, localTransactionId, type, dureeJours, uid,
}) {
  if (IS_DEV) {
    const res = await fetch(
      `${DEV_PROXY}/v1/transactions/${fedapayTransactionId}`,
      { headers: { Authorization: `Bearer ${DEV_SECRET}` } }
    );

    if (!res.ok) throw new Error(`FedaPay verify error ${res.status}`);

    const data   = await res.json();
    const status = data['v1/transaction']?.status;

    if (status !== 'approved') {
      // hasOnly(['statut']) => pas de updatedAt
      await updateDoc(doc(db, 'transactions', localTransactionId), {
        statut: status === 'declined' ? 'refuse' : 'echec',
      }).catch(console.error);
      return { success: false, status };
    }

    await applyEffectsClientSide({ uid, type, dureeJours, localTransactionId });
    return { success: true, status: 'approved' };
  }

  // PROD
  const res = await fetch('/api/fedapay', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'verify',
      fedapayTransactionId, localTransactionId,
      type, dureeJours, uid,
    }),
  });

  const respData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(respData.error || `Erreur verification paiement (${res.status})`);
  return respData;
}

// =============================================================================
//  applyEffectsClientSide (dev uniquement)
//  Regles Firestore :
//    transactions => hasOnly(['statut']) => pas de updatedAt
//    users        => isSubscriptionActivation => pas de updatedAt
// =============================================================================
async function applyEffectsClientSide({ uid, type, dureeJours, localTransactionId }) {
  const now     = new Date();
  const userRef = doc(db, 'users', uid);
  const proRef  = doc(db, 'pros',  uid);
  const txRef   = doc(db, 'transactions', localTransactionId);

  await updateDoc(txRef, { statut: 'succes' }).catch(console.error);

  if (type === 'activation' || type === 'abonnement') {
    const fin = new Date(now);
    fin.setMonth(fin.getMonth() + 1);
    const finTs = Timestamp.fromDate(fin);
    await updateDoc(userRef, {
      plan: 'pro', statut: 'actif', comptePayant: true, finAbonnement: finTs,
    }).catch(console.error);
    await updateDoc(proRef, { boostActif: true, finBoost: finTs }).catch(() => {});
  } else if (type === 'premium') {
    const fin = new Date(now);
    fin.setMonth(fin.getMonth() + 1);
    const finTs = Timestamp.fromDate(fin);
    await updateDoc(userRef, {
      plan: 'premium', statut: 'actif', comptePayant: true, finAbonnement: finTs,
    }).catch(console.error);
    await updateDoc(proRef, { boostActif: true, finBoost: finTs }).catch(() => {});
  } else if (type === 'boost') {
    const jours = Number(dureeJours) || 7;
    const fin   = new Date(now);
    fin.setDate(fin.getDate() + jours);
    await updateDoc(proRef, {
      boostActif: true, finBoost: Timestamp.fromDate(fin),
    }).catch(() => {});
  }
}

// =============================================================================
//  usePayment — Hook React principal
// =============================================================================
export function usePayment() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(false);

  // Sauvegarder la transaction locale en Firestore
  // Regles Firestore : proUid == request.auth.uid && statut == 'enAttente'
  const createLocalTransaction = useCallback(async ({
    uid, type, montant, description, fedapayReference,
  }) => {
    const ref = await addDoc(collection(db, 'transactions'), {
      proUid: uid,                          // champ verifie par la regle Firestore
      type, montant, description,
      fedapayReference: String(fedapayReference),
      statut:    'enAttente',               // valeur exacte attendue par la regle
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }, []);

  // Flux principal : creer -> payer -> verifier
  const createAndPay = useCallback(async ({
    uid, type, montant, description,
    customerFirstName, customerLastName, customerPhone,
    dureeJours,
    onSuccess,
    onFailure,
  }) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { transactionId: fedapayTxId, paymentUrl } = await createFedaPayTransaction({
        amount: montant, description,
        customerFirstName, customerLastName, customerPhone,
      });

      const localTxId = await createLocalTransaction({
        uid, type, montant, description,
        fedapayReference: fedapayTxId,
      });

      await openPaymentModal(paymentUrl, {
        onComplete: async (completed) => {
          try {
            if (!completed) {
              setError('Paiement annule.');
              onFailure?.('cancelled');
              return;
            }

            const result = await verifyFedaPayTransaction({
              fedapayTransactionId: fedapayTxId,
              localTransactionId:   localTxId,
              type, dureeJours, uid,
            });

            if (result?.success) {
              setSuccess(true);
              onSuccess?.(result);
            } else {
              setError('Paiement non approuve. Veuillez reessayer ou contacter le support.');
              onFailure?.('not_approved');
            }
          } catch (verifyErr) {
            console.error('[usePayment] Erreur verification:', verifyErr);
            setError('Impossible de verifier le paiement. Contactez le support.');
            onFailure?.(verifyErr);
          } finally {
            setLoading(false);
          }
        },
      });

    } catch (err) {
      console.error('[usePayment] Erreur createAndPay:', err);
      const msg = err?.message?.includes('VITE_FEDAPAY_SECRET')
        ? err.message
        : err?.message || 'Erreur lors de la creation du paiement.';
      setError(msg);
      onFailure?.(err);
      setLoading(false);
    }
  }, [createLocalTransaction]);

  return { loading, error, success, createAndPay, setError };
}

// =============================================================================
//  openPaymentModal — Overlay iframe FedaPay Checkout
// =============================================================================
function openPaymentModal(paymentUrl, { onComplete }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fedapay-overlay';
    overlay.innerHTML = `
      <div class="fedapay-modal">
        <div class="fedapay-modal-header">
          <span class="fedapay-modal-title">
            <span class="fedapay-lock">&#x1F512;</span> Paiement securise &mdash; Mobile Money
          </span>
          <button class="fedapay-close-btn" title="Fermer">&#x2715;</button>
        </div>
        <div class="fedapay-modal-body">
          <iframe
            src="${paymentUrl}"
            class="fedapay-iframe"
            title="Paiement FedaPay"
            allow="payment"
          ></iframe>
        </div>
        <div class="fedapay-modal-footer">
          <span>Paiement securise par</span>
          <strong>FedaPay</strong>
          <span>&mdash; MTN MoMo &middot; Moov Money &middot; Celtis</span>
        </div>
      </div>
    `;

    const closeBtn = overlay.querySelector('.fedapay-close-btn');
    const cleanup  = (completed) => {
      overlay.classList.add('fedapay-overlay--closing');
      setTimeout(() => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        resolve();
        onComplete(completed);
      }, 300);
    };

    closeBtn.addEventListener('click', () => cleanup(false));

    const handleMessage = (event) => {
      const origin = event.origin || '';
      if (
        origin.includes('fedapay.com') ||
        event.data?.type === 'FEDAPAY_PAYMENT_COMPLETE'
      ) {
        const paid = event.data?.status === 'approved' || event.data?.success === true;
        window.removeEventListener('message', handleMessage);
        cleanup(paid);
      }
    };
    window.addEventListener('message', handleMessage);

    const iframe = overlay.querySelector('.fedapay-iframe');
    iframe.addEventListener('load', () => {
      try {
        const iframeUrl = iframe.contentWindow?.location?.href || '';
        if (
          iframeUrl.includes('/payment/callback') ||
          iframeUrl.includes('status=approved')
        ) {
          const paid = iframeUrl.includes('approved') || iframeUrl.includes('success');
          window.removeEventListener('message', handleMessage);
          cleanup(paid);
        }
      } catch {
        // Cross-origin normal FedaPay
      }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('fedapay-overlay--visible'));
  });
}
