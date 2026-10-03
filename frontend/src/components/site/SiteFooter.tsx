import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import { Lockup } from './SiteHeader';
import { CONTACT } from './brand';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'See it work', href: '/#demo' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Milarch Tech', href: '/about' },
      { label: 'Contact us', href: '/contact' },
      { label: 'Log in', href: '/login' },
      { label: 'Create free account', href: '/register' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
      { label: 'Refund & cancellation', href: '/refund' },
    ],
  },
];

const SiteFooter: React.FC = () => (
  <footer className="bg-sidebar text-sidebar-foreground">
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-28 pt-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="space-y-4">
        <Lockup dark />
        <p className="max-w-xs text-sm leading-relaxed text-sidebar-muted">
          Replies to every enquiry within minutes, follows up automatically, and keeps every lead in one place.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-full bg-[#2DB8C1] px-4 py-2 text-sm font-semibold text-[#0D0A1A] hover:bg-[#41C8C3]"
        >
          <CalendarCheck className="h-4 w-4" />
          Book a free setup call
        </Link>
      </div>

      {COLUMNS.map(col => (
        <div key={col.title}>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#2DB8C1]">{col.title}</p>
          <ul className="space-y-2.5">
            {col.links.map(l => (
              <li key={l.label}>
                {l.href.startsWith('/#') ? (
                  <a href={l.href} className="text-sm text-sidebar-foreground/75 hover:text-white">{l.label}</a>
                ) : (
                  <Link to={l.href} className="text-sm text-sidebar-foreground/75 hover:text-white">{l.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-sidebar-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-sidebar-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>© {new Date().getFullYear()} VaartaBot by Milarch Tech · {CONTACT.city}</span>
        <span>AI sales assistant and CRM for Indian businesses</span>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
