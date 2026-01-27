'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#e2e8f0' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            문제가 발생했습니다
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '400px' }}>
            일시적인 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#1e293b',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#f87171',
              maxWidth: '600px',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {error.message}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
