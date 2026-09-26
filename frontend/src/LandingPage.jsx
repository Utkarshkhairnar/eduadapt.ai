import React, { useEffect, useState, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────
   LandingPage — matches the app's light/off-white colour grade
   with rich animations: floating nodes, scroll-reveal sections,
   animated gradient orbs, pulsing cards, flowing lines.
   ───────────────────────────────────────────────────────────── */

/* ══ Design tokens — same as app's index.css ══════════════════ */
const C = {
  bgBase:      '#f7f9fc',
  bgCard:      '#ffffff',
  bgMuted:     '#f1f5f9',
  bgSubtle:    '#f8fafc',
  bgDark:      '#18191d',
  bgDarkPanel: '#22242a',
  border:      '#e2e8f0',
  borderMuted: '#cbd5e1',
  primary:     '#0f172a',
  accent:      '#2563eb',
  success:     '#10b981',
  warning:     '#f59e0b',
  danger:      '#ef4444',
  textMain:    '#0f172a',
  textMuted:   '#64748b',
  textDim:     '#94a3b8',
  shadowMd:    '0 4px 20px -2px rgba(15,23,42,0.07), 0 2px 6px -1px rgba(15,23,42,0.04)',
  shadowLg:    '0 10px 40px -6px rgba(15,23,42,0.10)',
  shadowGlow:  '0 0 32px rgba(37,99,235,0.12)',
};

/* ══ Injected CSS: animations + responsive + focus ════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700;800&display=swap');

/* ── Scroll-reveal ── */
.lp-reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1);
}
.lp-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
.lp-reveal-delay-1 { transition-delay: 0.1s; }
.lp-reveal-delay-2 { transition-delay: 0.2s; }
.lp-reveal-delay-3 { transition-delay: 0.3s; }
.lp-reveal-delay-4 { transition-delay: 0.4s; }
.lp-reveal-delay-5 { transition-delay: 0.5s; }

/* ── Orb gradient blobs ── */
@keyframes orbFloat1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(30px,-20px) scale(1.06); }
  66%      { transform: translate(-15px,25px) scale(0.96); }
}
@keyframes orbFloat2 {
  0%,100% { transform: translate(0,0) scale(1); }
  40%      { transform: translate(-25px,18px) scale(1.08); }
  75%      { transform: translate(20px,-30px) scale(0.94); }
}
.lp-orb1 { animation: orbFloat1 12s ease-in-out infinite; }
.lp-orb2 { animation: orbFloat2 15s ease-in-out infinite; }

/* ── Hero headline shimmer ── */
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.lp-shimmer-text {
  background: linear-gradient(
    90deg,
    #0f172a 0%,
    #2563eb 30%,
    #10b981 50%,
    #2563eb 70%,
    #0f172a 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 5s linear infinite;
}

/* ── Floating concept nodes (hero bg) ── */
@keyframes nodeFloat {
  0%,100% { transform: translateY(0px) scale(1); opacity: 0.65; }
  50%      { transform: translateY(-14px) scale(1.12); opacity: 1; }
}
@keyframes edgeDash {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -80; }
}
.lp-node-anim { animation: nodeFloat ease-in-out infinite; }
.lp-edge-anim { animation: edgeDash linear infinite; }

/* ── Step cards hover lift ── */
.lp-step-card {
  transition: transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease, border-color 0.22s ease;
  cursor: default;
}
.lp-step-card:hover {
  transform: translateY(-5px) scale(1.015);
  box-shadow: 0 16px 40px -8px rgba(15,23,42,0.13);
  border-color: #cbd5e1;
}

/* ── Subject cards ── */
.lp-subject-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.lp-subject-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 35px -6px rgba(15,23,42,0.12);
}

/* ── Stat callout pulse ── */
@keyframes statPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
  50%      { box-shadow: 0 0 0 6px rgba(37,99,235,0.08); }
}
.lp-stat:hover { animation: statPulse 1.4s ease-in-out; }

/* ── Nav ── */
.lp-nav-solid {
  background: rgba(247,249,252,0.92) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom-color: #e2e8f0 !important;
}

