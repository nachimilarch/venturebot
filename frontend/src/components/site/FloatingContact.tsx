import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

// Floating "Talk to us" button on public pages: opens the contact / setup-call form.
const FloatingContact: React.FC = () => (
  <Link
    to="/contact"
    aria-label="Talk to the VaartaBot team"
    className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-[#2E0B63] px-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#3D1A7E]"
  >
    <MessageCircle className="h-5 w-5 text-[#2DB8C1]" />
    <span className="hidden sm:inline">Talk to us</span>
  </Link>
);

export default FloatingContact;
