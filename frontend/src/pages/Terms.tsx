import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '17-04-2026 19:09:39';

const SECTIONS = [
  {
    title: '1. Agreement',
    body: `These Terms and Conditions, along with privacy policy or other terms ("Terms") constitute a binding agreement by and between NACHIKETH M DESAI ("Website Owner" or "we" or "us" or "our") and you ("you" or "your") and relate to your use of our website, goods (as applicable) or services (as applicable) (collectively, "Services"). By using our website and availing the Services, you agree that you have read and accepted these Terms (including the Privacy Policy).`,
  },
  {
    title: '2. Modifications',
    body: `We reserve the right to modify these Terms at any time and without assigning any reason. It is your responsibility to periodically review these Terms to stay informed of updates.`,
  },
  {
    title: '3. Account & Registration',
    body: `To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration, and you shall be responsible for all acts done through the use of your registered account.`,
  },
  {
    title: '4. Disclaimer of Warranties',
    body: `Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website or through the Services, for any specific purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.`,
  },
  {
    title: '5. User Responsibility',
    body: `Your use of our Services and the website is solely at your own risk and discretion. You are required to independently assess and ensure that the Services meet your requirements.`,
  },
  {
    title: '6. Intellectual Property',
    body: `The contents of the Website and the Services are proprietary to Us and you will not have any authority to claim any intellectual property rights, title, or interest in its contents. You acknowledge that unauthorized use of the Website or the Services may lead to action against you as per these Terms or applicable laws.`,
  },
  {
    title: '7. Charges',
    body: `You agree to pay us the charges associated with availing the Services.`,
  },
  {
    title: '8. Prohibited Use',
    body: `You agree not to use the website and/or Services for any purpose that is unlawful, illegal or forbidden by these Terms, or Indian or local laws that might apply to you.`,
  },
  {
    title: '9. Third-Party Links',
    body: `You agree and acknowledge that the website and the Services may contain links to other third party websites. On accessing these links, you will be governed by the terms of use, privacy policy and such other policies of such third party websites.`,
  },
  {
    title: '10. Binding Contract',
    body: `You understand that upon initiating a transaction for availing the Services you are entering into a legally binding and enforceable contract with us for the Services.`,
  },
  {
    title: '11. Refunds',
    body: `You shall be entitled to claim a refund of the payment made by you in case we are not able to provide the Service. The timelines for such return and refund will be according to the specific Service you have availed or within the time period provided in our policies (as applicable). In case you do not raise a refund claim within the stipulated time, then this would make you ineligible for a refund.`,
  },
  {
    title: '12. Force Majeure',
    body: `Notwithstanding anything contained in these Terms, the parties shall not be liable for any failure to perform an obligation under these Terms if performance is prevented or delayed by a force majeure event.`,
  },
  {
    title: '13. Governing Law & Jurisdiction',
    body: `These Terms and any dispute or claim relating to it, or its enforceability, shall be governed by and construed in accordance with the laws of India. All disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.`,
  },
  {
    title: '14. Contact',
    body: `All concerns or communications relating to these Terms must be communicated to us using the contact information provided on this website.`,
  },
];

const Terms: React.FC = () => (
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
          <h1 className="text-4xl font-bold text-foreground mb-3">Terms &amp; Conditions</h1>
          <p className="text-muted-foreground text-sm">Last updated on: {LAST_UPDATED}</p>
          <p className="text-muted-foreground mt-4 leading-relaxed max-w-2xl">
            These Terms and Conditions constitute a binding agreement between NACHIKETH M DESAI and you relating to your use of the VaartaBot website and Services. Please read them carefully before proceeding.
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
            <Link to="/privacy" className="text-[hsl(var(--tenant-accent))] hover:underline">Privacy Policy</Link>
            {' '}·{' '}
            <Link to="/" className="text-[hsl(var(--tenant-accent))] hover:underline">Back to home</Link>
          </p>
        </div>
      </motion.div>
    </main>
  </div>
);

export default Terms;