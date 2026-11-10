
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="hero-lines" />

        <div className="hero-content">
          <div className="eyebrow">
            <span className="live-dot" />
            THE ULTIMATE MOTORSPORT JUDGEMENT TEST
          </div>

          <h1>
            YOU MAKE
            <br />
            THE <span>CALL.</span>
          </h1>

          <p className="hero-description">
            Fifteen racing incidents. Two drivers.
            One final verdict. Do you have what it
            takes to sit in the stewards&apos; room?
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="/quiz">
              PLAY QUIZ <span>→</span>
            </a>
            <a className="secondary-button" href="#about">
              DISCOVER THE PROJECT
            </a>
          </div>

          <div className="hero-stats">
            <div>
              <strong>15</strong>
              <span>INCIDENTS</span>
            </div>
            <div>
              <strong>25</strong>
              <span>POINTS EACH</span>
            </div>
            <div>
              <strong>375</strong>
              <span>MAXIMUM SCORE</span>
            </div>
          </div>
        </div>

        <div className="hero-number">01</div>
        <div className="hero-caption">
          RACE CONTROL / YOUR DECISION MATTERS
        </div>
      </section>

      <section className="content-section" id="how-it-works">
        <div className="section-heading">
          <span className="section-tag">01 / THE CHALLENGE</span>
          <h2>
            WELCOME TO THE
            <br />
            STEWARDING ROOM.
          </h2>
          <p>
            Every decision has consequences. Review real historical
            racing incidents and test your judgement against the
            official decisions.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-number">01</span>
            <span className="feature-icon">◉</span>
            <h3>WATCH THE INCIDENT</h3>
            <p>
              Study the footage. Look at the positioning, the
              overlap and the racing conditions.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-number">02</span>
            <span className="feature-icon">⚑</span>
            <h3>MAKE YOUR CALL</h3>
            <p>
              Decide who was responsible and predict the
              penalty you think the stewards should issue.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-number">03</span>
            <span className="feature-icon">▤</span>
            <h3>GET THE VERDICT</h3>
            <p>
              Reveal the official decision, discover the
              reasoning and see how your judgement compares.
            </p>
          </article>
        </div>
      </section>

      <section className="leaderboard-section" id="leaderboard">
        <div>
          <span className="section-tag">02 / THE COMPETITION</span>
          <h2>
            THINK YOU KNOW
            <br />
            YOUR RACING RULES?
          </h2>
          <p>
            Earn your place on the global leaderboard.
            No registration. Just your judgement.
          </p>
        </div>

        <div className="leaderboard-graphic">
          <span>GLOBAL RANKING</span>
          <strong>---</strong>
          <small>THE GRID IS WAITING</small>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
