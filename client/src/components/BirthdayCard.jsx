// A designed birthday card. Four designs (see data/birthdayCards.js); each one has
// its own artwork drawn in SVG so it scales from a small preview to the dashboard.
//
//   <BirthdayCard card={filledCard} turning={25} />          full card
//   <BirthdayCard card={filledCard} size="sm" />              small preview

// Confetti stays near the edges so it never sits on the text
const CONFETTI = [
  [3, 30, '#F4B400', 'r', 20], [6, 52, '#16A34A', 'c', 0], [2, 70, '#EC4899', 'r', -30], [7, 88, '#3B82F6', 'r', 45],
  [95, 28, '#3B82F6', 'c', 0], [92, 46, '#F4B400', 'r', -15], [97, 64, '#16A34A', 'r', 60], [93, 84, '#EC4899', 'c', 0],
  [24, 95, '#F4B400', 'c', 0], [40, 97, '#3B82F6', 'r', 25], [62, 95, '#EC4899', 'r', -50], [78, 97, '#16A34A', 'r', 10],
  [84, 4, '#EC4899', 'c', 0], [90, 9, '#16A34A', 'r', 30], [4, 96, '#F4B400', 'r', 70], [97, 96, '#3B82F6', 'r', -20]
];

function ConfettiArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {CONFETTI.map(([x, y, color, shape, rot], i) => (
        shape === 'c'
          ? <circle key={i} cx={x} cy={y} r="1.3" fill={color} opacity="0.85" />
          : <rect key={i} x={x} y={y} width="1.6" height="3.6" rx="0.4" fill={color} opacity="0.85" transform={`rotate(${rot} ${x} ${y})`} />
      ))}
      <path d="M0 97 C 8 90, 14 99, 22 93" stroke="#F4B400" strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M100 18 C 94 24, 99 30, 93 36" stroke="#EC4899" strokeWidth="0.7" fill="none" opacity="0.5" />
    </svg>
  );
}

function SunriseArt() {
  const rays = Array.from({ length: 13 }, (_, i) => -90 + (i - 6) * 14);
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF1E8" />
          <stop offset="0.65" stopColor="#FFD3B6" />
          <stop offset="1" stopColor="#FDBA74" />
        </linearGradient>
      </defs>
      <rect width="200" height="100" fill="url(#bd-sky)" />
      <g transform="translate(100 104)">
        {rays.map(a => (
          <rect key={a} x="-1.2" y="-78" width="2.4" height="30" rx="1.2" fill="#FB923C" opacity="0.35" transform={`rotate(${a + 90})`} />
        ))}
        <circle r="34" fill="#F97316" opacity="0.9" />
        <circle r="26" fill="#FB923C" />
      </g>
      <path d="M0 94 Q 50 86 100 94 T 200 92 V100 H0 Z" fill="#EA580C" opacity="0.25" />
    </svg>
  );
}

