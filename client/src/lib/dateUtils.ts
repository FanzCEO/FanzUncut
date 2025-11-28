export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMs = now.getTime() - targetDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return targetDate.toLocaleDateString();
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'Unknown';
  
  const targetDate = new Date(date);
  return targetDate.toLocaleDateString();
}