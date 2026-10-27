// Inline icon paths in the style of Lucide (ISC licence). Decorative: always paired with text.
interface IconProps {
  size?: number;
}

function Svg({ size = 28, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Svg>
);

export const MessageIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);

export const MicIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10a7 7 0 0 1-14 0M12 19v3" />
  </Svg>
);

// Our own mark: a three-compartment pill box (morning, afternoon, night).
export const LogoMark = () => (
  <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden="true" focusable="false" className="logo-mark">
    <rect x="2" y="8" width="32" height="22" rx="6" fill="#ffffff" />
    <rect x="5" y="11" width="8" height="16" rx="3" fill="#f4b400" />
    <rect x="14" y="11" width="8" height="16" rx="3" fill="#dbe4ff" />
    <rect x="23" y="11" width="8" height="16" rx="3" fill="#dbe4ff" />
  </svg>
);
