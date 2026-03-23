import Link from "next/link";
import "./about.css";

export default function AboutPage() {
  return (
    <div className="about-page-root">
      {/* Main app nav is global (SiteChrome). This row is in-page anchors only. */}
      <nav
        className="about-intra-nav"
        aria-label="About page sections"
      >
        <a href="#mission">Mission</a>
        <a href="#pillars">Three Pillars</a>
        <a href="#future">Future</a>
        <a href="#founder">Who I Am</a>
        <Link href="/signup.html" className="about-intra-nav-cta">
          Register
        </Link>
      </nav>

      <main className="about-main">
        <section id="mission" className="about-hero about-reveal">
          <p className="about-eyebrow">Our Mission</p>
          <h1>Democratizing Development.</h1>
          <p className="about-lead">
            BricksNexus exists to bridge the gap between high-level real estate development and the
            modern digital economy. We believe the future of development is more efficient, more
            transparent, and more connected, giving builders, firms, and investors a shared platform
            to move from opportunity discovery to execution with greater confidence.
          </p>
        </section>

        <section id="pillars" className="about-section about-reveal">
          <div className="about-section-heading">
            <p className="about-eyebrow">The Three Pillars</p>
            <h2>Everything we build sits on three strategic foundations.</h2>
          </div>
          <div className="about-pillars-grid">
            <article className="about-pillar-card">
              <div className="about-pillar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 18h16" />
                  <path d="M5 14 9 10l3 2 6-6 1 1" />
                  <circle cx="6" cy="14" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="18" cy="6" r="1" />
                </svg>
              </div>
              <h3>The Marketplace</h3>
              <p>
                We connect talent with opportunity in real-time, helping project owners, developers,
                firms, and professionals discover each other inside one active B2B marketplace.
              </p>
            </article>
            <article className="about-pillar-card">
              <div className="about-pillar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 6h12" />
                  <path d="M8 12h8" />
                  <path d="M8 18h10" />
                  <path d="M4 6h.01M4 12h.01M4 18h.01" />
                </svg>
              </div>
              <h3>Project Intelligence</h3>
              <p>
                Our Chronogram and Material Price Index empower users with better planning tools,
                stronger market visibility, and more informed decision-making across the project
                lifecycle.
              </p>
            </article>
            <article className="about-pillar-card">
              <div className="about-pillar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M8 12h8" />
                  <path d="M12 8v8" />
                  <path d="m16.5 7.5-9 9" />
                </svg>
              </div>
              <h3>The Tokenization Frontier</h3>
              <p>
                We are building toward a future where blockchain infrastructure enables fractional
                ownership, greater liquidity, and broader participation in real estate value creation.
              </p>
            </article>
          </div>
        </section>

        <section id="future" className="about-section about-future about-reveal">
          <div className="about-section-heading">
            <p className="about-eyebrow">Our Vision for the Future</p>
            <h2>The Future is Tokenized.</h2>
          </div>
          <div className="about-future-grid">
            <div className="about-future-copy">
              <p>
                BricksNexus is lowering the barrier to entry for real estate investment by combining
                marketplace access with the infrastructure needed to unlock fractional participation.
                Our long-term vision is to make development opportunities accessible to a wider
                audience without compromising trust, diligence, or operational discipline.
              </p>
              <p>
                Every tokenized project on BricksNexus is designed to be backed by a real-world asset
                and verified through our platform, creating a stronger bridge between digital
                liquidity and physical value. This is how we make innovation safer, more transparent,
                and more investable for the next generation of builders and owners.
              </p>
            </div>
            <div className="about-future-panel">
              <h3>Why this matters</h3>
              <ul>
                <li>Lower capital barriers for qualified participants.</li>
                <li>Improve transparency with platform-level verification.</li>
                <li>Create more fluid pathways to liquidity in real estate.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="founder" className="about-section about-founder about-reveal">
          <div className="about-section-heading">
            <p className="about-eyebrow">Founder Profile</p>
            <h2>Who I Am</h2>
          </div>
          <article className="about-founder-card">
            <div className="about-founder-grid">
              <img src="/images/flavia-beppler.png" alt="Flavia Beppler" className="about-founder-image" />
              <div className="about-founder-copy">
                <p><strong>Flavia Beppler</strong></p>
                <p>
                  I am a results-driven Civil Engineer and Project Specialist with over ten years of
                  experience managing complex infrastructure projects in the United States and Brazil.
                  Throughout my career, I have worked at the intersection of technical engineering,
                  strategic execution, and data organization.
                </p>
                <p>
                  I have coordinated real estate and engineering for the <strong>$6B+ Second Avenue
                  Subway</strong> and the <strong>$19B+ Hudson Tunnel Project</strong>. Now, I am
                  applying that experience in process optimization and stakeholder management to
                  transform how the construction industry connects and executes.
                </p>
              </div>
            </div>

            <div className="about-founder-sections">
              <div className="about-founder-block">
                <h3>What We Will Build Together</h3>
                <p><strong>Mission:</strong> Build a trusted digital ecosystem that connects people, projects, and decisions across the construction lifecycle with greater speed, clarity, and accountability.</p>
                <p><strong>Vision:</strong> Become the operating layer for modern development where opportunity discovery, execution, and long-term value creation happen in one connected platform.</p>
                <p><strong>Values:</strong></p>
                <ul>
                  <li><strong>Transparency:</strong> Clear data, visible progress, and aligned expectations.</li>
                  <li><strong>Execution Excellence:</strong> Practical tools that help teams move from planning to delivery.</li>
                  <li><strong>Innovation with Purpose:</strong> Use technology, AI, and emerging infrastructure responsibly to improve real-world outcomes.</li>
                </ul>
              </div>

              <div className="about-founder-block">
                <h3>Who You Are (The Ideal CTO)</h3>
                <p>I am looking for a technical co-founder ready to help disrupt a multi-trillion-dollar global industry. You are:</p>
                <ul>
                  <li><strong>A full-stack visionary:</strong> Able to build and scale a robust marketplace MVP.</li>
                  <li><strong>Data-obsessed:</strong> Skilled in SQL, Power BI, or AI/ML to turn industry data into clear decisions.</li>
                  <li><strong>Growth-minded:</strong> Proactive about leading with AI and disruptive innovation.</li>
                  <li><strong>A partner:</strong> Ready to co-lead, hire a team, and shape the BricksNexus technical roadmap.</li>
                </ul>
              </div>
            </div>

            <div className="about-founder-contact">
              <h3>Let's Connect</h3>
              <ul className="about-contact-info">
                <li>Email: <a href="mailto:flaviabeppler@gmail.com">flaviabeppler@gmail.com</a></li>
                <li>Phone: (929) 416-8862</li>
                <li>LinkedIn: <a href="https://www.linkedin.com/in/flavia-beppler-7179bb38/" target="_blank" rel="noreferrer">Flavia Beppler</a></li>
              </ul>
              <a href="mailto:flaviabeppler@gmail.com" className="about-primary-btn">Apply to Join as CTO</a>
            </div>
          </article>
        </section>

        <section className="about-cta about-reveal">
          <p className="about-eyebrow">Join the Revolution</p>
          <h2>Build with the platform designed for the next era of development.</h2>
          <p>
            Whether you are sourcing work, posting opportunities, or preparing for the tokenized
            future of real estate, BricksNexus is where it connects.
          </p>
          <Link href="/signup.html" className="about-primary-btn">
            Join the Revolution
          </Link>
        </section>
      </main>
    </div>
  );
}
