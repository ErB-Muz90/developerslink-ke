interface LogoMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export function LogoMark({ className = "", size = "md", showWordmark = true }: LogoMarkProps) {
  const dims = size === "sm" ? 22 : size === "lg" ? 36 : 28;

  return (
    <span className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Hexagonal shield mark */}
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Hex fill — subtle bg */}
        <polygon
          points="16,1.5 29,8.5 29,23.5 16,30.5 3,23.5 3,8.5"
          fill="currentColor"
          className="text-primary/10"
        />
        {/* Hex border */}
        <polygon
          points="16,1.5 29,8.5 29,23.5 16,30.5 3,23.5 3,8.5"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Center hub dot */}
        <circle cx="16" cy="16" r="2.6" fill="currentColor" className="text-primary" />
        {/* Top node line */}
        <line x1="16" y1="13.4" x2="16" y2="6.5" stroke="currentColor" className="text-primary" strokeWidth="1.3" strokeLinecap="round" />
        {/* Bottom-right node line */}
        <line x1="18.2" y1="17.3" x2="24.5" y2="21" stroke="currentColor" className="text-primary" strokeWidth="1.3" strokeLinecap="round" />
        {/* Bottom-left node line */}
        <line x1="13.8" y1="17.3" x2="7.5" y2="21" stroke="currentColor" className="text-primary" strokeWidth="1.3" strokeLinecap="round" />
        {/* Node dots at vertices */}
        <circle cx="16" cy="6" r="1.4" fill="currentColor" className="text-primary" opacity="0.7" />
        <circle cx="25" cy="21.5" r="1.4" fill="currentColor" className="text-primary" opacity="0.7" />
        <circle cx="7" cy="21.5" r="1.4" fill="currentColor" className="text-primary" opacity="0.7" />
      </svg>

      {showWordmark && (
        <span
          className={`font-mono font-black tracking-tight leading-none ${
            size === "sm"
              ? "text-base"
              : size === "lg"
              ? "text-2xl"
              : "text-xl"
          }`}
        >
          <span className="text-foreground">Dev</span>
          <span className="text-foreground">Link</span>
          <span className="text-primary"> KE</span>
        </span>
      )}
    </span>
  );
}
