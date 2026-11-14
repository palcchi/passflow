import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | PassFlow",
  description: "How to request deletion of your PassFlow account and personal data.",
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion Instructions" updated="19 October 2026">
      <p>
        PassFlow respects your privacy and provides a way to request deletion of your account
        and personal data. Follow the steps below to submit a request.
      </p>

      <h2>How to request deletion</h2>
      <ol>
        <li>
          Send an email to <a href="mailto:privacy@passflow.my.id">privacy@passflow.my.id</a>
          {" "}with the subject line <strong>PassFlow Data Deletion Request</strong>.
        </li>
        <li>
          Include the email address associated with your PassFlow account and, if applicable,
          your username. Do not send your password, authentication codes, or QR ticket.
        </li>
        <li>
          We may ask for reasonable information to verify that you control the account before
          processing the request.
        </li>
      </ol>

      <h2>What may be deleted</h2>
      <p>
        After we verify a request, we will review and delete or de-identify personal account
        information that we are able to remove, such as your profile details and account
        associations, subject to applicable law and legitimate security requirements.
      </p>
      <p>
        Event registration, attendance, check-in, transaction, or organizer records may need
        to be retained for a limited period where required for legal obligations, dispute
        resolution, event administration, fraud prevention, or platform security. Where
        appropriate, we will remove direct account links or limit access to retained records.
        A deletion request does not itself cancel an event registration or resolve any
        outstanding matter with an event organizer.
      </p>

      <h2>Processing time and confirmation</h2>
      <p>
        We will acknowledge your request and let you know if additional verification is
        needed. We aim to complete verified requests within 30 days, or explain if a longer
        period is reasonably required or a legal exception applies. We will notify you when
        processing is complete, where we have a working way to contact you.
      </p>

      <h2>Data held by event organizers</h2>
      <p>
        Event organizers may separately hold information about registrations for their events.
        You may contact the relevant organizer as well as PassFlow to request deletion of
        information they control.
      </p>

      <h2>Questions</h2>
      <p>
        For privacy or deletion questions, contact{" "}
        <a href="mailto:privacy@passflow.my.id">privacy@passflow.my.id</a>.
        You can also read our <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
