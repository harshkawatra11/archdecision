export const GITHUB_REPO_URL = 'https://github.com/harshkawatra11/archdecision';

// Curated, recognizable repos that analyze quickly and demo well.
export const EXAMPLE_REPOS: { label: string; url: string; note: string }[] = [
  { label: 'expressjs/express', url: 'https://github.com/expressjs/express', note: 'Classic Node.js framework' },
  { label: 'pallets/flask', url: 'https://github.com/pallets/flask', note: 'Python microframework' },
  { label: 'gin-gonic/gin', url: 'https://github.com/gin-gonic/gin', note: 'Go HTTP framework' },
  { label: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi', note: 'Modern Python API framework' },
];

export const CONFIDENCE_STYLES: Record<string, { dot: string; text: string; ring: string; label: string }> = {
  high: { dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30', label: 'High confidence' },
  medium: { dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30', label: 'Medium confidence' },
  low: { dot: 'bg-slate-400', text: 'text-slate-300', ring: 'ring-slate-400/30', label: 'Low confidence' },
};
