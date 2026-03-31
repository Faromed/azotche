import useScrollReveal from '../hooks/useScrollReveal';

const cats = [
  { icon: '🏗️', name: 'Bâtiment & Construction', count: 'Maçons, peintres, carreleurs...', color: '#FF8F00' },
  { icon: '✂️', name: 'Mode & Habillement', count: 'Tailleurs, couturiers, stylistes...', color: '#9C27B0' },
  { icon: '💇', name: 'Beauté & Bien-être', count: 'Coiffeurs, esthéticiennes...', color: '#E91E63' },
  { icon: '🍽️', name: 'Alimentation', count: 'Restaurants, traiteurs, pâtissiers...', color: '#F44336' },
  { icon: '🔧', name: 'Mécanique & Transport', count: 'Garagistes, mécaniciens...', color: '#607D8B' },
  { icon: '⚡', name: 'Technologie', count: 'Réparateurs, informaticiens...', color: '#2196F3' },
  { icon: '🌿', name: 'Agriculture & Élevage', count: 'Éleveurs, maraîchers...', color: '#4CAF50' },
  { icon: '🎨', name: 'Art & Artisanat', count: 'Sculpteurs, vanniers, potiers...', color: '#FF5722' },
];

export default function Categories() {
  const ref = useScrollReveal();

  return (
    <section className="categories section" id="categories" ref={ref}>
      <div className="container">
        <div className="section-tag reveal">📂 Catégories</div>
        <h2 className="section-title reveal">
          Explorez nos <span className="accent">catégories</span>
        </h2>
        <p className="section-subtitle reveal">
          Des dizaines de métiers représentés dans toutes les villes du Bénin.
        </p>
        <div className="categories-grid">
          {cats.map((c, i) => (
            <div className="category-card reveal" key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="category-icon" style={{ background: `${c.color}15`, color: c.color }}>
                <span style={{ fontSize: '1.8rem' }}>{c.icon}</span>
              </div>
              <div className="category-name">{c.name}</div>
              <div className="category-count">{c.count}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}