// Cotton seed → plant growth — realistic SVG render for Core Seeds.
// Realism via: volumetric gradients, feTurbulence-displaced organic edges,
// soft shadows, depth-of-field blur, textured soil, golden-hour grade.
const { Stage, Sprite, useTime, Easing, interpolate, clamp } = window;
const E = Easing;
const seg = (t, a, b, e) => (e || ((x) => x))(clamp((t - a) / (b - a), 0, 1));

// 5-lobe palmate cotton leaf, base at (0,0), tip up (-y), height ~165.
// Smooth path; the #leafEdge turbulence filter roughens it into a natural toothed edge.
const LEAF_D =
  "M0,2 C22,-8 34,-30 31,-52 C49,-44 60,-60 47,-78 C64,-72 70,-92 54,-104 " +
  "C65,-118 50,-134 36,-125 C41,-148 17,-154 8,-140 L0,-166 L-8,-140 " +
  "C-17,-154 -41,-148 -36,-125 C-50,-134 -65,-118 -54,-104 C-70,-92 -64,-72 -47,-78 " +
  "C-60,-60 -49,-44 -31,-52 C-34,-30 -22,-8 0,2 Z";

const LEAVES = [
  { x: 944, y: 794, ang: -56, s: 0.95, at: 2.9, v: 1 },
  { x: 960, y: 700, ang: 60, s: 1.05, at: 3.5, v: 2 },
  { x: 950, y: 596, ang: -64, s: 0.95, at: 4.2, v: 1 },
  { x: 962, y: 496, ang: 68, s: 0.82, at: 4.9, v: 2 },
  { x: 956, y: 428, ang: -56, s: 0.66, at: 5.4, v: 1 },
];

function Leaf({ t, L }) {
  const gp = seg(t, L.at, L.at + 0.75, E.easeOutBack);
  if (gp <= 0) return null;
  const settle = seg(t, L.at, L.at + 1.0, E.easeOutCubic);
  const curl = (1 - settle) * 32 * (L.ang < 0 ? 1 : -1);
  const sway = Math.sin(t * 1.2 + L.x) * 2.2 * settle;
  const sc = L.s * gp;
  return (
    <g transform={`translate(${L.x} ${L.y}) rotate(${L.ang + curl + sway})`}>
      <line x1="0" y1="8" x2="0" y2="-20" stroke="#52701f" strokeWidth="5.5" strokeLinecap="round" />
      <g transform={`translate(0 -20) scale(${sc})`} filter="url(#leafEdge)">
        {/* cast/underside shadow for depth */}
        <path d={LEAF_D} fill="#1c4a1f" opacity="0.5" transform="translate(4 6)" />
        <path d={LEAF_D} fill={`url(#leaf${L.v})`} stroke="#235d27" strokeWidth="1.2" />
        {/* veins */}
        <g fill="none" strokeLinecap="round">
          <g stroke="#1f5523" strokeWidth="2.4" opacity="0.55">
            <path d="M0,4 L0,-156" />
            <path d="M0,-36 L-36,-92" /><path d="M0,-36 L36,-92" />
            <path d="M0,-74 L-30,-122" /><path d="M0,-74 L30,-122" />
          </g>
          <g stroke="#7fc06e" strokeWidth="1.1" opacity="0.5">
            <path d="M0,4 L0,-150" />
            <path d="M0,-36 L-34,-90" /><path d="M0,-36 L34,-90" />
          </g>
        </g>
        {/* sheen */}
        <path d={LEAF_D} fill="url(#leafSheen)" opacity="0.35" />
      </g>
    </g>
  );
}

