import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NAV } from './brand';

// The VaartaBot lockup as live markup (icon SVG + text), so it stays crisp and matches the brand file.
export const Lockup: React.FC<{ dark?: boolean; small?: boolean }> = ({ dark = false, small = false }) => (
  <Link to="/" className="flex items-center gap-2.5" aria-label="VaartaBot home">
    <img
      src={dark ? '/brand/vaartabot-icon-for-dark-bg.svg' : '/brand/vaartabot-icon.svg'}
      alt=""
      className={small ? 'h-8 w-8' : 'h-10 w-10'}
    />
    <span className="flex flex-col leading-none">
      <span
        className={`font-extrabold tracking-tight ${small ? 'text-base' : 'text-lg'}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <span className={dark ? 'text-white' : 'text-[#2E0B63]'}>Vaarta</span>
        <span className={dark ? 'text-[#2DB8C1]' : 'text-[#137F88]'}>Bot</span>
      </span>
      <span className={`mt-1 text-[10px] font-medium tracking-wide ${dark ? 'text-white/60' : 'text-muted-foreground'}`}>
        by Milarch Tech
      </span>
    </span>
  </Link>
);

const SiteHeader: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Lockup />

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map(l => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="hidden px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex">
            Log in
          </Link>
          <Link to="/register">
            <Button size="sm" className="bg-tenant-accent font-semibold text-white hover:bg-[hsl(var(--tenant-accent)/0.9)]">
              Get started free
            </Button>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 pb-4 pt-2 lg:hidden" aria-label="Mobile">
          {NAV.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
            >
              {l.label}
            </a>
          ))}
          <Link to="/contact" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted">
            Contact
          </Link>
          <Link to="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-muted-foreground hover:bg-muted">
            Log in
          </Link>
        </nav>
      )}
    </header>
  );
};

export default SiteHeader;
