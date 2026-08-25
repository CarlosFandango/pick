import { space, webTextStyle } from '@picksel/tokens';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
      }}
    >
      <h1 style={{ ...webTextStyle('title'), color: 'var(--colour-text)' }}>PICKsel</h1>
      <p style={{ ...webTextStyle('body'), color: 'var(--colour-text-muted)' }}>
        Scaffold. No features yet.
      </p>
    </main>
  );
}
