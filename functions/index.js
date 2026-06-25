/**
 * Firebase Cloud Functions — Proxy sécurisé FedaPay
 * Projet : Azôtché (artisan-connect-benin)
 *
 * Ces fonctions permettent d'appeler l'API FedaPay côté serveur,
 * sans jamais exposer la clé secrète dans le code frontend.
 *
 * Déploiement :
 *   cd functions && npm install
 *   firebase deploy --only functions
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// ─── Constantes FedaPay ───────────────────────────────────────────────────────
const FEDAPAY_LIVE_URL    = 'https://api.fedapay.com';
const FEDAPAY_SANDBOX_URL = 'https://sandbox-api.fedapay.com';
const IS_SANDBOX          = false; // passer à true pour les tests
const BASE_URL            = IS_SANDBOX ? FEDAPAY_SANDBOX_URL : FEDAPAY_LIVE_URL;

// ─── Helper : récupérer la clé secrète depuis Firestore ──────────────────────
async function getSecretKey() {
  const doc = await db.collection('parametres').doc('config').get();
  if (!doc.exists) throw new Error('Configuration Firestore introuvable');
  const key = doc.data()?.fedapayCleSecrete;
  if (!key) throw new Error('fedapayCleSecrete non configurée dans Firestore');
  return key;
}

// ─── Helper : nettoyer le numéro de téléphone béninois ──────────────────────
function cleanPhone(phone) {
  let p = (phone || '').replace(/[^\d]/g, '');
  if (p.startsWith('229')) p = p.substring(3);
  return p;
}

// ══════════════════════════════════════════════════════════════════════════════
//  createFedaPayTransaction
//  Crée une transaction FedaPay et retourne l'URL de paiement
// ══════════════════════════════════════════════════════════════════════════════
exports.createFedaPayTransaction = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    // Vérification authentification
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const {
      amount,
      description,
      customerFirstName,
      customerLastName,
      customerPhone,
      callbackUrl = 'https://azotche.bj/payment/callback',
    } = request.data;

    if (!amount || !description || !customerFirstName || !customerPhone) {
      throw new HttpsError('invalid-argument', 'Paramètres manquants');
    }

    const secretKey = await getSecretKey();

    try {
      // ── Étape 1 : Créer la transaction ──────────────────────────────────
      const txRes = await axios.post(
        `${BASE_URL}/v1/transactions`,
        {
          description,
          amount,
          currency: { iso: 'XOF' },
          callback_url: callbackUrl,
          customer: {
            firstname: customerFirstName,
            lastname:  customerLastName || 'Client',
            phone_number: {
              number:  cleanPhone(customerPhone),
              country: 'bj',
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const transaction   = txRes.data['v1/transaction'];
      const transactionId = transaction.id;
      logger.info('FedaPay transaction créée:', transactionId);

      // ── Étape 2 : Générer le token de paiement ──────────────────────────
      const tokenRes = await axios.post(
        `${BASE_URL}/v1/transactions/${transactionId}/token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const paymentUrl = tokenRes.data.url;
      const token      = tokenRes.data.token;
      logger.info('FedaPay token généré pour:', transactionId);

      return { transactionId, token, paymentUrl };

    } catch (err) {
      logger.error('Erreur FedaPay createTransaction:', err.response?.data || err.message);
      throw new HttpsError(
        'internal',
        `Erreur FedaPay: ${err.response?.data?.message || err.message}`
      );
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
//  verifyFedaPayTransaction
//  Vérifie le statut d'une transaction et applique l'effet si réussie
// ══════════════════════════════════════════════════════════════════════════════
exports.verifyFedaPayTransaction = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const { fedapayTransactionId, localTransactionId, type, dureeJours } = request.data;
    if (!fedapayTransactionId || !localTransactionId) {
      throw new HttpsError('invalid-argument', 'IDs manquants');
    }

    const uid       = request.auth.uid;
    const secretKey = await getSecretKey();

    try {
      // ── Vérifier le statut chez FedaPay ─────────────────────────────────
      const res = await axios.get(
        `${BASE_URL}/v1/transactions/${fedapayTransactionId}`,
        {
          headers: { Authorization: `Bearer ${secretKey}` },
          timeout: 15000,
        }
      );

      const status = res.data['v1/transaction']?.status;
      logger.info(`FedaPay transaction ${fedapayTransactionId} status: ${status}`);

      // Valeur exacte de l'enum mobile TransactionStatus (transaction_model.dart) :
      // enAttente / reussi / echoue.
      if (status !== 'approved') {
        // Marquer la transaction locale comme échouée
        await db.collection('transactions').doc(localTransactionId).update({
          statut:    'echoue',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: false, status };
      }

      // ── Paiement approuvé → appliquer l'effet ───────────────────────────
      await db.collection('transactions').doc(localTransactionId).update({
        statut:    'reussi',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const now    = admin.firestore.Timestamp.now();
      const userRef = db.collection('users').doc(uid);
      const proRef  = db.collection('pros').doc(uid);

      if (type === 'activation' || type === 'abonnement') {
        // Plan Pro (abonnement mensuel)
        const fin = new Date();
        fin.setMonth(fin.getMonth() + 1);
        await userRef.update({
          plan:          'pro',
          statut:        'actif',
          comptePayant:  true,
          finAbonnement: admin.firestore.Timestamp.fromDate(fin),
          updatedAt:     now,
        });
        await proRef.update({
          boostActif: true,
          finBoost:   admin.firestore.Timestamp.fromDate(fin),
        });
        logger.info(`Plan Pro activé pour ${uid}`);

      } else if (type === 'premium') {
        // Plan Premium
        const fin = new Date();
        fin.setMonth(fin.getMonth() + 1);
        await userRef.update({
          plan:          'premium',
          statut:        'actif',
          comptePayant:  true,
          finAbonnement: admin.firestore.Timestamp.fromDate(fin),
          updatedAt:     now,
        });
        await proRef.update({
          boostActif: true,
          finBoost:   admin.firestore.Timestamp.fromDate(fin),
        });
        logger.info(`Plan Premium activé pour ${uid}`);

      } else if (type === 'boost') {
        // Boost ponctuel
        const jours = dureeJours || 7;
        const fin   = new Date();
        fin.setDate(fin.getDate() + jours);
        await proRef.update({
          boostActif: true,
          finBoost:   admin.firestore.Timestamp.fromDate(fin),
        });
        logger.info(`Boost ${jours}j activé pour ${uid}`);

      } else if (type === 'publication') {
        // Quota publication supplémentaire
        const userSnap = await userRef.get();
        const quotaActuel = userSnap.data()?.quotaPublications || 3;
        await userRef.update({ quotaPublications: quotaActuel + 5, updatedAt: now });
        logger.info(`Quota publications augmenté pour ${uid}`);
      }

      return { success: true, status };

    } catch (err) {
      logger.error('Erreur verifyFedaPayTransaction:', err.response?.data || err.message);
      throw new HttpsError(
        'internal',
        `Erreur vérification: ${err.response?.data?.message || err.message}`
      );
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
//  getBoostOptions
//  Retourne les options de boost depuis Firestore (pas besoin d'auth)
// ══════════════════════════════════════════════════════════════════════════════
exports.getBoostOptions = onCall(
  { region: 'us-central1', cors: true },
  async () => {
    const doc = await db.collection('parametres').doc('config').get();
    const options = doc.data()?.optionsPub;

    if (Array.isArray(options) && options.length > 0) {
      return options;
    }

    // Valeurs par défaut (même que Flutter)
    return [
      { nom: 'Boost 3 jours',  dureeJours: 3,  montant: 500  },
      { nom: 'Boost 7 jours',  dureeJours: 7,  montant: 1000 },
      { nom: 'Boost 30 jours', dureeJours: 30, montant: 3000 },
    ];
  }
);
