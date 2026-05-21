export default function LegacyGamePage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-2"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
        This link has been moved.
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Ask your captain for an updated link.
      </p>
    </main>
  );
}