function Flower({ t }) {
  const bud = seg(t, 5.8, 7.0, E.easeOutCubic);
  const bloom = seg(t, 7.0, 8.6, E.easeOutBack);
  const wilt = seg(t, 8.6, 9.5, E.easeInQuad);
  const vis = clamp(seg(t, 5.8, 6.2) - seg(t, 9.0, 9.6), 0, 1);
  if (vis <= 0) return null;
  const open = clamp(bloom - wilt, 0, 1);
  const ps = 0.2 + bud * 0.2 + open * 0.95;
  const cx = 958, cy = 360;
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const spread = 24 * open;
    const x = cx + Math.cos(a) * spread, y = cy + Math.sin(a) * spread;
    petals.push(
      <path
        key={i}
        d="M0,28 C-24,18 -22,-26 0,-38 C22,-26 24,18 0,28 Z"
        fill="url(#petal)"
        stroke="#ecc9a6"
        strokeWidth="1"
        transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90}) scale(${ps})`}
        opacity={0.55 + open * 0.45}
        filter="url(#petalTex)"
      />
    );
  }
  return (
    <g opacity={vis}>
      <ellipse cx={cx} cy={cy + 6} rx={48 * ps} ry={20 * ps} fill="#3a6128" opacity={0.25 * vis} filter="url(#soft)" />
      {petals}
      <circle cx={cx} cy={cy} r={13 * (0.4 + open * 0.6)} fill="url(#fcenter)" />
      {/* stamens */}
      {open > 0.4 && [...Array(8)].map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={cx + Math.cos(a) * 9} cy={cy + Math.sin(a) * 9} r="2.4" fill="#e9b84a" />;
      })}
    </g>
  );
}

// fluffy cotton lock: cluster of soft tufts merged + roughened by turbulence
function CottonLock({ cx, cy, scale }) {
  if (scale <= 0.02) return null;
  const blobs = [
    [0, 0, 16], [-12, -4, 12], [12, -3, 13], [-6, -14, 11], [8, -13, 12],
    [-15, 6, 10], [14, 7, 11], [0, 10, 12], [-8, 2, 13], [8, 2, 13], [0, -6, 14],
  ];
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <g filter="url(#fluff)">
        {/* soft shadow underside */}
        {blobs.map((b, i) => <circle key={"s" + i} cx={b[0] + 2} cy={b[1] + 3} r={b[2]} fill="#cfcdbf" />)}
        {blobs.map((b, i) => <circle key={"w" + i} cx={b[0]} cy={b[1]} r={b[2]} fill="url(#cotton)" />)}
      </g>
      {/* a couple of dark seed specks peeking */}
      <circle cx="-4" cy="2" r="2.2" fill="#5a3d24" opacity="0.5" />
      <circle cx="6" cy="-2" r="2" fill="#5a3d24" opacity="0.4" />
    </g>
  );
}

function Boll({ t }) {
  const form = seg(t, 9.0, 10.6, E.easeOutCubic);
  if (form <= 0) return null;
  const burst = seg(t, 11.0, 12.4, E.easeOutCubic);
  const cx = 958, cy = 358;
  const sepals = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const peel = burst * 34;
    const px = cx + Math.cos(a) * (9 + peel * 0.5);
    const py = cy + Math.sin(a) * (9 + peel * 0.5);
    sepals.push(
      <path key={i} d="M0,10 C8,-6 6,-26 0,-30 C-6,-26 -8,-6 0,10 Z" fill="url(#burr)"
        transform={`translate(${px} ${py}) rotate(${(a * 180) / Math.PI + 90 + burst * 38})`} filter="url(#leafEdge)" />
    );
  }
  const locks = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 4;
    const out = burst * 20;
    locks.push(<CottonLock key={i} cx={cx + Math.cos(a) * out} cy={cy + Math.sin(a) * out} scale={burst * 1.05} />);
  }
  return (
    <g>
      {sepals}
      <ellipse cx={cx} cy={cy} rx={20 * form} ry={26 * form} fill="url(#pod)" stroke="#35591f" strokeWidth="2" opacity={1 - burst} filter="url(#leafEdge)" />
      {burst > 0 && <g>{locks}</g>}
    </g>
  );
}

function Fluff({ t }) {
  const items = [];
  for (let i = 0; i < 14; i++) {
    const early = i < 4;
    const start = early ? 6 + i * 0.9 : 11.2 + (i - 4) * 0.2;
    const life = early ? 6 : 3.8;
    const p = clamp((t - start) / life, 0, 1);
    if (p <= 0 || p >= 1) continue;
    const baseX = early ? 320 + i * 380 : 958 + (((i * 53) % 130) - 65);
    const startY = early ? 870 : 360;
    const x = baseX + Math.sin((t + i) * 1.1) * 30;
    const y = startY - p * (startY + 90);
    const op = Math.sin(p * Math.PI) * (early ? 0.4 : 0.8);
    const sc = (early ? 0.4 : 0.55) + (i % 3) * 0.12;
    items.push(<g key={i} opacity={op}><CottonLock cx={x} cy={y} scale={sc} /></g>);
  }
  return <g>{items}</g>;
}

function Scene() {
  const t = useTime();
  const sc = interpolate([0, 2, 5.8, 7, 9, 11, 12.6, 14], [1.55, 1.5, 1.06, 1.06, 1.45, 1.7, 1.7, 1.0], E.easeInOutCubic)(t);
  const cx = interpolate([0, 2, 5.8, 9, 11, 12.6, 14], [946, 950, 958, 958, 958, 960, 960], E.easeInOutCubic)(t);
  const cy = interpolate([0, 2, 5.8, 7, 9, 11, 12.6, 14], [858, 838, 600, 560, 400, 362, 362, 560], E.easeInOutCubic)(t);
  const camT = `translate(${960 - cx * sc} ${540 - cy * sc}) scale(${sc})`;

  const grow = seg(t, 2.2, 5.8, E.easeInOutCubic);
  const swayAmp = seg(t, 5.6, 6.6);
  const sway = Math.sin(t * 1.05) * 1.25 * swayAmp;
  const seedV = 1 - seg(t, 1.7, 2.6, E.easeInQuad);
  const crack = seg(t, 1.6, 2.2);
  const br1 = seg(t, 4.5, 5.5, E.easeOutCubic);
  const br2 = seg(t, 5.0, 6.0, E.easeOutCubic);
  const tipY = interpolate([0, 1], [898, 334])(grow);
  const wm = seg(t, 12.6, 13.4, E.easeOutCubic);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ display: "block" }}>
        <defs>
          <radialGradient id="sky" cx="60%" cy="26%" r="95%">
            <stop offset="0%" stopColor="#4aa05f" />
            <stop offset="40%" stopColor="#22713c" />
            <stop offset="72%" stopColor="#0f4622" />
            <stop offset="100%" stopColor="#062510" />
          </radialGradient>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff3cf" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffd277" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffd277" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="grade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff0c8" stopOpacity="0.16" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#03210f" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="leaf1" cx="50%" cy="78%" r="80%">
            <stop offset="0%" stopColor="#79c75f" /><stop offset="55%" stopColor="#3f9a45" /><stop offset="100%" stopColor="#246b2a" />
          </radialGradient>
          <radialGradient id="leaf2" cx="50%" cy="78%" r="80%">
            <stop offset="0%" stopColor="#5fb24e" /><stop offset="55%" stopColor="#318139" /><stop offset="100%" stopColor="#1d5824" />
          </radialGradient>
          <linearGradient id="leafSheen" x1="0" y1="1" x2="0.4" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" /><stop offset="100%" stopColor="#eaffd9" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="stemg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3e5a1e" /><stop offset="35%" stopColor="#6f9038" /><stop offset="55%" stopColor="#9bbd5a" /><stop offset="100%" stopColor="#4a6822" />
          </linearGradient>
          <radialGradient id="cotton" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#ffffff" /><stop offset="70%" stopColor="#f4f3ea" /><stop offset="100%" stopColor="#dad8cb" />
          </radialGradient>
          <radialGradient id="petal" cx="50%" cy="80%" r="85%">
            <stop offset="0%" stopColor="#fff7e0" /><stop offset="60%" stopColor="#fbeec4" /><stop offset="100%" stopColor="#f3cdbc" />
          </radialGradient>
          <radialGradient id="fcenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c25a2f" /><stop offset="100%" stopColor="#7d2d18" />
          </radialGradient>
          <radialGradient id="pod" cx="42%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#6fa048" /><stop offset="60%" stopColor="#4a7a34" /><stop offset="100%" stopColor="#345824" />
          </radialGradient>
          <radialGradient id="burr" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#8a6a36" /><stop offset="100%" stopColor="#5a3f1e" />
          </radialGradient>
          <radialGradient id="soilg" cx="50%" cy="10%" r="100%">
            <stop offset="0%" stopColor="#5a4026" /><stop offset="55%" stopColor="#3a2616" /><stop offset="100%" stopColor="#1c1107" />
          </radialGradient>

          <filter id="leafEdge" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="petalTex" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="4" />
          </filter>
          <filter id="fluff" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="11" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="11" result="d" />
            <feGaussianBlur in="d" stdDeviation="1.1" />
          </filter>
          <filter id="soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="dof" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="ground" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="6" dy="10" stdDeviation="10" floodColor="#04130a" floodOpacity="0.5" />
          </filter>
          <filter id="soilTex">
            <feTurbulence type="fractalNoise" baseFrequency="0.5 0.5" numOctaves="3" seed="5" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" result="a" />
            <feComposite in="a" in2="SourceGraphic" operator="in" result="grain" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="grain" /></feMerge>
          </filter>
        </defs>

        {/* ===== blurred background (depth of field) ===== */}
        <g filter="url(#dof)">
          <rect x="-40" y="-40" width="2000" height="1160" fill="url(#sky)" />
          <circle cx={620 - Math.sin(t * 0.1) * 18} cy={228 + Math.cos(t * 0.1) * 12} r="540" fill="url(#sun)" />
          {/* soft out-of-focus background foliage blobs */}
          <g opacity="0.5" fill="#1c5e30">
            <ellipse cx="240" cy="760" rx="260" ry="200" />
            <ellipse cx="1720" cy="700" rx="300" ry="240" />
            <ellipse cx="1500" cy="900" rx="240" ry="180" fill="#13522a" />
          </g>
        </g>
        <rect x="0" y="0" width="1920" height="1080" fill="url(#grade)" />

        <Fluff t={t} />

        {/* ===== soil (textured) ===== */}
        <g filter="url(#soilTex)">
          <ellipse cx="960" cy="1012" rx="540" ry="156" fill="#1c1107" />
          <ellipse cx="960" cy="980" rx="440" ry="124" fill="url(#soilg)" />
        </g>
        <g opacity="0.8">
          {[[820, 952, 9], [905, 966, 6], [1015, 950, 11], [1095, 968, 7], [880, 972, 5], [1060, 958, 8], [960, 974, 6]].map((c, i) => (
            <g key={i}><ellipse cx={c[0]} cy={c[1]} rx={c[2]} ry={c[2] * 0.7} fill="#5a4026" /><ellipse cx={c[0] - 2} cy={c[1] - 2} rx={c[2] * 0.5} ry={c[2] * 0.35} fill="#6e5232" /></g>
          ))}
        </g>

        {/* ===== camera group ===== */}
        <g transform={camT}>
          <g stroke="#6a4a2a" strokeWidth="3.4" fill="none" strokeLinecap="round" opacity={0.5 * seg(t, 1.8, 3.6)}>
            <path d="M946,900 C940,940 918,960 902,1004" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - seg(t, 1.8, 3.4, E.easeOutCubic)} />
            <path d="M946,900 C952,945 977,966 994,1006" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - seg(t, 2.0, 3.6, E.easeOutCubic)} />
            <path d="M946,900 C944,950 944,978 944,1012" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - seg(t, 1.9, 3.5, E.easeOutCubic)} />
          </g>

          <g transform={`rotate(${sway} 946 900)`} filter="url(#ground)">
            <path d="M956,560 C1000,545 1030,520 1052,486" fill="none" stroke="url(#stemg)" strokeWidth="7.5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - br1} />
            <path d="M952,640 C912,628 884,604 866,572" fill="none" stroke="url(#stemg)" strokeWidth="7.5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - br2} />
            <path
              d="M946,900 C940,790 968,690 956,560 C948,470 962,400 958,334"
              fill="none" stroke="url(#stemg)" strokeWidth="14" strokeLinecap="round"
              pathLength="1" strokeDasharray="1" strokeDashoffset={1 - grow}
            />
            {grow < 0.999 && grow > 0.02 && <circle cx="958" cy={tipY} r="9" fill="#a9d074" />}

            {LEAVES.map((L, i) => <Leaf key={i} t={t} L={L} />)}
            <Flower t={t} />
            <Boll t={t} />
          </g>

          {seedV > 0.01 && (
            <g opacity={seedV} transform={`translate(946 ${862 + (1 - seedV) * 30})`} filter="url(#ground)">
              <g transform={`rotate(${-crack * 16})`}><path d="M0,2 a15,21 0 0,1 15,2 L0,2 Z" fill="#3a281a" /></g>
              <g transform={`rotate(${crack * 16})`}><path d="M0,2 a15,21 0 0,0 -15,2 L0,2 Z" fill="#241710" /></g>
              <ellipse cx="0" cy="0" rx="13" ry="19" fill="#2c1d12" opacity={1 - crack} />
              <ellipse cx="-4" cy="-5" rx="5" ry="7" fill="#4a3526" opacity={(1 - crack) * 0.7} />
              {crack > 0.3 && <path d={`M0,-6 q${9 * crack},-${18 * crack} 2,-${30 * crack}`} fill="none" stroke="#9bcf64" strokeWidth="5" strokeLinecap="round" />}
            </g>
          )}
        </g>

        {wm > 0 && (
          <g opacity={wm} transform={`translate(0 ${(1 - wm) * 18})`}>
            <text x="960" y="958" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="76" letterSpacing="6" fill="#ffffff">CORE SEEDS</text>
            <text x="960" y="1002" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontWeight="600" fontSize="25" letterSpacing="5" fill="#f0b429">GROWING TRUST · HARVESTING PROSPERITY</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function CottonGrowth() {
  return (
    <Stage width={1920} height={1080} duration={14} background="#062510" fps={30}>
      <Scene />
    </Stage>
  );
}

window.CottonGrowth = CottonGrowth;
