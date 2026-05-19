export function Badge({ className = "", children }) {
  return <span className={`inline-flex items-center ${className}`}>{children}</span>;
}