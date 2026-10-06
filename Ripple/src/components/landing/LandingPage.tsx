import Link from "next/link"

function HeroMap() {
  return (
    <div className="hero-console" aria-label="Illustrative campus system preview">
      <div className="hero-console-top">
        <div className="console-controls" aria-hidden="true"><span /><span /><span /></div>
        <span className="hero-console-label">System preview / baseline</span>
      </div>
      <svg className="hero-map" viewBox="0 0 640 360" role="img" aria-label="Connected campus buildings and routes">
        <defs>
          <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" className="hero-map-grid" fill="none" />
          </pattern>
        </defs>
        <rect width="640" height="360" fill="url(#hero-grid)" />
        <path className="hero-map-road" d="M-10 270 C130 244 185 288 306 248 S500 182 650 212" />
        <path className="hero-map-route" d="M30 102 C180 112 244 178 330 185 S490 258 600 286" />
        <path className="hero-map-route" d="M76 330 C168 276 246 228 322 185 S432 92 564 66" />
        <rect className="hero-map-building" x="82" y="74" width="126" height="78" />
        <rect className="hero-map-building-alert" x="257" y="136" width="154" height="88" />
        <rect className="hero-map-building" x="464" y="52" width="98" height="62" />
        <rect className="hero-map-building-offline" x="452" y="238" width="126" height="62" />
        <text className="hero-map-label" x="98" y="111">NORTH QUAD</text>
        <text className="hero-map-label" x="280" y="182">TT BLOCK</text>
        <text className="hero-map-label" x="480" y="88">LIBRARY</text>
        <text className="hero-map-label" x="474" y="274">SCIENCE COURT</text>
        <circle cx="331" cy="180" fill="var(--amber)" r="4" />
        <circle cx="515" cy="269" fill="var(--red)" r="4" />
      </svg>
      <div className="hero-console-footer">
        <div className="hero-console-footer-item"><div className="metric-label">Campus stability</div><div className="hero-console-footer-value mono">87</div></div>
        <div className="hero-console-footer-item"><div className="metric-label">Room utilization</div><div className="hero-console-footer-value mono">82%</div></div>
        <div className="hero-console-footer-item"><div className="metric-label">Transport load</div><div className="hero-console-footer-value mono">64%</div></div>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <main className="landing-shell">
      <header className="landing-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">RIPPLE</span>
          <span className="brand-subtitle">Decision intelligence</span>
        </div>
        <div className="landing-header-meta"><span><span className="signal-dot" />LOCAL SIMULATION</span><span>V 0.2 / SYNTHETIC MODEL</span></div>
      </header>
      <section className="landing-main">
        <div className="landing-copy">
          <div className="eyebrow">Decision intelligence for complex systems</div>
          <h1 className="landing-title">See the consequences<span>before you decide.</span></h1>
          <p className="landing-body">RIPPLE models how operational decisions propagate through interconnected systems. Campus is the first vertical.</p>
          <div className="landing-actions">
            <Link className="primary-button" href="/sandbox">Experience RIPPLE <span className="button-arrow">↗</span></Link>
            <Link className="secondary-button" href="/sandbox?guide=1">Guided demo <span className="button-arrow">→</span></Link>
          </div>
          <div className="landing-note">Built for campus operations today / deterministic model / human approval required</div>
        </div>
        <HeroMap />
      </section>
    </main>
  )
}
