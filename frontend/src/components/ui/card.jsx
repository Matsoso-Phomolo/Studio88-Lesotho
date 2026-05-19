export function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

export function CardHeader({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

export function CardTitle({ className = "", children }) {
  return <h2 className={className}>{children}</h2>;
}

export function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}