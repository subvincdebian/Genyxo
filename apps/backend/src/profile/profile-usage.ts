export function summarizeUsage(
  rows: { day: string; credits: string | number; requests: string | number }[],
  start: Date,
  count: number,
) {
  const byDate = new Map(rows.map((row) => [row.day, row]));
  const days = Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const row = byDate.get(date);
    return {
      date,
      credits: Number(row?.credits || 0),
      requests: Number(row?.requests || 0),
    };
  });
  return {
    days,
    totalCredits: days.reduce((sum, day) => sum + day.credits, 0),
    requests: days.reduce((sum, day) => sum + day.requests, 0),
  };
}
