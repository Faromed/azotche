import { FiUsers, FiTrendingUp, FiMapPin, FiStar } from 'react-icons/fi';
import useCountUp from '../hooks/useCountUp';
import useStats from '../hooks/useStats';
import useScrollReveal from '../hooks/useScrollReveal';

function StatItem({ icon, end, suffix, label, color, loading }) {
  const [count, ref] = useCountUp(loading ? 0 : (end ?? 0));
  return (
    <div className="stat-item reveal" ref={ref}>
      <div className="stat-icon-wrap" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="stat-value">
        {loading
          ? <span className="stat-skeleton" />
          : <>{count}{suffix}</>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Stats() {
  const { stats, loading } = useStats();
  const sectionRef = useScrollReveal();

  const items = [
    {
      icon:  <FiUsers size={26} />,
      end:   stats.artisans ?? 0,
      suffix: '+',
      label: 'Artisans référencés',
      color: '#FF6B35',
    },
    {
      icon:  <FiTrendingUp size={26} />,
      end:   stats.publications ?? 0,
      suffix: '+',
      label: 'Offres de service',
      color: '#22C55E',
    },
    {
      icon:  <FiMapPin size={26} />,
      end:   stats.villes ?? 12,
      suffix: '',
      label: 'Villes couvertes',
      color: '#3B82F6',
    },
    {
      icon:  <FiStar size={26} />,
      end:   4,
      suffix: '.8⭐',
      label: 'Note moyenne clients',
      color: '#F59E0B',
    },
  ];

  return (
    <section className="stats section" ref={sectionRef}>
      <div className="container">
        <div className="section-tag reveal">📊 En chiffres</div>
        <h2 className="section-title reveal">
          La confiance des <span className="accent">artisans béninois</span>
        </h2>
        <div className="stats-grid">
          {items.map((it, i) => (
            <StatItem key={i} {...it} loading={loading} />
          ))}
        </div>
      </div>
    </section>
  );
}
