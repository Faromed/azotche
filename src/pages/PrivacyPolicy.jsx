export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1>Politique de <span className="gradient-text">Confidentialité</span></h1>
          <p>Dernière mise à jour : mars 2025</p>
        </div>
        <div className="legal-content">
          <h2>1. Introduction</h2>
          <p><strong>AZÔTCHÉ</strong> respecte votre vie privée. Cette politique décrit comment nous collectons, utilisons et protégeons vos données lorsque vous utilisez notre application mobile.</p>

          <h2>2. Données collectées</h2>
          <ul>
            <li><strong>Artisans (Pros)</strong> : Numéro de téléphone (pour l'authentification SMS), nom, métier, localisation (point GPS), photos de réalisations, description.</li>
            <li><strong>Clients (Public)</strong> : Aucune donnée personnelle n'est collectée pour la simple consultation. Seules les données de navigation anonymes sont recueillies via Firebase Analytics.</li>
            <li><strong>Données techniques</strong> : Type d'appareil, version Android/iOS, adresse IP (pour la sécurité).</li>
          </ul>

          <h2>3. Utilisation des données</h2>
          <ul>
            <li>Créer et gérer les comptes professionnels.</li>
            <li>Afficher les profils des artisans aux clients.</li>
            <li>Permettre la géolocalisation et la recherche par proximité.</li>
            <li>Envoyer des notifications push (nouvelles vues, contacts reçus).</li>
            <li>Améliorer l'expérience utilisateur via l'analyse de données anonymes.</li>
            <li>Prévenir les fraudes et les abus.</li>
          </ul>

          <h2>4. Stockage et sécurité</h2>
          <p>Vos données sont stockées sur les serveurs sécurisés de <strong>Firebase (Google Cloud Platform)</strong>. Nous mettons en œuvre :</p>
          <ul>
            <li>Communications chiffrées via HTTPS.</li>
            <li>Authentification par SMS (Firebase Auth).</li>
            <li>Règles de sécurité Firestore pour protéger les données.</li>
            <li>Compression des images avant stockage pour optimiser la bande passante.</li>
          </ul>

          <h2>5. Partage des données</h2>
          <p>Nous ne vendons jamais vos données. Les données peuvent être partagées avec :</p>
          <ul>
            <li><strong>Firebase / Google</strong> : Pour l'hébergement et l'analyse.</li>
            <li><strong>FedaPay</strong> : Pour le traitement des paiements (artisans Premium).</li>
            <li><strong>Autorités compétentes</strong> : En cas d'obligation légale.</li>
          </ul>

          <h2>6. Vos droits</h2>
          <p>Conformément à la réglementation de l'APDP du Bénin, vous disposez des droits suivants :</p>
          <ul>
            <li>Droit d'accès, de rectification et de suppression de vos données.</li>
            <li>Droit de geler ou supprimer votre compte depuis l'application.</li>
            <li>Droit d'opposition au traitement de vos données.</li>
          </ul>
          <p>Contact : <strong>support@azotche.com</strong></p>

          <h2>7. Durée de conservation</h2>
          <p>Les données sont conservées tant que votre compte est actif. Un compte gelé est définitivement supprimé après 3 mois d'inactivité.</p>

          <h2>8. Modifications</h2>
          <p>Nous pouvons modifier cette politique à tout moment. Les changements seront notifiés via l'application.</p>
        </div>
      </div>
    </div>
  );
}