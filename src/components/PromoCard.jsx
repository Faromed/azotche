import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { FiDownload, FiShare2 } from 'react-icons/fi';

export default function PromoCard({ data }) {
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const exportCard = async () => {
    if (!cardRef.current) return null;
    // On exporte à 1080x1080 (400 * pixelRatio 2.7)
    return await toPng(cardRef.current, {
      pixelRatio: 2.7,
      quality: 1,
      cacheBust: true,
    });
  };

  const download = async () => {
    setLoading(true);
    try {
      const dataUrl = await exportCard();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `azotche-promo-${data.id}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Erreur export:', err);
    }
    setLoading(false);
  };

  const share = async () => {
    setLoading(true);
    try {
      const dataUrl = await exportCard();
      if (!dataUrl) { setLoading(false); return; }

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `azotche-promo-${data.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'AZÔTCHÉ',
          text: 'Téléchargez AZÔTCHÉ via  et trouvez les meilleurs artisans du Bénin !',
        });
      } else {
        download();
      }
    } catch (err) {
      console.error('Erreur partage:', err);
      download();
    }
    setLoading(false);
  };

  return (
    <div className="promo-wrapper">
      {/* ═══ CARD EXPORTABLE ═══ */}
      <div
        className="promo-card"
        ref={cardRef}
        style={{ background: data.gradient }}
      >
        {/* Décorations */}
        <div className="promo-pattern" />
        <div className="promo-circle promo-circle-1" />
        <div className="promo-circle promo-circle-2" />
        <div className="promo-circle promo-circle-3" />

        {/* Haut : Logo + Tag */}
        <div className="promo-top-bar">
          <div className="promo-top-logo-row">
            <img src="/logo.png" alt="" className="promo-top-logo-img" />
            <span className="promo-top-logo">AZÔTCHÉ</span>
          </div>
          {data.tag && <div className="promo-top-tag">{data.tag}</div>}
        </div>

        {/* Centre : Contenu */}
        <div className="promo-card-content">
          <div className="promo-emoji">{data.emoji}</div>
          <div className="promo-headline">{data.headline}</div>
          <div className="promo-divider" />
          <div className="promo-subline">{data.subline}</div>
        </div>

        {/* Bas : CTA */}
        <div className="promo-card-footer">
          <div className="promo-cta-box">
            <div className="promo-cta-icon">📲</div>
            <div className="promo-cta-text">
              <div className="promo-cta-label">Téléchargez l'application</div>
              <div className="promo-cta-brand">AZÔTCHÉ</div>
            </div>
          </div>
          <div className="promo-slogan">
            {data.slogan || 'Les talents de chez nous, à portée de main 🇧🇯'}
          </div>
        </div>
      </div>

      {/* ═══ BOUTONS ═══ */}
      <div className="promo-actions">
        <button
          className="promo-action-btn promo-download-btn"
          onClick={download}
          disabled={loading}
        >
          <FiDownload /> {loading ? 'Export...' : 'Télécharger'}
        </button>
        <button
          className="promo-action-btn promo-share-btn"
          onClick={share}
          disabled={loading}
        >
          <FiShare2 /> Partager
        </button>
      </div>
    </div>
  );
}