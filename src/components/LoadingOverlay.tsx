export function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <div className="loading-text">{label}</div>
    </div>
  );
}
