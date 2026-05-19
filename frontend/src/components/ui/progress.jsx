export function Progress({ value = 0 }) {
  return (
    <div className="h-2 w-full rounded bg-white/10">
      <div className="h-2 rounded bg-white" style={{ width: `${value}%` }} />
    </div>
  );
}