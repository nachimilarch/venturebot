import React from 'react';
import { MessageSquare } from 'lucide-react';
import { whatsappLink } from './brand';

const FloatingWhatsApp: React.FC = () => (
  <a
    href={whatsappLink()}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with VaartaBot on WhatsApp"
    className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-[#0E1625] shadow-lg transition-colors hover:bg-[#1ebe5a]"
  >
    <MessageSquare className="h-5 w-5" />
    <span className="hidden sm:inline">Chat on WhatsApp</span>
  </a>
);

export default FloatingWhatsApp;
