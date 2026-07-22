import { Link } from "wouter";
import "@/pages/landing.css";

export default function Privacy() {
  return (
    <div className="lp-root">
      <nav className="lp-nav lp-container">
        <Link href="/" className="lp-logo">
          <span>PANS/PANDAS</span>
          <em>Companion</em>
        </Link>
      </nav>

      <div className="lp-privacy-body lp-container">
        <div className="lp-privacy-content">
          <h1>Privacy Policy</h1>
          <p className="lp-privacy-updated">Last updated: May 20, 2026</p>
          <p className="lp-privacy-updated">Formerly the PANS &amp; PANDAS Symptom Tracker, renamed to PANS/PANDAS Companion in 2026.</p>

          <p>
            Hi. We're parents who built this app because we needed it ourselves. You're
            trusting us with information about your child, and we take that seriously. This
            policy explains what we collect, what we do with it, and what we will never do.
          </p>
          <p>
            We've tried to write this in plain language. If anything is unclear, please reach
            out to us at{" "}
            <a href="mailto:info@pandascompanion.com">info@pandascompanion.com</a>.
          </p>

          <h2>The short version</h2>
          <ul>
            <li>We collect only what we need to make the app work.</li>
            <li>We never sell your data. Not to anyone. Not ever.</li>
            <li>We never share your child's information with advertisers, marketers, or data brokers.</li>
            <li>You own your data. You can delete it at any time.</li>
            <li>We protect your information with industry standard security practices.</li>
          </ul>

          <h2>About this service</h2>
          <p>
            The PANS/PANDAS Companion is a personal tracking tool, not a healthcare
            service. We are not your healthcare provider, and using this app does not create a
            doctor-patient relationship. We are not a HIPAA covered entity. If you share your
            records with your child's doctor, the doctor's use of those records is governed by
            their own privacy practices and applicable law.
          </p>
          <p>
            The app is intended to help you observe patterns and communicate with the medical
            professionals who care for your child. It is not a diagnostic tool and is not a
            substitute for medical advice.
          </p>

          <h2>What we collect</h2>
          <p>
            <strong>Account information.</strong> When you create an account, we collect your
            name, email address, and a secured (hashed) version of your password. We use this
            to identify you and let you sign in.
          </p>
          <p>
            <strong>Demo access.</strong> If you use the app in demo mode, we collect your email
            address before granting access. We use this to keep demo access fair, to record your
            agreement to our Terms and Conditions, and to contact you if anything important
            changes. Demo email addresses are not used for marketing and are not shared with
            third parties.
          </p>
          <p>
            <strong>Child profile information.</strong> You may create one or more profiles for
            the child or children you're tracking. This typically includes a name (or a nickname
            you choose), date of birth or age, and optional details such as diagnosis status if
            you choose to enter them.
          </p>
          <p>
            <strong>Symptom log entries.</strong> When you log symptoms, you may record severity
            ratings, observations, notes, medications taken, possible exposures, and other
            context. This is the heart of what the app does, and the data stays yours.
          </p>
          <p>
            <strong>Technical information.</strong> Like most web applications, we automatically
            receive basic technical information when you use the app, including device type,
            browser, IP address, and basic navigation patterns. We use this to keep the app
            working and to find and fix bugs.
          </p>
          <p>
            <strong>Communications.</strong> If you contact us by email, we keep that
            correspondence so we can help you and improve the app.
          </p>

          <h2>What we don't collect</h2>
          <p>We do not collect:</p>
          <ul>
            <li>Your child's social security number, medical record number, or insurance information</li>
            <li>
              Payment card details (if we ever charge for premium features, payments are
              processed by a third party provider and we never store your card number)
            </li>
            <li>Precise location data</li>
            <li>
              Data from third party health services unless you actively connect them and
              authorize the sharing
            </li>
          </ul>

          <h2>How we use your information</h2>
          <p>We use your information only for these purposes:</p>
          <ul>
            <li>
              To provide the app's core functions: storing your logs, building your timelines,
              generating reports for your doctors
            </li>
            <li>
              To send you essential service messages such as account confirmations, password
              resets, and important updates about the service
            </li>
            <li>To respond when you contact us</li>
            <li>To find and fix technical problems</li>
            <li>To understand how the app is used in aggregate, so we can make it better</li>
          </ul>
          <p>We do not use your information to:</p>
          <ul>
            <li>Train AI models on your child's data</li>
            <li>Build profiles for advertising or marketing</li>
            <li>Target you with ads anywhere on the internet</li>
            <li>Sell or rent to anyone for any purpose</li>
          </ul>

          <h2>How we share your information</h2>
          <p>We share your information only in these specific situations:</p>
          <p>
            <strong>With service providers we use to run the app.</strong> This includes our
            hosting provider, database provider, and similar infrastructure services. These
            providers are bound by contract to use your information only to provide their
            service to us, and not for their own purposes.
          </p>
          <p>
            <strong>With people you choose to share with.</strong> If you share access with a
            co-parent, doctor, or therapist, that is your choice and we facilitate it.
          </p>
          <p>
            <strong>If required by law.</strong> If we receive a valid legal order, we may have
            to disclose information. We will tell you about it when we are legally allowed to.
          </p>
          <p>
            <strong>In a business transfer.</strong> If our company is ever acquired, merged, or
            sold, your information may transfer to the new owner. The new owner would be bound
            by this same privacy policy, or you would be notified with a chance to delete your
            data first.
          </p>
          <p>
            We do not share your information with advertisers, marketers, data brokers, or any
            other party not described above.
          </p>

          <h2>Your rights</h2>
          <p>You can, at any time:</p>
          <ul>
            <li>
              <strong>Correct your data.</strong> Edit any entry, profile, or account detail.
            </li>
            <li>
              <strong>Delete your data.</strong> Delete individual entries, a child profile, or
              your full account. When you delete your account, your data is removed from our
              active systems within 30 days. Backups are retained for up to 90 days before
              being permanently overwritten.
            </li>
            <li>
              <strong>Opt out of non-essential emails.</strong> You can unsubscribe from any
              non-essential communications.
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us by email at{" "}
            <a href="mailto:info@pandascompanion.com">info@pandascompanion.com</a>.
          </p>
          <p>
            Residents of certain regions, including California, the European Union, and the
            United Kingdom, may have additional rights under local law, including the right to
            know what personal information we hold, the right to request correction or deletion,
            and the right to lodge a complaint with a regulator. Contact us and we will help you
            exercise any of these rights.
          </p>

          <h2>Children's privacy</h2>
          <p>
            This app is designed for use by parents and caregivers, not by children themselves.
            The data in the app is about a child but is entered, managed, and controlled by the
            parent or guardian.
          </p>
          <p>
            We do not knowingly create accounts for users under 13. If a child under 13 has
            created an account, please contact us and we will close it and delete the associated
            data.
          </p>
          <p>
            Because the app holds information about children, we treat that information with
            extra care. We will never use a child's information for marketing or advertising, and
            we will never share it with parties not described in this policy.
          </p>

          <h2>Data security</h2>
          <p>
            We use industry standard practices to protect your information, including encrypted
            connections (HTTPS) for all data in transit, encrypted storage of sensitive
            information at rest, hashed passwords (we cannot see your password), regular
            security updates, and access controls so that only authorized team members can
            access production systems.
          </p>
          <p>
            No system is perfectly secure. If we ever experience a data breach that affects you,
            we will notify you as required by applicable law and as soon as we reasonably can.
          </p>

          <h2>Data retention</h2>
          <p>
            We keep your information for as long as your account is active. When you delete your
            account, your data is removed from our active systems within 30 days. Backups are
            retained for up to 90 days before being overwritten.
          </p>
          <p>
            You can also delete individual entries or profiles at any time without deleting your
            whole account.
          </p>

          <h2>Cookies and tracking</h2>
          <p>
            We use cookies and similar technologies only for purposes necessary to run the app,
            such as keeping you signed in and remembering your preferences. We do not use
            advertising cookies, tracking pixels, or cross-site tracking technologies.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If we change this policy, we will update the "Last updated" date at the top. For
            material changes, we will notify you by email or through the app before the changes
            take effect.
          </p>

          <h2>Contact us</h2>
          <p>Questions, concerns, or requests about your privacy can be sent to:</p>
          <p>
            <a href="mailto:info@pandascompanion.com">info@pandascompanion.com</a>
          </p>
        </div>
      </div>

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
