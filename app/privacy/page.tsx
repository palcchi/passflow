import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy | PassFlow", description: "How PassFlow collects, uses and protects your personal data." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="6 October 2026">
      <p>PassFlow helps people register for events, keep their QR passes in one account and check in at the door. This policy explains what personal data we handle, why, and the choices you have. It is written with Indonesia&apos;s Personal Data Protection Law (UU No. 27 Tahun 2022) in mind.</p>

      <h2>Who is responsible</h2>
      <p>PassFlow runs the platform at passflow.my.id. When you register for an event, the organizer of that event decides how your registration is used for the event itself (for example who gets in and what happens on the day). PassFlow processes that data on the organizer&apos;s behalf and for running the platform.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your name, email address, username, password (stored only as a secure hash by our authentication provider) and an optional profile photo. If you sign in with Google we receive your name, email and profile picture from Google.</li>
        <li><strong>Registration data:</strong> the events you register for, the pass category you choose, an optional phone number, your approval status and your QR credential.</li>
        <li><strong>Check-in data:</strong> when and where your pass was scanned, which gate or activity it was used at, and benefits you claimed.</li>
        <li><strong>Organizer data:</strong> organization name, event details, uploaded images, Figma designs synced through the PassFlow plugin, and crew invitations.</li>
        <li><strong>Technical data:</strong> sign-in session cookies, and basic logs (IP address, browser, time of request) kept by our hosting provider for security and troubleshooting.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create and secure your account and keep you signed in.</li>
        <li>To register you for events, issue your QR pass and let organizers and their crew check you in.</li>
        <li>To tell you about your registrations, for example when an organizer approves or declines a request, by email and in your PassFlow notifications.</li>
        <li>To prevent abuse such as fake registrations, QR guessing and scanner misuse.</li>
        <li>To operate, fix and improve PassFlow.</li>
      </ul>
      <p>We do not sell your personal data and we do not use it for third-party advertising.</p>

      <h2>What organizers can see</h2>
      <p>When you register, the organizer of that event and the crew they invite can see your name, email, phone number (if you gave one), pass category, profile photo, approval status and check-in history for their event. Organizers cannot see your other registrations or your password.</p>

      <h2>Service providers</h2>
      <p>We use a small set of providers to run PassFlow. They only process data to provide their service to us:</p>
      <ul>
        <li><strong>Supabase</strong> for the database, authentication and file storage (data hosted in Singapore).</li>
        <li><strong>Vercel</strong> for hosting the website.</li>
        <li><strong>Resend</strong> for sending registration emails.</li>
        <li><strong>Google</strong> if you choose to sign in with Google.</li>
        <li><strong>Figma</strong> when an organizer connects a Figma file to design an event page or pass.</li>
      </ul>
      <p>Some of these providers store data outside Indonesia. We rely on their contractual and security safeguards for those transfers.</p>

      <h2>How long we keep data</h2>
      <p>We keep your account data while your account exists. Event registrations and check-in records are kept for as long as the organizer keeps the event, so they can handle disputes and audits; archived events keep their history. When you delete your account, we remove your profile and unlink your registrations, except where we must keep records for security or legal reasons.</p>

      <h2>Your rights</h2>
      <p>You can view and update your name, username and photo on your Profile page at any time. You can also ask us to give you a copy of your data, correct it, restrict or object to its use, or delete your account. For data an organizer holds about their event, you can also contact that organizer directly.</p>

      <h2>Security</h2>
      <p>Data travels over HTTPS. Access in the database is limited per account and per event, QR codes are long random tokens, and scanners are rate limited. No system is perfectly secure, so please keep your password private.</p>

      <h2>Children</h2>
      <p>PassFlow is not intended for children under 13. If a younger child registers for an event, a parent or guardian should do it for them.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we will update the date above and tell signed-in users in the app.</p>

      <h2>Contact</h2>
      <p>For privacy questions or requests, email <a href="mailto:privacy@passflow.my.id">privacy@passflow.my.id</a>.</p>
    </LegalPage>
  );
}
