function formatDuration(ms) {
    if (!ms || isNaN(ms)) return "Unknown";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const s = seconds % 60;
  const m = minutes % 60;
  const h = hours % 24;

  if (days > 0) return `${days}d ${h}h ${m}m ${s}s`;
  if (hours > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

module.exports = { formatDuration };
      
