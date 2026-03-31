type SummaryCardProps = {
  label: string;
  value: string;
};

export function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

