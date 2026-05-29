import { Link } from "react-router-dom";
import "../home.css";

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Study Rooms",
    desc: "Create or join rooms with live synced timers and real-time chat.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Session Tracking",
    desc: "Track every study session with participation stats and streaks.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Analytics",
    desc: "Visualise your progress with heatmaps, charts, and personal records.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Leaderboard",
    desc: "Compete with the community and climb the weekly rankings.",
  },
];

const HomePage = () => {
  return (
    <div className="home-page">
      {/* Nav */}
      <nav className="home-nav">
        <div className="home-nav__brand">
          <span className="sidebar__logo">◆</span>
          <span className="home-nav__name">StudySphere</span>
        </div>
        <div className="home-nav__links">
          <Link to="/login" className="home-nav__link">Log in</Link>
          <Link to="/register" className="home-btn">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero__glow home-hero__glow--left" />
        <div className="home-hero__glow home-hero__glow--right" />
        <p className="home-hero__eyebrow">Study together. Grow faster.</p>
        <h1 className="home-hero__title">
          Your focused<br />study community
        </h1>
        <p className="home-hero__sub">
          Sync sessions, track progress, and stay accountable — all in one place.
        </p>
        <div className="home-hero__actions">
          <Link to="/register" className="home-btn home-btn--lg">Start for free</Link>
          <Link to="/login" className="home-btn home-btn--ghost home-btn--lg">Log in</Link>
        </div>
      </section>

      {/* Features */}
      <section className="home-features">
        {features.map((f) => (
          <div key={f.title} className="home-feature-card">
            <div className="home-feature-card__icon">{f.icon}</div>
            <h3 className="home-feature-card__title">{f.title}</h3>
            <p className="home-feature-card__desc">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="home-cta">
        <h2 className="home-cta__title">Ready to focus?</h2>
        <p className="home-cta__sub">Join StudySphere and make every study session count.</p>
        <Link to="/register" className="home-btn home-btn--lg">Create your account</Link>
      </section>

      <footer className="home-footer">
        <span>© {new Date().getFullYear()} StudySphere</span>
      </footer>
    </div>
  );
};

export default HomePage;
