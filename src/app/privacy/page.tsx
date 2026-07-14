import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effectiveDate="[EFFECTIVE DATE]">
      <p>
        This Privacy Policy explains how <strong>[LEGAL ENTITY]</strong>{" "}
        (&ldquo;we&rdquo;) collects, uses, and protects your information when you
        use FreelanceFlow (the &ldquo;Service&rdquo;).
      </p>

      <LegalSection heading="1. Information we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account information:</strong> your email address and, if
            provided, your name and business name.
          </li>
          <li>
            <strong>Data you enter:</strong> clients, invoices, payments,
            payment methods, business logo, and related notes.
          </li>
          <li>
            <strong>Technical data:</strong> basic logs and cookies needed to
            keep you signed in and to operate and secure the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use it">
        <p>
          We use your information solely to provide the Service to you: to
          authenticate you, store and display your records, and support the
          features you use. We do not sell your personal information, and we do
          not use your business or client data for advertising.
        </p>
      </LegalSection>

      <LegalSection heading="3. Storage & security">
        <p>
          Data is stored with our infrastructure providers (database and auth
          via Supabase; hosting via Vercel). Each account&rsquo;s data is
          isolated at the database level so that one user cannot read or modify
          another user&rsquo;s records, and uploaded logos are kept in
          private storage. No method of transmission or storage is perfectly
          secure, but we take reasonable measures to protect your data.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cookies">
        <p>
          We use only essential cookies required for authentication and session
          management. We do not use third-party advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection heading="5. Sharing & subprocessors">
        <p>
          We share data only with the service providers that help us run the
          Service (e.g. Supabase, Vercel), and only as needed to operate it. We
          may disclose information if required by law.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data retention">
        <p>
          We retain your data for as long as your account is active. When you
          delete your account, your associated records are removed, subject to
          any retention required by law.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          You can access and update your data in the app at any time, export
          your invoices and payments from the Reports page, and request deletion
          of your account. Depending on where you live, you may have additional
          rights over your personal data; contact us to exercise them.
        </p>
      </LegalSection>

      <LegalSection heading="8. Children">
        <p>
          The Service is not directed to anyone under 18, and we do not
          knowingly collect data from children.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          posted here with a new effective date.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>
          Questions or requests about your data? Contact us at{" "}
          <strong>[CONTACT EMAIL]</strong>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
