import { FiDownload, FiSmartphone } from 'react-icons/fi';
import { FaGooglePlay } from 'react-icons/fa';
import useScrollReveal from '../hooks/useScrollReveal';
import config from '../config';

export default function DownloadSection() {
  const ref = useScrollReveal();

  return (
    <section className="download section" id="telecharger" ref={ref}>
      <div className="container">
        <div className="download-inner">
          <div className="download-icon reveal">📲</div>
          <h2 className="download-title reveal">
            Téléchargez <span className="gradient-text">AZÔTCHÉ</span> maintenant
          </h2>
          <p className="download-desc reveal">
            Disponible en APK pour Android. Trouvez les meilleurs artisans du Bénin directement depuis votre téléphone.
          </p>
          <div className="download-buttons reveal">
            <a href={config.apkDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large download-btn-apk">
              <FiDownload /> Télécharger l'APK (Android)
            </a>
            <div className="coming-soon-badge">
              <FaGooglePlay />
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>BIENTÔT SUR</div>
                <div style={{ fontWeight: 600 }}>Google Play</div>
              </div>
            </div>
          </div>
          <p className="download-note reveal">
            <FiSmartphone style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Android 8.0+ • ~15 Mo • Version <span className="version">{config.appVersion}</span>
          </p>
        </div>
      </div>
    </section>
  );
}