/**
 * api/fedapay.js — Vercel Serverless Function
 * Proxy sécurisé FedaPay pour l'application Azôtché
 *
 * Remplace Firebase Cloud Functions (non déployées).
 * La clé secrète FedaPay n'est JAMAIS exposée côté client.
 *
 * Variables d'environnement requises (Vercel dashboard) :
 *   FEDAPAY_SECRET_KEY     — clé secrète FedaPay (sk_live_xxx ou sk_sandbox_xxx)
 *   FIREBASE_PROJECT_ID    — ID du projet Firebase
 *   FIREBASE_CLIENT_EMAIL  — email du compte de service Firebase
 *   FIREBASE_PRIVATE_KEY   — clé privée du compte de service Firebase
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// ── Initialiser Firebase Admin (singleton) ───────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// ── Constantes FedaPay ────────────────────────────────────────────────────────
const IS_SANDBOX = process.env.FEDAPAY_SANDBOX === 'true';
const FEDAPAY_BASE = IS_SANDBOX
  ? 'https://sandbox-api.fedapay.com'
  : 'https://api.fedapay.com';

function cleanPhone(phone) {
  let p = (phone || '').replace(/[^\d]/g, '');
  if (p.startsWith('229')) p = p.substring(3);
  return p;
}

function fedapayHeaders(secretKey) {
  return {
    'Content-Type':   'application/json',
    'Authorization':  `Bearer ${secretKey}`,
    'FedaPay-Version': '2021-01-01',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://azotche.bj';
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée' });

  const SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
  if (!SECRET_KEY) {
    return res.status(500).json({ error: 'FedaPay non configuré — FEDAPAY_SECRET_KEY manquante' });
  }

  const { action, ...data } = req.body || {};

  try {
    // ── ACTION : CREATE ───────────────────────────────────────────────────────
    if (action === 'create') {
      const {
        amount, description,
        customerFirstName, customerLastName, customerPhone,
        callbackUrl = 'https://azotche.bj/payment/callback',
      } = data;

      if (!amount || !description || !customerFirstName || !customerPhone) {
        return res.status(400).json({ error: 'Paramètres manquants (amount, description, customerFirstName, customerPhone)' });
      }

      // Étape 1 — Créer la transaction FedaPay
      const txRes = await fetch(`${FEDAPAY_BASE}/v1/transactions`, {
        method:  'POST',
        headers: fedapayHeaders(SECRET_KEY),
        body: JSON.stringify({
          description,
          amount,
          currency:     { iso: 'XOF' },
          callback_url: callbackUrl,
          customer: {
            firstname:    customerFirstName,
            lastname:     customerLastName || 'Client',
            phone_number: { number: cleanPhone(customerPhone), country: 'bj' },
          },
        }),
      });

      if (!txRes.ok) {
        const errData = await txRes.json().catch(() => ({}));
        console.error('[FedaPay] Create error:', errData);
        return res.status(400).json({ error: errData?.message || 'Erreur création transaction FedaPay' });
      }

      const txData  = await txRes.json();
      const tx      = txData['v1/transaction'];
      const txId    = tx?.id;
      if (!txId) return res.status(500).json({ error: 'ID transaction FedaPay introuvable' });

      // Étape 2 — Générer le token de paiement
      const tokenRes = await fetch(`${FEDAPAY_BASE}/v1/transactions/${txId}/token`, {
        method:  'POST',
        headers: fedapayHeaders(SECRET_KEY),
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        console.error('[FedaPay] Token error:', errData);
        return res.status(400).json({ error: errData?.message || 'Erreur génération token FedaPay' });
      }

      const tokenData = await tokenRes.json();
      const paymentUrl = tokenData.url
        || (tokenData.token ? `https://checkout.fedapay.com/${tokenData.token}` : null);

      if (!paymentUrl) return res.status(500).json({ error: 'URL de paiement introuvable' });

      return res.status(200).json({ transactionId: txId, paymentUrl });
    }

    // ── ACTION : VERIFY ───────────────────────────────────────────────────────
    if (action === 'verify') {
      const { fedapayTransactionId, localTransactionId, type, dureeJours, uid } = data;

      if (!fedapayTransactionId || !localTransactionId || !uid) {
        return res.status(400).json({ error: 'Paramètres manquants (fedapayTransactionId, localTransactionId, uid)' });
      }

      // Vérifier le statut chez FedaPay
      const statusRes = await fetch(
        `${FEDAPAY_BASE}/v1/transactions/${fedapayTransactionId}`,
        { headers: { Authorization: `Bearer ${SECRET_KEY}` } }
      );

      if (!statusRes.ok) {
        const errData = await statusRes.json().catch(() => ({}));
        return res.status(400).json({ error: errData?.message || 'Erreur vérification FedaPay' });
      }

      const statusData = await statusRes.json();
      const tx         = statusData['v1/transaction'];
      const status     = tx?.status;
      console.log(`[FedaPay] Transaction ${fedapayTransactionId} — statut: ${status}`);

      // Transaction non approuvée
      if (status !== 'approved') {
        await db.collection('transactions').doc(localTransactionId).update({
          statut:    status === 'declined' ? 'refuse' : 'echec',
          updatedAt: FieldValue.serverTimestamp(),
        }).catch(console.error);
        return res.status(200).json({ success: false, status });
      }

      // Paiement approuvé — appliquer les effets dans Firestore
      const batch    = db.batch();
      const userRef  = db.collection('users').doc(uid);
      const proRef   = db.collection('pros').doc(uid);
      const txRef    = db.collection('transactions').doc(localTransactionId);
      const now      = new Date();

      batch.update(txRef, { statut: 'succes', updatedAt: FieldValue.serverTimestamp() });

      if (type === 'activation' || type === 'abonnement') {
        const fin = new Date(now);
        fin.setMonth(fin.getMonth() + 1);
        const finTs = Timestamp.fromDate(fin);
        batch.update(userRef, {
          plan: 'pro', statut: 'actif', comptePayant: true,
          finAbonnement: finTs, updatedAt: FieldValue.serverTimestamp(),
        });
        batch.set(proRef, { boostActif: true, finBoost: finTs }, { merge: true });

      } else if (type === 'premium') {
        const fin = new Date(now);
        fin.setMonth(fin.getMonth() + 1);
        const finTs = Timestamp.fromDate(fin);
        batch.update(userRef, {
          plan: 'premium', statut: 'actif', comptePayant: true,
          finAbonnement: finTs, updatedAt: FieldValue.serverTimestamp(),
        });
        batch.set(proRef, { boostActif: true, finBoost: finTs }, { merge: true });

      } else if (type === 'boost') {
        const jours = Number(dureeJours) || 7;
        const fin   = new Date(now);
        fin.setDate(fin.getDate() + jours);
        batch.set(proRef, {
          boostActif: true,
          finBoost:   Timestamp.fromDate(fin),
        }, { merge: true });

      } else if (type === 'publication') {
        const userSnap   = await userRef.get();
        const quotaActuel = userSnap.data()?.quotaPublications || 3;
        batch.update(userRef, {
          quotaPublications: quotaActuel + 5,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      console.log(`[FedaPay] Effets appliqués pour uid=${uid} type=${type}`);
      return res.status(200).json({ success: true, status: 'approved', type });
    }

    return res.status(400).json({ error: `Action inconnue: ${action}` });

  } catch (err) {
    console.error('[FedaPay API] Erreur interne:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur interne' });
  }
}
