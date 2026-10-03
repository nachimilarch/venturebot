// Shared constants for the public VaartaBot website. Keep copy here so every page says the same thing.
export const CONTACT = {
  phoneDisplay: '+91 86869 03927',
  phoneHref: 'tel:+918686903927',
  email: 'hello@vaartabot.in',
  city: 'Hyderabad, Telangana',
};

export const NAV = [
  { label: 'See it work', href: '/#demo' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
];

// Accent palette for icons, chips and highlights on the public site.
// fg = icon/text colour on light grounds (all ≥ 4.5:1 on their bg); bg = the soft chip fill;
// onDark = the same hue for use on the midnight/indigo bands.
export const ACCENTS = [
  { name: 'teal',   fg: '#0F7078', bg: '#E1F5F6', onDark: '#2DB8C1' },
  { name: 'violet', fg: '#5F40B5', bg: '#ECE7FA', onDark: '#A58CF0' },
  { name: 'amber',  fg: '#A15C07', bg: '#FDF0D8', onDark: '#FBBF24' },
  { name: 'sky',    fg: '#0B6AA2', bg: '#E1F1FB', onDark: '#7DD3FC' },
] as const;

export const accent = (i: number) => ACCENTS[i % ACCENTS.length];
