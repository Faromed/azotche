import { useEffect } from 'react';

const DEFAULT_TITLE = 'AZOTCHE — Les artisans de confiance au Benin';
const DEFAULT_DESC  = 'Trouvez des artisans qualifies pres de chez vous au Benin : plombiers, electriciens, tailleurs, coiffeurs et bien plus. Azotche connecte clients et artisans de confiance.';
const BASE_URL      = 'https://azotche.com';
const OG_IMAGE      = `${BASE_URL}/og-image.png`;

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function usePageMeta({ title, description, ogImage, ogType = 'website', noIndex } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | AZOTCHE` : DEFAULT_TITLE;
    const desc      = description || DEFAULT_DESC;
    const img       = ogImage || OG_IMAGE;
    const url       = window.location.href;

    document.title = fullTitle;

    setMeta('description', desc);
    setMeta('robots', noIndex ? 'noindex,nofollow' : 'index,follow');

    // Open Graph
    setMeta('og:title',       fullTitle,  'property');
    setMeta('og:description', desc,        'property');
    setMeta('og:image',       img,         'property');
    setMeta('og:url',         url,         'property');
    setMeta('og:type',        ogType,      'property');
    setMeta('og:site_name',   'AZOTCHE',   'property');

    // Twitter Card
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:title',       fullTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image',       img);

    return () => {
      // Reset au defaut au demontage si besoin
    };
  }, [title, description, ogImage, ogType, noIndex]);
}
