import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { FiDownload, FiShare2 } from 'react-icons/fi';

export default function PromoCard({ data }) {
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const download = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        quality: 0.95,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `azotche-promo-${data.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erreur export:', err);
    }
    setLoading(false);
  };

  const share = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, quality: 0.95, cacheBust: true });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `azotche-promo-${data.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'AZÔTCHÉ',
          text: 'Découvrez les meilleurs artisans du Bénin sur AZÔTCHÉ !',
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
      <div className="promo-card" ref={cardRef} style={{ background: data.gradient }}>
        <div className="promo-card-content">
          <div className="promo-emoji">{data.emoji}</div>
          <div className="promo-headline">{data.headline}</div>
          <div className="promo-subline">{data.subline}</div>
        </div>
        <div className="promo-card-footer">
          <div className="promo-brand">AZÔTCHÉ</div>
          <div className="promo-cta">📲 Téléchargez l'application</div>
          <div className="promo-slogan">Les talents de chez nous, à portée de main</div>
        </div>
      </div>

      <div className="promo-actions">
        <button className="promo-action-btn promo-download-btn" onClick={download} disabled={loading}>
          <FiDownload /> {loading ? 'Export...' : 'Télécharger'}
        </button>
        <button className="promo-action-btn promo-share-btn" onClick={share} disabled={loading}>
          <FiShare2 /> Partager
        </button>
      </div>
    </div>
  );
}