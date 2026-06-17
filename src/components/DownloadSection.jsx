import { FiDownload, FiSmartphone, FiArrowRight } from 'react-icons/fi';
import { SiGoogleplay } from 'react-icons/si';
import useScrollReveal from '../hooks/useScrollReveal';
import config from '../config';

export default function DownloadSection() {
  const ref = useScrollReveal();

  return (
    <section className="download section" id="telecharger" ref={ref}>
      <div className="container">
        <div className="download-inner">
          <div className="download-icon reveal">
            <FiSmartphone size={56} />
          </div>
          <h2 className="download-title reveal">
            Téléchargez <span className="gradient-text">AZÔTCHÉ</span> maintenant
          </h2>
          <p className="download-desc reveal">
            Disponible sur Google Play pour Android. Trouvez les meilleurs artisans
            du Bénin directement depuis votre téléphone.
          </p>

          <div className="download-buttons reveal">
            {/* Bouton Play Store principal */}
            <a
              href={config.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-playstore"
            >
              <SiGoogleplay size={32} />
              <div className="btn-playstore-text">
                <span className="btn-playstore-sub">Disponible sur</span>
                <span className="btn-playstore-main">Google Play</span>
              </div>
            </a>

            {/* Lien APK alternatif discret */}
            <a
              href={config.apkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-apk-alt"
            >
              <FiDownload size={16} />
              Télécharger l'APK directement
              <FiArrowRight size={14} />
            </a>
          </div>

          <p className="download-note reveal">
            <FiSmartphone style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Android 8.0+ • ~15 Mo • Version{' '}
            <span className="version">{config.appVersion}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
