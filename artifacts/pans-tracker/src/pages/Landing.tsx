import { useEffect } from "react";
import { Link } from "wouter";
import { track } from "@/lib/analytics";
import "./landing.css";

export default function Landing() {
  useEffect(() => {
    track("landing_page_viewed");
  }, []);

  return (
    <div className="lp-root">

      {/* ── NAV ── */}
      <header className="lp-container">
        <nav>
          <div className="lp-logo">
            <span className="lp-logo-main">PANS/PANDAS</span>
            <span className="lp-logo-sub">Companion</span>
          </div>

          <ul className="lp-nav-links">
            <li><a href="#story">Our Story</a></li>
            <li><a href="#how">How It Helps</a></li>
            <li><a href="#resources">Resources</a></li>
          </ul>

          <div className="lp-nav-right">
            <a
              href="/sign-in"
              className="lp-nav-login"
              onClick={() => track("landing_cta_login")}
            >
              Log In
            </a>
            <a
              href="/sign-up"
              className="lp-nav-cta"
              onClick={() => track("landing_cta_create_account")}
            >
              Start Tracking
            </a>
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero lp-container">
        <div className="lp-hero-decor">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="lp-g1" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#c4623d" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#c4623d" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="180" fill="url(#lp-g1)" />
            <circle cx="200" cy="200" r="160" fill="none" stroke="#c4623d" strokeOpacity="0.25" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="120" fill="none" stroke="#2d4a3e" strokeOpacity="0.2" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="80"  fill="none" stroke="#c4623d" strokeOpacity="0.3"  strokeWidth="0.5" />
            <path d="M 60 200 Q 200 60 340 200 Q 200 340 60 200"  fill="none" stroke="#2d4a3e" strokeOpacity="0.2" strokeWidth="0.5" />
            <path d="M 200 60 Q 340 200 200 340 Q 60 200 200 60" fill="none" stroke="#c4623d" strokeOpacity="0.2" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="lp-hero-eyebrow">For families navigating PANS &amp; PANDAS</div>
        <h1>You haven't lost your child. <em>You're not alone.</em></h1>
        <p className="lp-hero-tagline">Track, learn, and care for PANS and PANDAS together.</p>
        <p className="lp-hero-subline">Your child's full picture in one place.</p>
        <p className="lp-hero-sub">
          If you're here, something is happening to your child that feels impossible to explain.
          We've been where you are. This is the tool we wish we'd had on the worst days of our lives.
        </p>
        <div className="lp-hero-actions">
          <a
            href="/sign-up"
            className="lp-btn-primary"
            onClick={() => track("landing_cta_create_account")}
          >
            Begin Tracking, It's Free
          </a>
          <a href="#story" className="lp-btn-text">Read our story</a>
        </div>
      </section>

      {/* ── SCREENER CTA ── */}
      <section className="lp-screener lp-container">
        <div className="lp-screener-inner">
          <div className="lp-screener-label">Free diagnostic screener</div>
          <h2 className="lp-screener-heading">Could this be PANS or PANDAS?</h2>
          <p className="lp-screener-sub">
            A free 2-minute screener based on the PANDAS Physicians Network diagnostic
            criteria. Get a printable summary you can bring to your child's doctor.
          </p>
          <a
            href="https://pandassupport.com/screener"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-btn-primary"
            onClick={() => track("screener_landing_cta_clicked")}
          >
            Start the screener
          </a>
          <p className="lp-screener-reassurance">No account required. Your answers stay private.</p>
        </div>
      </section>

      {/* ── LETTER / STORY ── */}
      <section className="lp-letter" id="story">
        <div className="lp-letter-inner">
          <div className="lp-letter-label">A letter from the parents who built this</div>
          <h2>
            One night in December, our 8 year old said goodbye{" "}
            <em>because he believed he was going to die.</em>
          </h2>
          <div className="lp-letter-body">
            <p className="lp-lead">
              He had already showered. He kissed each of us, laid down, crossed his arms over his chest,
              and cried himself to sleep. He was certain he was too dirty to survive the night.
            </p>
            <p>
              A few weeks earlier, he had been our sweet, easygoing boy. In October he came down with
              strep-like symptoms. Three tests came back negative. A rash on his back was dismissed as
              something else, until my wife pushed for antibiotics, suspecting scarlet fever. He got better.
            </p>
            <p>
              Then Christmas vacation began, and overnight he was gone. In his place was a child with
              crushing OCD, terror, anger, and behavior we couldn't recognize. Twelve squirts of soap for
              each hand, every time he touched anything. Screaming on the floor that he needed to shower or
              he would die. Saying the most hurtful things he could think of to the people he loved most.
              He wouldn't hug us. He wouldn't kiss us. His little sister watched her brother disappear and
              a frightened, angry stranger take his place.
            </p>
            <p>
              We were terrified. We were exhausted. We tested for UTIs and everything else we could think
              of, and everything came back normal. We started to wonder if this was just who our son was now.
            </p>
            <p>
              In January, after hours of online research, we found PANDAS. His strep antibodies came back
              at nearly 2.5 times the normal level. A powerful antibiotic was prescribed. Friends also
              connected us with a truly amazing psychologist who helped him work through his symptoms,
              especially the OCD. Slowly, our boy came back to us.
            </p>
            <p>He has had one flare since then. Because we knew what to watch for, we caught it early.</p>

            <div className="lp-signature">
              <div className="lp-signature-rule" />
              With you in this,<br />
              <em>The family behind PANS/PANDAS Companion</em>
            </div>
          </div>
        </div>
      </section>

      {/* ── THREE PERSPECTIVES ── */}
      <section className="lp-perspectives lp-container">
        <div className="lp-section-header">
          <div className="lp-section-label">What we want you to know</div>
          <h2>This illness is happening <em>to your whole family.</em></h2>
        </div>

        <div className="lp-perspective-grid">
          <div className="lp-perspective">
            <div className="lp-perspective-num">01 / For Parents</div>
            <h3>It looks like behavior. It isn't.</h3>
            <p>
              You're watching a different child act strangely, irrationally, sometimes cruelly. It feels
              like they're acting up. They aren't. This illness is attacking the brain and making them do
              these things. You're not failing as a parent. You're caring for a child who is sick in a way
              that hides itself.
            </p>
          </div>

          <div className="lp-perspective">
            <div className="lp-perspective-num">02 / For the Child</div>
            <h3>Their brain is lying to them.</h3>
            <p>
              The OCD feels real. The fear feels real. Everything that used to be a 2 is suddenly a 10.
              Imagine not being able to trust your own feelings while everyone you love tells you not to
              worry. They aren't being difficult. They're frightened of things they can't explain, and they
              need you to believe them.
            </p>
          </div>

          <div className="lp-perspective">
            <div className="lp-perspective-num">03 / For the Siblings</div>
            <h3>They lost their brother or sister too.</h3>
            <p>
              Overnight, the person they shared their life with became someone mean and unrecognizable,
              getting all of the attention for the worst of reasons. They're scared, confused, and often
              quietly grieving. They need to be told this isn't their fault, and that you see them too.
            </p>
          </div>
        </div>
      </section>

      {/* ── QUIET STATEMENT ── */}
      <section className="lp-quiet">
        <div className="lp-quiet-inner">
          <p>
            When you're in the middle of it, you are just trying to survive.{" "}
            <em>You shouldn't also have to remember everything.</em>
          </p>
        </div>
      </section>

      {/* ── APP / HOW IT HELPS ── */}
      <section className="lp-app-section lp-container" id="how">
        <div className="lp-app-grid">
          <div className="lp-app-copy">
            <div className="lp-section-label" style={{ marginBottom: "20px" }}>
              Why we built this tracker
            </div>
            <h2>The tool we <em>wished</em> we'd had.</h2>
            <p>
              When we finally sat down with doctors, they asked us for a timeline. Symptoms, dates,
              severity, illnesses, exposures. We tried to remember through the fog of the worst weeks of
              our lives, scribbling notes from memory and group texts.
            </p>
            <p>
              The PANS/PANDAS Companion exists so you don't have to do that. Log a moment in
              seconds. Build a record without thinking about it. Walk into appointments prepared.
            </p>

            <ul className="lp-feature-list">
              <li>
                <div className="lp-feature-icon">i</div>
                <div className="lp-feature-text">
                  <strong>Quick symptom logging</strong>
                  <span>Capture what's happening in under thirty seconds, even at 2 a.m.</span>
                </div>
              </li>
              <li>
                <div className="lp-feature-icon">ii</div>
                <div className="lp-feature-text">
                  <strong>Flare timelines that build themselves</strong>
                  <span>See onset, severity, and patterns at a glance. No spreadsheet required.</span>
                </div>
              </li>
              <li>
                <div className="lp-feature-icon">iii</div>
                <div className="lp-feature-text">
                  <strong>Doctor ready reports</strong>
                  <span>Export a clean, organized summary before every appointment.</span>
                </div>
              </li>
              <li>
                <div className="lp-feature-icon">iv</div>
                <div className="lp-feature-text">
                  <strong>Track illnesses and exposures</strong>
                  <span>Connect the dots between infections, environmental triggers, and flares.</span>
                </div>
              </li>
            </ul>

            <a
              href="/sign-up"
              className="lp-btn-primary"
              onClick={() => track("landing_cta_create_account")}
            >
              Start Your Timeline
            </a>
          </div>

          <div className="lp-app-mockup">
            <div className="lp-mockup-screen">
              <div className="lp-mockup-header">
                <h4>Lucas, Age 8</h4>
                <span>This week</span>
              </div>

              <div className="lp-mockup-btn">+ Log a symptom</div>

              <div className="lp-mockup-entry">
                <div className="lp-mockup-date">
                  <div className="lp-day">14</div>
                  <div className="lp-mo">JAN</div>
                </div>
                <div className="lp-mockup-content">
                  <div className="lp-symptom">Calm day</div>
                  <div className="lp-note">First in over a week. Hugged his sister this morning.</div>
                  <div className="lp-calm-marker">
                    <span className="lp-marker-dot lp-calm-dot" />
                    nothing to report
                  </div>
                </div>
              </div>

              <div className="lp-mockup-entry">
                <div className="lp-mockup-date">
                  <div className="lp-day">13</div>
                  <div className="lp-mo">JAN</div>
                </div>
                <div className="lp-mockup-content">
                  <div className="lp-symptom">OCD, hand washing</div>
                  <div className="lp-note">Twelve rounds before breakfast. Calmer after morning meds.</div>
                  <div className="lp-severity">
                    <span style={{ backgroundColor: '#ece2d0' }} />
                    <span style={{ backgroundColor: '#f5d9c7' }} />
                    <span style={{ backgroundColor: '#e6b598' }} />
                    <span style={{ backgroundColor: '#d68866' }} />
                    <span style={{ backgroundColor: '#c4623d' }} />
                    <span style={{ backgroundColor: '#ece2d0' }} />
                  </div>
                </div>
              </div>

              <div className="lp-mockup-entry">
                <div className="lp-mockup-date">
                  <div className="lp-day">12</div>
                  <div className="lp-mo">JAN</div>
                </div>
                <div className="lp-mockup-content">
                  <div className="lp-symptom">Anxiety, school dropoff</div>
                  <div className="lp-note">Worried about touching desks. Settled by midday.</div>
                  <div className="lp-severity">
                    <span style={{ backgroundColor: '#ece2d0' }} />
                    <span style={{ backgroundColor: '#f5d9c7' }} />
                    <span style={{ backgroundColor: '#e6b598' }} />
                    <span style={{ backgroundColor: '#ece2d0' }} />
                    <span style={{ backgroundColor: '#ece2d0' }} />
                    <span style={{ backgroundColor: '#ece2d0' }} />
                  </div>
                </div>
              </div>

              <div className="lp-mockup-entry lp-no-border">
                <div className="lp-mockup-date">
                  <div className="lp-day">11</div>
                  <div className="lp-mo">JAN</div>
                </div>
                <div className="lp-mockup-content">
                  <div className="lp-symptom">Possible strep exposure</div>
                  <div className="lp-note">Classmate sent home sick. Watching for new symptoms.</div>
                  <div className="lp-watch-marker">
                    <span className="lp-marker-dot lp-watch-dot" />
                    noted, watching
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2>Whatever today looks like, <em>you don't have to remember it alone.</em></h2>
          <p>
            The PANS/PANDAS Companion is free to use. Start a timeline in a few minutes.
            Whether you're in the middle of a flare or trying to understand what just happened,
            we built this for you.
          </p>
          <a
            href="/sign-up"
            className="lp-btn-primary"
            onClick={() => track("landing_cta_create_account")}
          >
            Begin Tracking
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-container" id="resources">
        <p>Built by a family, for families.</p>
        <div>
          <Link href="/privacy">Privacy</Link>
          <a href="mailto:info@pandascompanion.com">Contact</a>
        </div>
      </footer>

    </div>
  );
}
