import {
  FiTool, FiScissors, FiHeart, FiShoppingBag,
  FiSettings, FiMonitor, FiSun, FiFeather,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import useScrollReveal from '../hooks/useScrollReveal';

const cats = [
  { icon: <FiTool size={28} />,       name: 'Bâtiment & Construction', desc: 'Maçons, peintres, carreleurs…',   color: '#FF8F00', query: 'Bâtiment'    },
  { icon: <FiScissors size={28} />,   name: 'Mode & Habillement',       desc: 'Tailleurs, couturiers…',          color: '#9C27B0', query: 'Mode'         },
  { icon: <FiHeart size={28} />,      name: 'Beauté & Bien-être',        desc: 'Coiffeurs, esthéticiennes…',      color: '#E91E63', query: 'Beauté'       },
  { icon: <FiShoppingBag size={28} />,name: 'Alimentation',              desc: 'Restaurants, traiteurs…',         color: '#F44336', query: 'Alimentation' },
  { icon: <FiSettings size={28} />,   name: 'Mécanique & Transport',    desc: 'Garagistes, mécaniciens…',        color: '#607D8B', query: 'Mécanique'    },
  { icon: <FiMonitor size={28} />,    name: 'Technologie',               desc: 'Réparateurs, informaticiens…',    color: '#2196F3', query: 'Technologie'  },
  { icon: <FiSun size={28} />,        name: 'Agriculture & Élevage',    desc: 'Éleveurs, maraîchers…',           color: '#4CAF50', query: 'Agriculture'  },
  { icon: <FiFeather size={28} />,    name: 'Art & Artisanat',           desc: 'Sculpteurs, vanniers, potiers…',  color: '#FF5722', query: 'Artisanat'    },
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
            <Link
              to={`/artisans?q=${encodeURIComponent(c.query)}`}
              className="category-card reveal"
              key={i}
              style={{ transitionDelay: `${i * 0.07}s`, textDecoration: 'none' }}
            >
              <div className="category-icon" style={{ background: `${c.color}18`, color: c.color }}>
                {c.icon}
              </div>
              <div className="category-name">{c.name}</div>
              <div className="category-count">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
