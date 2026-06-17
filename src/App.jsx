import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

// Pages marketing
import Home from './pages/Home';
import PromoPage from './pages/PromoPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import LegalMentions from './pages/LegalMentions';
import FAQPage from './pages/FAQPage';
import SupportPage from './pages/SupportPage';

// Pages app -- publiques
import ArtisansPage from './pages/ArtisansPage';
import ArtisanProfilePage from './pages/ArtisanProfilePage';
import ConnexionPage from './pages/ConnexionPage';
import PublicationsPage from './pages/PublicationsPage';
import PublicationDetailPage from './pages/PublicationDetailPage';
import MapPage from './pages/MapPage';

// Pages app -- onboarding (apres OTP)
import ChoixRolePage from './pages/ChoixRolePage';
import InscriptionPage from './pages/InscriptionPage';
import InscriptionClientPage from './pages/InscriptionClientPage';

// Pages app -- authentifiees
import DashboardPage from './pages/DashboardPage';
import EspaceProPage from './pages/EspaceProPage';
import MonComptePage from './pages/MonComptePage';
import ClientDashboardPage from './pages/ClientDashboardPage';
import AbonnementsPage from './pages/AbonnementsPage';
import BoostPage from './pages/BoostPage';
import ParrainagePage from './pages/ParrainagePage';
import VerificationIdentitePage from './pages/VerificationIdentitePage';
import NotFoundPage from './pages/NotFoundPage';

function AppShell() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          {/* Marketing */}
          <Route path="/"                              element={<Home />} />
          <Route path="/promo"                         element={<PromoPage />} />
          <Route path="/politique-de-confidentialite"  element={<PrivacyPolicy />} />
          <Route path="/conditions-generales"          element={<TermsOfUse />} />
          <Route path="/mentions-legales"              element={<LegalMentions />} />
          <Route path="/faq"                           element={<FAQPage />} />
          <Route path="/support"                       element={<SupportPage />} />

          {/* App publique */}
          <Route path="/artisans"          element={<ArtisansPage />} />
          <Route path="/artisans/:uid"     element={<ArtisanProfilePage />} />
          <Route path="/carte"             element={<MapPage />} />
          <Route path="/publications"      element={<PublicationsPage />} />
          <Route path="/publications/:id"  element={<PublicationDetailPage />} />
          <Route path="/connexion"         element={<ConnexionPage />} />

          {/* Onboarding (apres OTP, avant profil cree) */}
          <Route path="/choix-role"         element={<ChoixRolePage />} />
          <Route path="/inscription"        element={<InscriptionPage />} />
          <Route path="/inscription-client" element={<InscriptionClientPage />} />

          {/* Espace Pro */}
          <Route path="/espace-pro" element={
            <ProtectedRoute requiredRole="pro"><EspaceProPage /></ProtectedRoute>
          } />
          <Route path="/abonnements" element={
            <ProtectedRoute requiredRole="pro"><AbonnementsPage /></ProtectedRoute>
          } />
          <Route path="/boost" element={
            <ProtectedRoute requiredRole="pro"><BoostPage /></ProtectedRoute>
          } />
                    <Route path="/parrainage" element={
            <ProtectedRoute requiredRole="pro"><ParrainagePage /></ProtectedRoute>
          } />
          <Route path="/certification" element={
            <ProtectedRoute requiredRole="pro"><VerificationIdentitePage /></ProtectedRoute>
          } />

          {/* Espace Client */}
          <Route path="/client-dashboard" element={
            <ProtectedRoute requiredRole="client"><ClientDashboardPage /></ProtectedRoute>
          } />

          {/* Compte generique */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/mon-compte" element={
            <ProtectedRoute><MonComptePage /></ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