function Frond({ x, y, rot, scale = 1 }) {
  // One palm frond: a curved spine with leaflets on both sides
  const leaves = Array.from({ length: 9 }, (_, i) => i);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <path d="M0 0 Q 22 -6 44 4" stroke="#22803F" strokeWidth="1.4" fill="none" />
      {leaves.map(i => {
        const t = (i + 1) / 10;
        const px = 44 * t;
        const py = -6 * 2 * t * (1 - t) + 4 * t * t;
        const len = 14 - i;
        return (
          <g key={i}>
            <path d={`M${px} ${py} q ${len * 0.3} ${-len * 0.9} ${len * 0.8} ${-len}`} stroke="#22803F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d={`M${px} ${py} q ${len * 0.4} ${len * 0.7} ${len * 0.9} ${len * 0.8}`} stroke="#1B6B34" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

function PalmArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="100" fill="#14532D" />
      <circle cx="170" cy="18" r="40" fill="#166534" />
      <circle cx="20" cy="96" r="34" fill="#166534" />
      <Frond x={-4} y={8} rot={18} />
      <Frond x={-6} y={22} rot={-4} scale={0.8} />
      <Frond x={204} y={90} rot={196} />
      <Frond x={206} y={74} rot={176} scale={0.75} />
      {[[150, 12], [178, 40], [120, 8], [10, 56], [60, 94], [190, 64]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - 2} L${x + 0.6} ${y - 0.6} L${x + 2} ${y} L${x + 0.6} ${y + 0.6} L${x} ${y + 2} L${x - 0.6} ${y + 0.6} L${x - 2} ${y} L${x - 0.6} ${y - 0.6} Z`} fill="#FACC15" opacity="0.85" />
      ))}
    </svg>
  );
}

function KolamCorner({ x, y, flipX = 1, flipY = 1 }) {
  // A small pulli kolam: a 3x3 dot grid with loops drawn around the dots
  const dots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) dots.push([c * 8, r * 8]);
  return (
    <g transform={`translate(${x} ${y}) scale(${flipX} ${flipY})`}>
      {dots.map(([dx, dy]) => <circle key={`${dx}-${dy}`} cx={dx} cy={dy} r="0.9" fill="#9F1239" />)}
      <path d="M-4 0 Q -4 -4 0 -4 Q 4 -4 4 0 Q 4 4 8 4 Q 12 4 12 8 Q 12 12 16 12 Q 20 12 20 16 Q 20 20 16 20 Q 12 20 12 16 Q 12 12 8 12 Q 4 12 4 8 Q 4 4 0 4 Q -4 4 -4 0 Z" fill="none" stroke="#9F1239" strokeWidth="0.8" />
      <path d="M16 -4 Q 20 -4 20 0 Q 20 4 16 4 Q 12 4 12 0 Q 12 -4 16 -4 Z M-4 16 Q -4 20 0 20 Q 4 20 4 16 Q 4 12 0 12 Q -4 12 -4 16 Z" fill="none" stroke="#9F1239" strokeWidth="0.8" />
    </g>
  );
}

function KolamArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="100" fill="#FFF8EE" />
      <rect x="4" y="4" width="192" height="92" rx="3" fill="none" stroke="#9F1239" strokeWidth="0.7" />
      <rect x="6.5" y="6.5" width="187" height="87" rx="2" fill="none" stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="1.2 1.6" />
      <KolamCorner x={14} y={14} />
      <KolamCorner x={186} y={14} flipX={-1} />
      <KolamCorner x={14} y={86} flipY={-1} />
      <KolamCorner x={186} y={86} flipX={-1} flipY={-1} />
      {Array.from({ length: 11 }, (_, i) => 50 + i * 10).map(x => (
        <g key={x}>
          <circle cx={x} cy="4" r="1.1" fill="#F59E0B" />
          <circle cx={x} cy="96" r="1.1" fill="#F59E0B" />
        </g>
      ))}
    </svg>
  );
}

const DESIGNS = {
  confetti: {
    Art: ConfettiArt,
    frame: 'bg-gradient-to-br from-[#FFF7D6] to-[#FEF3C7] border-[#F4B400]',
    title: 'text-neutral-900',
    subtitle: 'text-amber-700',
    body: 'text-neutral-700',
    chip: 'bg-[#F4B400] text-neutral-900',
    ring: 'ring-[#F4B400]'
  },
  sunrise: {
    Art: SunriseArt,
    frame: 'bg-[#FFE8DC] border-[#FDBA74]',
    title: 'text-[#7C2D12]',
    subtitle: 'text-[#C2410C]',
    body: 'text-[#431407]',
    chip: 'bg-[#EA580C] text-white',
    ring: 'ring-[#FB923C]'
  },
  palm: {
    Art: PalmArt,
    frame: 'bg-[#14532D] border-[#FACC15]',
    title: 'text-[#FACC15]',
    subtitle: 'text-emerald-100',
    body: 'text-white/90',
    chip: 'bg-[#FACC15] text-[#14532D]',
    ring: 'ring-[#FACC15]'
  },
  kolam: {
    Art: KolamArt,
    frame: 'bg-[#FFF8EE] border-[#9F1239]',
    title: 'text-[#9F1239]',
    subtitle: 'text-[#B45309]',
    body: 'text-[#3F1D1D]',
    chip: 'bg-[#9F1239] text-white',
    ring: 'ring-[#9F1239]'
  }
};

const ordinal = n => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export default function BirthdayCard({ card, turning, size = 'lg', footer = '', className = '' }) {
  if (!card) return null;
  const d = DESIGNS[card.id] || DESIGNS.confetti;
  const { Art } = d;
  const small = size === 'sm';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 ${d.frame} ${small ? 'aspect-[16/10]' : 'min-h-[260px] sm:min-h-[300px]'} ${className}`}
      role="img"
      aria-label={`${card.name || 'Birthday'} card: ${card.title}`}
    >
      <Art />
      {small && (
        <img src="/tnv-logo.png" alt="" className={`absolute left-1.5 top-1.5 h-6 w-6 rounded-full bg-white p-px ring-1 ${d.ring}`} />
      )}
      {!small && (
        // Header: TNV logo on the left, the organisation's name centred at the top
        <div className="relative grid grid-cols-[3rem_1fr_3rem] sm:grid-cols-[4rem_1fr_4rem] items-center gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
          <img
            src="/tnv-logo.png"
            alt="Tamil Nadu Volunteers logo"
            width="64"
            height="64"
            className={`h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white p-0.5 shadow-md ring-2 ${d.ring}`}
          />
          <div className="text-center min-w-0">
            <p className={`font-display text-sm sm:text-lg font-black uppercase tracking-[0.18em] ${d.title}`}>Tamil Nadu Volunteers</p>
            <p className={`text-[11px] sm:text-xs font-bold ${d.subtitle}`}>தமிழ்நாடு தன்னார்வலர்கள்</p>
          </div>
          <span aria-hidden="true" />
        </div>
      )}
      <div className={`relative flex flex-col items-center justify-center text-center ${small ? 'h-full gap-0.5 p-3' : 'gap-2 px-6 pb-7 pt-2 sm:px-12 sm:pb-9'}`}>
        <span className={small ? 'text-2xl' : 'text-4xl sm:text-5xl'} aria-hidden="true">{card.emoji}</span>
        {!small && turning > 0 && (
          <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${d.chip}`}>
            {ordinal(turning)} birthday
          </span>
        )}
        <h3 className={`font-display font-black leading-tight ${d.title} ${small ? 'text-xs line-clamp-2' : 'text-2xl sm:text-3xl max-w-xl'}`}>
          {card.title}
        </h3>
        <p className={`font-bold ${d.subtitle} ${small ? 'text-[9px] line-clamp-1' : 'text-sm sm:text-base'}`}>{card.subtitle}</p>
        {!small && (
          <p className={`mt-1 max-w-lg text-sm leading-relaxed sm:text-[15px] ${d.body}`}>{card.message}</p>
        )}
        {!small && footer && (
          <p className={`mt-2 text-[11px] font-bold uppercase tracking-[0.2em] ${d.subtitle}`}>— {footer} —</p>
        )}
      </div>
    </div>
  );
}
