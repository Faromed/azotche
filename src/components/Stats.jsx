import useCountUp from '../hooks/useCountUp';

function StatItem({ icon, end, suffix, label }) {
  const [count, ref] = useCountUp(end);
  return (
    <div className="stat-item" ref={ref}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{count}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="stats">
      <div className="container">
        <div className="stats-grid">
          <StatItem icon="👷" end={500} suffix="+" label="Artisans référencés" />
          <StatItem icon="🤝" end={2000} suffix="+" label="Mises en relation" />
          <StatItem icon="🏙️" end={12} suffix="" label="Villes couvertes" />
          <StatItem icon="⭐" end={4} suffix=".8/5" label="Note moyenne" />
        </div>
      </div>
    </section>
  );
}