import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#020626',
        color: '#fff',
        padding: '30px',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ maxWidth: '520px', textAlign: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '86px',
            fontWeight: 900,
            color: 'var(--konami-yellow)',
            lineHeight: 1,
            display: 'block',
          }}
        >
          404
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 4vw, 34px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            margin: '12px 0 10px',
          }}
        >
          Off the pitch.
        </h1>
        <p style={{ color: '#88a0ff', fontSize: '15px', lineHeight: 1.6, margin: '0 0 26px' }}>
          This page doesn&apos;t exist. The cup may have concluded, or the link may be mistyped.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/#tournaments"
            style={{
              background: 'var(--konami-yellow)',
              color: '#000',
              padding: '13px 26px',
              borderRadius: '7px',
              fontWeight: 900,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            View live cups ↗
          </Link>
          <Link
            href="/"
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #88a0ff',
              padding: '13px 26px',
              borderRadius: '7px',
              fontWeight: 800,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
