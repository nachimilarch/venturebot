import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'September 8, 2026';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `VaartaBot ("we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, with whom we share it, and the choices you have. It applies to all users of the VaartaBot platform and website.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect information you provide directly — such as your name, business name, email address, phone number, and billing details when you register or make a purchase. We also collect data generated through your use of the Service, including campaign data, message logs, contact lists, and usage analytics. Technical data such as IP address, browser type, and device information is collected automatically.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your information to: (a) operate and maintain the VaartaBot platform; (b) process payments and manage your credit balance; (c) send service-related notifications and support communications; (d) improve platform features and performance through aggregated analytics; (e) comply with legal obligations; and (f) prevent fraud and abuse.`,
  },
  {
    title: '4. Contact Data You Upload',
    body: `When you upload contact lists or send messages through VaartaBot, you represent that you have obtained valid consent from those individuals to receive communications. We act as a data processor on your behalf for this data. We do not use your contacts' information for our own marketing purposes.`,
  },
  {
    title: '5. Data Sharing',
    body: `We do not sell your personal data. We may share data with: (a) messaging platform providers, as required to facilitate message delivery on your behalf; (b) payment processors (e.g., Cashfree) to handle transactions securely; (c) cloud infrastructure providers (e.g., AWS) who host our systems under data processing agreements; and (d) legal authorities when required by law.`,
  },
  {
    title: '6. Cookies & Tracking',
    body: `We use essential cookies to keep you logged in and maintain session state. We use analytics cookies to understand how users interact with the platform. You can control cookie preferences in your browser settings. Disabling essential cookies may affect platform functionality.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your account data for as long as your account is active. Message logs and campaign data are retained for 12 months from creation, after which they are deleted or anonymised. Billing records are retained for 7 years as required by Indian tax regulations. You may request deletion of your data at any time, subject to legal retention obligations.`,
  },
  {
    title: '8. Data Security',
    body: `We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest, role-based access controls, and regular security audits. However, no system is completely secure and we cannot guarantee absolute security of your data.`,
  },
  {
    title: '9. Your Rights',
    body: `You have the right to: (a) access the personal data we hold about you; (b) correct inaccurate data; (c) request deletion of your data ("right to be forgotten"); (d) export your data in a portable format; (e) object to or restrict certain processing; and (f) withdraw consent at any time. To exercise these rights, email privacy@vaartabot.in.`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `VaartaBot is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that a minor has provided us with personal information, we will delete it promptly.`,
  },
  {
    title: '11. International Data Transfers',
    body: `VaartaBot operates primarily in India. If you access the Service from outside India, your data may be transferred to and processed in India or other countries where our service providers operate. We ensure appropriate safeguards are in place for any such transfers.`,
  },
  {
    title: '12. Third-Party Links',
    body: `The Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies before providing any personal information.`,
  },
  {
    title: '13. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app banner at least 14 days before they take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    title: '14. Contact Us',
    body: `For privacy-related inquiries, data requests, or complaints, contact our Privacy Officer at privacy@vaartabot.in or write to: VaartaBot Privacy Team, Hyderabad, Telangana, India. We aim to respond to all requests within 30 days.`,
  },
];

const Privacy: React.FC = () => (
  <div className="min-h-screen bg-background text-foreground">

    {/* Nav */}
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--tenant-accent))] flex items-center justify-center shadow">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">VaartaBot</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>
    </header>

    {/* Body */}
    <main className="max-w-4xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="mb-12 pb-8 border-b border-border">
          <p className="text-xs font-semibold text-[hsl(var(--tenant-accent))] uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-foreground mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-muted-foreground mt-4 leading-relaxed max-w-2xl">
            Your privacy matters to us. This policy describes exactly what data VaartaBot collects, why we collect it, and how we protect it. We will never sell your personal data.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map(({ title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">{body}</p>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Questions?{' '}
            <a href="mailto:privacy@vaartabot.in" className="text-[hsl(var(--tenant-accent))] hover:underline">
              privacy@vaartabot.in
            </a>
            {' '}·{' '}
            <Link to="/terms" className="text-[hsl(var(--tenant-accent))] hover:underline">Terms of Service</Link>
          </p>
        </div>
      </motion.div>
    </main>
  </div>
);

export default Privacy;
