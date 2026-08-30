// Colores cálidos que armonizan con la marca (terracota/crema), en vez de
// una paleta arcoíris genérica. El color de cada persona sale de un hash
// simple de su nombre, así que siempre es el mismo para el mismo nombre.
const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#be5b2e", fg: "#faf1e4" },
  { bg: "#8a5a3b", fg: "#faf1e4" },
  { bg: "#c98a4b", fg: "#2b2118" },
  { bg: "#a8763f", fg: "#faf1e4" },
  { bg: "#9c6b4f", fg: "#faf1e4" },
  { bg: "#b3763c", fg: "#2b2118" },
  { bg: "#7d6a52", fg: "#faf1e4" },
  { bg: "#c2925a", fg: "#2b2118" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ContactAvatar({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const { bg, fg } = AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
