import { Link } from "wouter";
import "@/pages/landing.css";

export default function Terms() {
  return (
    <div className="lp-root">
      <nav className="lp-nav lp-container">
        <Link href="/" className="lp-logo">
          <span>PANS &amp; PANDAS</span>
          <em>Symptom Tracker</em>
        </Link>
      </nav>

      <div className="lp-privacy-body lp-container">
        <div className="lp-privacy-content">
          <h1>Terms and Conditions</h1>
          <p className="lp-privacy-updated">Last updated: May 20, 2026</p>

          <p>
            Please read these Terms and Conditions carefully before using the PANS &amp; PANDAS
            Symptom Tracker. By creating an account or accessing the service, you agree to be
            bound by these terms. If you do not agree, do not use the service.
          </p>
          <p>
            Questions? Contact us at{" "}
            <a href="mailto:PansTracker@gmail.com">PansTracker@gmail.com</a>.
          </p>

          <h2>1. About the service</h2>
          <p>
            The PANS &amp; PANDAS Symptom Tracker ("the app", "the service") is a personal
            health-logging tool designed to help parents and caregivers track and communicate
            symptom patterns in children with PANS or PANDAS. We are not a medical service, a
            healthcare provider, or a HIPAA covered entity.
          </p>
          <p>
            The app is a communication and record-keeping aid only. It does not diagnose, treat,
            or replace advice from a licensed healthcare professional. Never disregard or delay
            seeking professional medical advice because of something you read or logged in this
            app.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old to create an account. By agreeing to these terms,
            you represent that you are at least 18 years old and have the legal capacity to enter
            into a binding agreement.
          </p>
          <p>
            You may use the app on behalf of a minor child in your care. You are responsible for
            all data entered on behalf of that child and for ensuring that your use of the app
            complies with any applicable laws regarding children's privacy.
          </p>

          <h2>3. Your account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials
            and for all activity that occurs under your account. Notify us immediately at{" "}
            <a href="mailto:PansTracker@gmail.com">PansTracker@gmail.com</a> if you believe your
            account has been compromised.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms, are
            used for abusive behavior, or are inactive for an extended period (with advance notice
            where possible).
          </p>

          <h2>4. Your data</h2>
          <p>
            You own the data you enter into the app. We do not claim any ownership rights over
            your symptom logs, notes, medication records, or child profile information.
          </p>
          <p>
            We store and process your data to provide the service as described in our{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. By
            using the app, you consent to that processing.
          </p>
          <p>
            You can export or delete your data at any time through the app's settings or by
            contacting us. Deletion requests are processed within 30 days.
          </p>

          <h2>5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the app for any unlawful purpose or in violation of any applicable law</li>
            <li>Attempt to gain unauthorized access to our systems or another user's account</li>
            <li>Transmit malware, spam, or any harmful code through the service</li>
            <li>Scrape, crawl, or systematically extract data from the service</li>
            <li>Misrepresent your identity or affiliation when using the service</li>
            <li>Use the service in a way that could harm, disable, overburden, or impair it</li>
          </ul>

          <h2>6. No medical advice</h2>
          <p>
            The content in this app — including any outputs, charts, summaries, or generated
            reports — is for informational and communication purposes only. It does not constitute
            medical advice, diagnosis, or treatment.
          </p>
          <p>
            Always consult a qualified healthcare provider before making any medical decisions.
            In a medical emergency, call your local emergency services immediately.
          </p>

          <h2>7. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by applicable law, we are not liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the
            service, including but not limited to reliance on any information logged or generated
            in the app, loss of data, or interruption of service.
          </p>
          <p>
            Our total liability to you for any claim arising from these terms or your use of the
            service shall not exceed the greater of (a) the amount you paid us in the 12 months
            preceding the claim, or (b) $50 USD.
          </p>

          <h2>8. Disclaimer of warranties</h2>
          <p>
            The service is provided "as is" and "as available" without warranties of any kind,
            either express or implied, including but not limited to implied warranties of
            merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p>
            We do not warrant that the service will be uninterrupted, error-free, or free of
            security vulnerabilities. We are a small team doing our best — we will communicate
            openly when issues arise.
          </p>

          <h2>9. Changes to the service</h2>
          <p>
            We may add, modify, or remove features at any time. We will try to give advance
            notice of significant changes. Continued use of the service after changes take effect
            constitutes acceptance of the updated service.
          </p>

          <h2>10. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. We will notify you of material changes
            by email or through the app, and we will ask you to re-agree before continuing to use
            the service. The "Last updated" date at the top of this page reflects the most recent
            revision.
          </p>

          <h2>11. Governing law</h2>
          <p>
            These terms are governed by the laws of the United States. Any disputes arising under
            these terms shall be resolved through binding arbitration under the rules of the
            American Arbitration Association, except where prohibited by law.
          </p>

          <h2>12. Contact</h2>
          <p>
            For questions about these terms, contact us at:{" "}
            <a href="mailto:PansTracker@gmail.com">PansTracker@gmail.com</a>
          </p>
        </div>
      </div>

      <footer className="lp-container" id="resources">
        <p>Built by a family, for families.</p>
        <div>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="mailto:PansTracker@gmail.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
