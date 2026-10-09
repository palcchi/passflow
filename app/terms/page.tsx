import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service | PassFlow", description: "The rules for using PassFlow as an attendee or organizer." };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="6 October 2026">
      <p>These terms apply when you use PassFlow at passflow.my.id, whether you register for events or organize them. By creating an account or registering for an event you agree to them. Please also read our <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate information and keep your password private. You are responsible for activity on your account.</li>
        <li>One person per account. Do not register with someone else&apos;s identity.</li>
        <li>Tell us if you think your account has been accessed without permission.</li>
      </ul>

      <h2>Registering for events</h2>
      <ul>
        <li>Each event is run by its organizer, not by PassFlow. The organizer decides who can attend, may require approval, and sets the rules, dates, prices and refunds for their event.</li>
        <li>A QR pass is personal. Do not copy, sell or share it unless the organizer allows it. Passes can be revoked if they are misused.</li>
        <li>An approved registration is not a guarantee against event changes or cancellation. Contact the organizer about changes to their event.</li>
      </ul>

      <h2>Organizing events</h2>
      <ul>
        <li>Organizers are responsible for their events, the information they publish, and how they treat attendee data. Only use attendee data to run your event and follow applicable law, including Indonesia&apos;s Personal Data Protection Law.</li>
        <li>Only upload content and Figma designs you have the right to use.</li>
        <li>Each organizer account can run one active event at a time unless PassFlow agrees otherwise.</li>
        <li>PassFlow may close an organizer workspace that misuses attendee data, check-in tools or the platform.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Do not use PassFlow to break the law, send spam, run fraudulent or harmful events, harvest other people&apos;s data, attack or overload the service, guess QR codes, or get around access controls.</p>

      <h2>Content</h2>
      <p>You keep ownership of content you add, such as event details, images and designs. You give PassFlow permission to host and display it so the service works, for example to show your event page and passes.</p>

      <h2>Availability</h2>
      <p>We work to keep PassFlow running, but the service is provided as is and may sometimes be unavailable or change. Keep a backup plan for check-in at important events, such as an exported guest list.</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, PassFlow is not liable for indirect losses, or for losses caused by an organizer&apos;s event or decisions. Nothing in these terms limits rights you have under consumer protection law.</p>

      <h2>Ending use</h2>
      <p>You can stop using PassFlow and ask us to delete your account at any time. We may suspend accounts that break these terms.</p>

      <h2>Changes and law</h2>
      <p>We may update these terms and will change the date above when we do. These terms are governed by the laws of the Republic of Indonesia.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: <a href="mailto:hello@passflow.my.id">hello@passflow.my.id</a>.</p>
    </LegalPage>
  );
}
