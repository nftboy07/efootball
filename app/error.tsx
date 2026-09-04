'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

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
        <span style={{ fontSize: '52px' }} aria-hidden="true">
          ⚽
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            margin: '14px 0 10px',
          }}
        >
          Match interrupted.
        </h1>
        <p style={{ color: '#88a0ff', fontSize: '15px', lineHeight: 1.6, margin: '0 0 26px' }}>
          Something went wrong loading this page. The tournament data is safe — this is a display error.
        </p>
        {error?.digest && (
          <p style={{ color: '#5f74b8', fontSize: '12px', fontFamily: 'var(--font-mono)', margin: '0 0 22px' }}>
            Reference: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              background: 'var(--konami-yellow)',
              color: '#000',
              border: 'none',
              padding: '13px 26px',
              borderRadius: '7px',
              fontWeight: 900,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try again ↻
          </button>
          <a
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
          </a>
        </div>
      </div>
    </div>
  );
}
