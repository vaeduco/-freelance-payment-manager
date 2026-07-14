import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" effectiveDate="[EFFECTIVE DATE]">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
        use of FreelanceFlow (the &ldquo;Service&rdquo;), operated by{" "}
        <strong>[LEGAL ENTITY]</strong>. By creating an account or using the
        Service, you agree to these Terms.
      </p>

      <LegalSection heading="1. Eligibility & accounts">
        <p>
          You must be at least 18 years old and able to form a binding contract
          to use the Service. You are responsible for the activity under your
          account and for keeping your password secure. Notify us promptly of
          any unauthorized use.
        </p>
      </LegalSection>

      <LegalSection heading="2. The Service">
        <p>
          FreelanceFlow helps freelancers create and track invoices, log income
          and payments, manage clients, and estimate taxes. The Service is
          provided on an ongoing basis and may change over time. We may add,
          modify, or remove features.
        </p>
      </LegalSection>

      <LegalSection heading="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>use the Service for any unlawful or fraudulent purpose;</li>
          <li>
            upload content that infringes others&rsquo; rights or violates any
            law;
          </li>
          <li>
            attempt to access data that is not yours, or probe, scan, or breach
            security or authentication measures;
          </li>
          <li>
            disrupt or place undue load on the Service or its infrastructure.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Your content & data">
        <p>
          You retain all rights to the data you enter (clients, invoices,
          payments, logos, and business details). You grant us a limited license
          to store and process it solely to operate the Service for you. You are
          responsible for the accuracy and lawfulness of the data you upload.
          Our handling of personal data is described in our{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="5. Fees">
        <p>
          [Describe your pricing here — e.g. the Service is currently free, or
          paid plans are billed as disclosed at sign-up. Update this section
          before charging.]
        </p>
      </LegalSection>

      <LegalSection heading="6. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any
          kind. FreelanceFlow does not provide legal, accounting, or tax advice;
          tax estimates are informational only and you should consult a
          qualified professional. We do not guarantee the Service will be
          uninterrupted or error-free.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, [LEGAL ENTITY] will not be
          liable for any indirect, incidental, or consequential damages, or for
          lost profits or data, arising from your use of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="8. Termination">
        <p>
          You may stop using the Service and delete your account at any time. We
          may suspend or terminate access if you violate these Terms. On
          termination you may request an export of your data as described in the
          Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to these Terms">
        <p>
          We may update these Terms from time to time. Material changes will be
          posted here with a new effective date; continued use after changes
          means you accept them.
        </p>
      </LegalSection>

      <LegalSection heading="10. Governing law">
        <p>
          These Terms are governed by the laws of <strong>[JURISDICTION]</strong>,
          without regard to its conflict-of-laws rules.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about these Terms? Contact us at{" "}
          <strong>[CONTACT EMAIL]</strong>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