/* ── CTAs ── */
.lp-cta-primary {
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 0.78rem 1.8rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.lp-cta-primary:hover { opacity: 0.87; transform: translateY(-1px); }

.lp-cta-outline {
  background: transparent;
  color: #0f172a;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  padding: 0.78rem 1.8rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.lp-cta-outline:hover { border-color: #94a3b8; transform: translateY(-1px); }

/* ── Focus rings ── */
.lp-cta-primary:focus-visible,
.lp-cta-outline:focus-visible,
.lp-nav-link:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
  border-radius: 6px;
}
.lp-nav-link { text-decoration: none; }

/* ── Ticker strip ── */
@keyframes tickerScroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.lp-ticker-track { animation: tickerScroll 28s linear infinite; }

/* ── Mastery bar fill ── */
@keyframes barFill {
  from { width: 0%; }
  to   { width: var(--bar-target); }
}
.lp-bar-fill { animation: barFill 1.4s cubic-bezier(0.22,1,0.36,1) forwards; animation-delay: 0.4s; }

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .lp-reveal, .lp-orb1, .lp-orb2, .lp-shimmer-text,
  .lp-node-anim, .lp-edge-anim, .lp-ticker-track,
  .lp-step-card, .lp-subject-card {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .lp-desktop-nav { display: none !important; }
  .lp-mobile-toggle { display: block !important; }
}
@media (max-width: 880px) {
  .lp-hero-grid { flex-direction: column !important; }
  .lp-about-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 560px) {
  .lp-steps-grid { grid-template-columns: 1fr 1fr !important; }
  .lp-subjects-grid { grid-template-columns: 1fr !important; }
  .lp-cta-row { flex-direction: column !important; align-items: flex-start !important; }
}
`;

/* ══ Scroll-reveal hook ════════════════════════════════════════ */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ══ Brand mark SVG ════════════════════════════════════════════ */
function BrandMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="4"  cy="20" r="3" fill={C.success} opacity="0.9" />
      <circle cx="12" cy="4"  r="3" fill={C.primary} />
      <circle cx="20" cy="20" r="3" fill={C.accent}  opacity="0.9" />
      <line x1="4"  y1="20" x2="12" y2="4"  stroke={C.border} strokeWidth="1.5" />
      <line x1="12" y1="4"  x2="20" y2="20" stroke={C.border} strokeWidth="1.5" />
      <line x1="4"  y1="20" x2="20" y2="20" stroke={C.border} strokeWidth="1.5" />
    </svg>
  );
}

/* ══ Hero Constellation (light mode) ══════════════════════════ */
const NODES = [
  { cx:520, cy:90,  r:7,   c:C.success, delay:'0s',   dur:'3.0s' },
  { cx:680, cy:170, r:5,   c:C.accent,  delay:'0.6s',  dur:'3.6s' },
  { cx:440, cy:230, r:6,   c:C.primary, delay:'1.2s',  dur:'2.8s' },
  { cx:750, cy:300, r:8,   c:C.success, delay:'0.3s',  dur:'3.9s' },
  { cx:570, cy:360, r:4.5, c:C.accent,  delay:'0.9s',  dur:'3.2s' },
  { cx:630, cy:210, r:5.5, c:C.warning, delay:'1.5s',  dur:'3.5s' },
  { cx:490, cy:320, r:4,   c:C.success, delay:'0.2s',  dur:'2.6s' },
  { cx:710, cy:410, r:6,   c:C.primary, delay:'1.3s',  dur:'3.8s' },
];
const EDGES = [
  { x1:520,y1:90,  x2:680,y2:170, dur:'3.4s', delay:'-0.5s' },
  { x1:680,y1:170, x2:630,y2:210, dur:'2.9s', delay:'-1.2s' },
  { x1:440,y1:230, x2:570,y2:360, dur:'3.7s', delay:'-0.8s' },
  { x1:630,y1:210, x2:750,y2:300, dur:'4.1s', delay:'-1.5s' },
  { x1:570,y1:360, x2:710,y2:410, dur:'3.0s', delay:'-0.3s' },
  { x1:490,y1:320, x2:570,y2:360, dur:'2.7s', delay:'-1.1s' },
  { x1:520,y1:90,  x2:440,y2:230, dur:'4.4s', delay:'-0.7s' },
  { x1:750,y1:300, x2:710,y2:410, dur:'3.2s', delay:'-0.4s' },
];

function ConstellationBg() {
  return (
    <svg viewBox="0 0 800 500" aria-hidden="true" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', right:0, top:0, width:'58%', height:'100%', opacity:0.18, pointerEvents:'none' }}>
      {EDGES.map((e,i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={C.accent} strokeWidth="1.5" strokeOpacity="0.6"
          strokeDasharray="10 7"
          className="lp-edge-anim"
          style={{ animationDuration: e.dur, animationDelay: e.delay }}
        />
      ))}
      {NODES.map((n,i) => (
        <g key={i} className="lp-node-anim"
          style={{ transformOrigin:`${n.cx}px ${n.cy}px`, animationDuration: n.dur, animationDelay: n.delay }}>
          <circle cx={n.cx} cy={n.cy} r={n.r * 3.5} fill={n.c} opacity="0.08" />
          <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.c} opacity="0.75" />
        </g>
      ))}
    </svg>
  );
}

/* ══ Gradient Orbs (background decoration) ════════════════════ */
function GradientOrbs() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      <div className="lp-orb1" style={{
        position:'absolute', top:'-10%', right:'5%',
        width:520, height:520,
        borderRadius:'50%',
        background:'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
      }} />
      <div className="lp-orb2" style={{
        position:'absolute', bottom:'5%', left:'8%',
        width:420, height:420,
        borderRadius:'50%',
        background:'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
      }} />
    </div>
  );
}

/* ══ Kicker label ══════════════════════════════════════════════ */
function Kicker({ children, color = C.accent }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:'0.45rem',
      fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
      color, marginBottom:'1rem',
    }}>
      <span style={{ width:20, height:2, background:color, borderRadius:2 }} />
      {children}
    </div>
  );
}

/* ══ Section title ═════════════════════════════════════════════ */
function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={className} style={{
      fontFamily:"'Newsreader', Georgia, serif",
      fontSize:'clamp(1.7rem, 3.8vw, 2.6rem)',
      fontWeight:700, lineHeight:1.15,
      color:C.textMain, marginBottom:'0.8rem',
    }}>
      {children}
    </h2>
  );
}

/* ══ Light card ════════════════════════════════════════════════ */
function Card({ children, className='', style={} }) {
  return (
    <div className={className} style={{
      background:C.bgCard,
      border:`1px solid ${C.border}`,
      borderRadius:18,
      boxShadow:C.shadowMd,
      padding:'1.3rem 1.4rem',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ══ Dark card (like DiagnosticTest left panel) ════════════════ */
function DarkCard({ children, style={} }) {
  return (
    <div style={{
      background:C.bgDark,
      border:`1px solid rgba(255,255,255,0.07)`,
      borderRadius:18,
      padding:'1.3rem 1.4rem',
      color:'#eef0fa',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ══ Animated number counter ══════════════════════════════════ */
function Counter({ target, suffix='' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1200;
        const steps = 40;
        const inc = target / steps;
        let cur = 0;
        const iv = setInterval(() => {
          cur = Math.min(cur + inc, target);
          setCount(Math.round(cur));
          if (cur >= target) clearInterval(iv);
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ══ Ticker strip ══════════════════════════════════════════════ */
const TICKER_ITEMS = [
  '📊 Bayesian Knowledge Tracing','🔍 Root Prerequisite Gap Detection','🎯 Adaptive Difficulty Calibration',
  '📈 Longitudinal Mastery Profiles','🧠 Concept Graph Traversal','🏫 Class-level Heatmaps',
  '📊 Bayesian Knowledge Tracing','🔍 Root Prerequisite Gap Detection','🎯 Adaptive Difficulty Calibration',
  '📈 Longitudinal Mastery Profiles','🧠 Concept Graph Traversal','🏫 Class-level Heatmaps',
];
function TickerStrip() {
  return (
    <div style={{ overflow:'hidden', background:C.bgDark, padding:'0.7rem 0', borderTop:`1px solid rgba(255,255,255,0.06)`, borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
      <div className="lp-ticker-track" style={{ display:'flex', gap:'2.5rem', width:'max-content', willChange:'transform' }}>
        {TICKER_ITEMS.map((item,i) => (
          <span key={i} style={{ fontSize:'0.78rem', fontWeight:600, color:'rgba(238,240,250,0.72)', whiteSpace:'nowrap', letterSpacing:'0.02em' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══ A) Nav (Simplified) ═══════════════════════════════════════ */
function Nav({ onEnterApp }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [
    { href: '#how-it-works', label: 'How it works' },
    { href: '#subjects', label: 'Subjects' },
    { href: '#about', label: 'About' },
  ];

  return (
    <nav
      className={scrolled ? 'lp-nav-solid' : ''}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(247,249,252,0.92)' : 'rgba(247,249,252,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        boxShadow: scrolled ? '0 2px 10px rgba(15,23,42,0.03)' : 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '0 1.5rem',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand: Brand mark + name on left */}
        <a
          href="#hero"
          className="lp-nav-link"
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
        >
          <BrandMark size={22} />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: C.textMain, letterSpacing: '-0.02em' }}>
            EduAdapt <span style={{ color: C.accent }}>AI</span>
          </span>
        </a>

        {/* Desktop Nav: At most 3 links + single Open App CTA */}
        <div className="lp-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="lp-nav-link"
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                color: C.textMuted,
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.target.style.color = C.textMain)}
              onMouseLeave={(e) => (e.target.style.color = C.textMuted)}
            >
              {label}
            </a>
          ))}
          <button
            className="lp-cta-primary"
            onClick={onEnterApp}
            style={{ marginLeft: '0.6rem', padding: '0.45rem 1.15rem', fontSize: '0.85rem' }}
          >
            Open App →
          </button>
        </div>

        {/* Mobile Hamburger Icon Button */}
        <button
          className="lp-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          style={{
            display: 'none',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '0.35rem',
            cursor: 'pointer',
            color: C.textMain,
          }}
        >
          {mobileMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Slide-down Menu Sheet */}
      {mobileMenuOpen && (
        <div
          style={{
            background: '#ffffff',
            borderBottom: `1px solid ${C.border}`,
            boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
            padding: '1rem 1.5rem 1.3rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: C.textMain,
                textDecoration: 'none',
                padding: '0.4rem 0',
                borderBottom: `1px solid ${C.bgMuted}`,
              }}
            >
              {label}
            </a>
          ))}
          <button
            className="lp-cta-primary"
            onClick={() => {
              setMobileMenuOpen(false);
              onEnterApp();
            }}
            style={{ marginTop: '0.4rem', justifyContent: 'center', width: '100%', padding: '0.7rem' }}
          >
            Open App →
          </button>
        </div>
      )}
    </nav>
  );
}

/* ══ B) Hero ═══════════════════════════════════════════════════ */
function Hero({ onEnterApp }) {
  return (
    <section id="hero" style={{ position:'relative', overflow:'hidden', minHeight:'96vh', display:'flex', alignItems:'center', paddingTop:'5rem', background:C.bgBase }}>
      <GradientOrbs />
      <ConstellationBg />

      <div style={{ maxWidth:1160, margin:'0 auto', padding:'3rem 1.5rem 5rem', position:'relative', zIndex:1, width:'100%' }}>
        <div className="lp-hero-grid" style={{ display:'flex', alignItems:'center', gap:'3rem' }}>
          {/* Left */}
          <div style={{ flex:'0 0 auto', maxWidth:580 }}>
            {/* Eyebrow badge */}
            <div className="lp-reveal" style={{
              display:'inline-flex', alignItems:'center', gap:'0.5rem',
              background:C.bgCard, border:`1px solid ${C.border}`,
              borderRadius:9999, padding:'0.32rem 0.9rem',
              fontSize:'0.78rem', fontWeight:600, color:C.accent,
              boxShadow:C.shadowMd, marginBottom:'1.6rem',
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:C.success, display:'inline-block', animation:'nodeFloat 2s ease-in-out infinite' }} />
              Adaptive learning platform
            </div>

            {/* Headline */}
            <h1 className="lp-reveal lp-reveal-delay-1" style={{
              fontFamily:"'Newsreader', Georgia, serif",
              fontSize:'clamp(2.2rem, 5.8vw, 3.8rem)',
              fontWeight:700, lineHeight:1.10, letterSpacing:'-0.025em',
              color:C.textMain, marginBottom:'0.4rem',
            }}>
              Study what you're
            </h1>
            <h1 className="lp-reveal lp-reveal-delay-2 lp-shimmer-text" style={{
              fontFamily:"'Newsreader', Georgia, serif",
              fontSize:'clamp(2.2rem, 5.8vw, 3.8rem)',
              fontWeight:700, lineHeight:1.10, letterSpacing:'-0.025em',
              marginBottom:'1.4rem',
            }}>
              actually missing.
            </h1>

            {/* Subhead */}
            <p className="lp-reveal lp-reveal-delay-3" style={{ fontSize:'1.05rem', lineHeight:1.7, color:C.textMuted, marginBottom:'2.2rem', maxWidth:500 }}>
              A short diagnostic traces every wrong answer to its root prerequisite gap —
              then builds a precise learning path and adaptive quiz that shifts difficulty
              question by question, tracking mastery across six subjects.
            </p>

            {/* CTAs */}
            <div className="lp-reveal lp-reveal-delay-4 lp-cta-row" style={{ display:'flex', gap:'0.85rem', flexWrap:'wrap' }}>
              <a href="#how-it-works" className="lp-cta-primary">See how it works ↓</a>
              <a href="#subjects" className="lp-cta-outline">Browse subjects</a>
            </div>

            {/* Metrics row */}
            <div className="lp-reveal lp-reveal-delay-5" style={{ display:'flex', gap:'2rem', marginTop:'2.5rem', flexWrap:'wrap' }}>
              {[
                { val:6, suf:'', label:'Subjects' },
                { val:100, suf:'+', label:'Concept Nodes' },
                { val:5, suf:' steps', label:'Per cycle' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize:'1.6rem', fontWeight:800, color:C.textMain, lineHeight:1 }}>
                    <Counter target={m.val} suffix={m.suf} />
                  </div>
                  <div style={{ fontSize:'0.78rem', color:C.textMuted, marginTop:'0.2rem' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mini app preview card */}
          <div className="lp-reveal lp-reveal-delay-3" style={{ flex:1, minWidth:0 }}>
            <div style={{ position:'relative' }}>
              {/* Glow behind card */}
              <div style={{ position:'absolute', inset:'-12px', borderRadius:26, background:'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)', filter:'blur(8px)' }} />
              <DarkCard style={{ position:'relative', padding:'1.5rem' }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, color:'rgba(238,240,250,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.9rem' }}>
                  📊 Live Mastery Preview
                </div>
                {[
                  { name:'Automata Theory', pct:82, color:C.success },
                  { name:'ADSA', pct:61, color:C.accent },
                  { name:'Maths 3', pct:44, color:C.warning },
                  { name:'Java', pct:78, color:C.success },
                  { name:'C Programming', pct:33, color:'#ef4444' },
                  { name:'Python', pct:90, color:C.success },
                ].map((s,i) => (
                  <div key={s.name} style={{ marginBottom:'0.65rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'rgba(238,240,250,0.8)', marginBottom:'0.25rem' }}>
                      <span>{s.name}</span>
                      <span style={{ fontWeight:700, color:s.color }}>{s.pct}%</span>
                    </div>
                    <div style={{ width:'100%', height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                      <div className="lp-bar-fill" style={{
                        '--bar-target': `${s.pct}%`,
                        height:'100%', background:s.color, borderRadius:3, width:0,
                        animationDelay: `${0.3 + i * 0.1}s`,
                      }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:'1rem', padding:'0.6rem 0.8rem', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.22)', borderRadius:10, fontSize:'0.72rem', color:'#6ee7b7', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  ✓ Root gap identified: <strong>Recursive Data Structures</strong>
                </div>
              </DarkCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══ Ticker ════════════════════════════════════════════════════ */

/* ══ C) How it works ═══════════════════════════════════════════ */
const STEPS = [
  { num:'01', label:'Diagnostic',     desc:'A short breadth-first test samples every core concept to calibrate where understanding breaks down.', color:C.accent,   bg:'rgba(37,99,235,0.06)'  },
  { num:'02', label:'Gap Analysis',   desc:'Wrong answers are traced backward through the prerequisite graph to the earliest unmastered concept.', color:C.danger,   bg:'rgba(239,68,68,0.06)'  },
  { num:'03', label:'Learning Path',  desc:'A topologically-ordered path is built from that gap, with AI explanations, analogies and worked examples.', color:C.success, bg:'rgba(16,185,129,0.06)' },
  { num:'04', label:'Adaptive Quiz',  desc:'Difficulty shifts question by question. Correct answers raise it; wrong answers lower it. Bounded 1→7.', color:C.warning,  bg:'rgba(245,158,11,0.06)' },
  { num:'05', label:'Updated Profile',desc:'Bayesian mastery scores update after every attempt. Next cycle starts from the new baseline, subject by subject.', color:C.accent,   bg:'rgba(37,99,235,0.06)'  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding:'7rem 1.5rem', background:C.bgSubtle, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
      <div style={{ maxWidth:1160, margin:'0 auto' }}>
        <div className="lp-reveal" style={{ textAlign:'center', marginBottom:'3.5rem' }}>
          <Kicker>How it works</Kicker>
          <SectionTitle>Five steps. One complete learning cycle.</SectionTitle>
          <p style={{ color:C.textMuted, fontSize:'0.96rem', lineHeight:1.7, maxWidth:520, margin:'0 auto' }}>
            Each cycle produces an updated mastery profile that feeds directly into the next diagnostic — the platform gets more precise every time.
          </p>
        </div>

        <div className="lp-steps-grid lp-reveal" style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'1rem' }}>
          {STEPS.map((s, i) => (
            <Card key={s.num} className={`lp-step-card lp-reveal lp-reveal-delay-${i+1}`}
              style={{ borderTop:`3px solid ${s.color}`, background:s.bg, borderColor:C.border }}>
              <div style={{ fontFamily:"'Newsreader', Georgia, serif", fontSize:'2.2rem', fontWeight:700, color:s.color, lineHeight:1, marginBottom:'0.5rem' }}>
                {s.num}
              </div>
              <h3 style={{ fontSize:'0.92rem', fontWeight:700, color:C.textMain, marginBottom:'0.5rem' }}>{s.label}</h3>
              <p style={{ fontSize:'0.8rem', color:C.textMuted, lineHeight:1.6, margin:0 }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══ D) Subjects ═══════════════════════════════════════════════ */
const SUBJECTS = [
  { id:'maths3',         tag:'Mathematics', name:'Maths 3',         desc:'Complex analysis, vector calculus, Fourier & Laplace transforms, and numerical methods.',  color:C.accent  },
  { id:'automata',       tag:'Theory',      name:'Automata Theory', desc:'Finite automata through Turing machines, built as one unbroken prerequisite chain.',        color:C.danger  },
  { id:'adsa',           tag:'Core CS',     name:'ADSA',            desc:'Arrays and recursion up through graphs, dynamic programming, and NP-completeness.',          color:C.success },
  { id:'java',           tag:'Language',    name:'Java',            desc:'OOP fundamentals through collections, generics, and concurrent programming.',                 color:C.warning },
  { id:'c_programming',  tag:'Language',    name:'C',               desc:'Syntax and control flow to pointers, memory management, and data structures.',               color:C.accent  },
  { id:'python',         tag:'Language',    name:'Python',          desc:'Core syntax through OOP, file handling, and data-analysis libraries.',                       color:C.success },
];

function Subjects() {
  return (
    <section id="subjects" style={{ padding:'7rem 1.5rem', background:C.bgBase }}>
      <div style={{ maxWidth:1160, margin:'0 auto' }}>
        <div className="lp-reveal" style={{ marginBottom:'3rem' }}>
          <Kicker color={C.success}>Subjects</Kicker>
          <SectionTitle>Six subjects. Independent mastery tracking.</SectionTitle>
          <p style={{ color:C.textMuted, fontSize:'0.96rem', lineHeight:1.7, maxWidth:520 }}>
            Every subject runs its own prerequisite concept graph. Mastery scores, quiz history, and gap records never overlap.
          </p>
        </div>

        <div className="lp-subjects-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem' }}>
          {SUBJECTS.map((s, i) => (
            <Card key={s.id} className={`lp-subject-card lp-reveal lp-reveal-delay-${(i % 3) + 1}`}
              style={{ borderLeft:`3px solid ${s.color}` }}>
              <span style={{
                display:'inline-block', fontSize:'0.7rem', fontWeight:700,
                letterSpacing:'0.06em', textTransform:'uppercase',
                color:s.color, background:`${s.color}14`,
                padding:'0.2rem 0.6rem', borderRadius:9999, marginBottom:'0.65rem',
              }}>
                {s.tag}
              </span>
              <h3 style={{ fontSize:'1.05rem', fontWeight:700, color:C.textMain, marginBottom:'0.4rem' }}>{s.name}</h3>
              <p style={{ fontSize:'0.82rem', color:C.textMuted, lineHeight:1.6, margin:0 }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══ E) About ══════════════════════════════════════════════════ */
function About() {
  const stats = [
    { val:6,   suf:'',       label:'subjects tracked this semester' },
    { val:1,   suf:'',       label:'diagnostic to start each subject' },
    { val:2,   suf:' views', label:'student progress + teacher analytics' },
  ];
  return (
    <section id="about" style={{ padding:'7rem 1.5rem', background:C.bgSubtle, borderTop:`1px solid ${C.border}` }}>
      <div style={{ maxWidth:1160, margin:'0 auto' }}>
        <div className="lp-about-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4rem', alignItems:'center' }}>
          {/* Left */}
          <div className="lp-reveal">
            <Kicker color={C.textMuted}>Why this is different</Kicker>
            <SectionTitle>Nobody traced it that far. We do.</SectionTitle>
            <p style={{ color:C.textMuted, fontSize:'0.96rem', lineHeight:1.75, marginBottom:'1.25rem' }}>
              A student who fails a question on binary trees usually isn't weak in trees. They're weak in
              recursion — a concept from three weeks ago that was never flagged, because every quiz since
              then tested something further down the chain.
            </p>
            <p style={{ color:C.textMuted, fontSize:'0.96rem', lineHeight:1.75, marginBottom:'2rem' }}>
              Teachers get the same insight at class scale: a heatmap showing exactly which prerequisite
              concept is blocking the most students, ranked by cohort weakness percentage.
            </p>
            <button className="lp-cta-primary" style={{ fontSize:'0.88rem', padding:'0.65rem 1.5rem' }}>
              Explore the platform →
            </button>
          </div>

          {/* Right — stat cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {stats.map((s,i) => (
              <div key={s.label} className={`lp-stat lp-reveal lp-reveal-delay-${i+1}`}
                style={{
                  display:'flex', alignItems:'center', gap:'1.25rem',
                  padding:'1.15rem 1.35rem',
                  background:C.bgCard,
                  border:`1px solid ${C.border}`,
                  borderLeft:`4px solid ${C.accent}`,
                  borderRadius:16,
                  boxShadow:C.shadowMd,
                  transition:'box-shadow 0.3s ease',
                }}>
                <div style={{ fontFamily:"'Newsreader', Georgia, serif", fontSize:'2.6rem', fontWeight:700, color:C.accent, lineHeight:1, minWidth:56 }}>
                  <Counter target={s.val} suffix={s.suf} />
                </div>
                <div style={{ color:C.textMuted, fontSize:'0.88rem', lineHeight:1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══ F) Footer ═════════════════════════════════════════════════ */
function Footer({ onEnterApp }) {
  return (
    <footer style={{ background:C.bgDark, borderTop:`1px solid rgba(255,255,255,0.07)`, padding:'2.5rem 1.5rem' }}>
      <div style={{ maxWidth:1160, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.55rem' }}>
          <BrandMark size={18} />
          <span style={{ fontWeight:700, fontSize:'0.95rem', color:'#eef0fa' }}>EduAdapt AI</span>
          <span style={{ color:'rgba(238,240,250,0.45)', fontSize:'0.8rem' }}>— Close the gap. Every concept, every student.</span>
        </div>
        <button onClick={onEnterApp} className="lp-cta-outline"
          style={{ color:'#eef0fa', borderColor:'rgba(238,240,250,0.2)', fontSize:'0.82rem', padding:'0.38rem 1rem' }}>
          Open App →
        </button>
      </div>
    </footer>
  );
}

/* ══ Main export ═══════════════════════════════════════════════ */
export default function LandingPage({ onEnterApp }) {
  useReveal();

  useEffect(() => {
    /* Inject styles */
    const tag = document.createElement('style');
    tag.id = 'lp-styles';
    tag.textContent = CSS;
    if (!document.getElementById('lp-styles')) document.head.appendChild(tag);

    /* Smooth scroll */
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';

    /* Landing page needs scrollable body */
    const prevOF = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';

    return () => {
      document.documentElement.style.scrollBehavior = prev;
      document.body.style.overflow = prevOF;
      document.body.style.height = '';
    };
  }, []);

  return (
    <div style={{ fontFamily:"'Inter', system-ui, sans-serif", background:C.bgBase, color:C.textMain, overflowX:'hidden' }}>
      <Nav onEnterApp={onEnterApp} />
      <Hero onEnterApp={onEnterApp} />
      <TickerStrip />
      <HowItWorks />
      <Subjects />
      <About />
      <Footer onEnterApp={onEnterApp} />
    </div>
  );
}
