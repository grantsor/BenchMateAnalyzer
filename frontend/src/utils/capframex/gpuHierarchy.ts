// GPU Model Tier Ranking & Matching Utility for CapFrameX Analyzer

export const DEFAULT_GPU_HIERARCHY: string[] = [
  "RTX 5090",
  "RTX 5080",
  "RTX 5070 Ti",
  "RTX 5070",
  "RTX 5060 Ti 16GB",
  "RTX 5060 Ti 8GB",
  "RTX 5060",
  "RX 9070 XT",
  "RX 9070",
  "RX 9070 GRE",
  "RX 9060 XT 16GB",
  "RX 9060 XT 8GB",
  "RTX 4090",
  "RTX 4080 Super",
  "RTX 4080",
  "RTX 4070 Ti Super",
  "RTX 4070 Ti",
  "RTX 4070 Super",
  "RTX 4070",
  "RTX 4060 Ti",
  "RTX 4060",
  "RTX 3090",
  "RTX 3080 Ti",
  "RTX 3080",
  "RTX 3070 Ti",
  "RTX 3070",
  "RTX 3060",
  "RTX 3050"
];

interface CompiledMatcher {
  tokenCount: number;
  length: number;
  originalRank: number;
  model: string;
  regex: RegExp;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileHierarchyMatchers(hierarchy: string[]): CompiledMatcher[] {
  const matchers: CompiledMatcher[] = [];

  hierarchy.forEach((model, idx) => {
    const parts = model.trim().split(/\s+/);
    const regexParts = parts.map((p) => {
      const pLower = p.toLowerCase();
      const mGb = pLower.match(/^(\d+)(?:gb|g)$/);
      if (mGb) {
        const num = mGb[1];
        return `(?:${num}\\s*(?:gb|g\\b)|\\b${num}gb\\b)`;
      }
      return `\\b${escapeRegex(pLower)}\\b`;
    });

    const pattern = regexParts.join(".*");
    const regex = new RegExp(pattern, "i");

    matchers.push({
      tokenCount: parts.length,
      length: model.length,
      originalRank: idx,
      model,
      regex
    });
  });

  // Sort by token count descending, then string length descending (most specific first)
  matchers.sort((a, b) => {
    if (b.tokenCount !== a.tokenCount) return b.tokenCount - a.tokenCount;
    return b.length - a.length;
  });

  return matchers;
}

// Cache compiled matchers for current hierarchy
let cachedHierarchy: string[] | null = null;
let cachedMatchers: CompiledMatcher[] = [];

export function getHierarchyMatchers(hierarchy: string[] = DEFAULT_GPU_HIERARCHY): CompiledMatcher[] {
  if (
    cachedHierarchy &&
    cachedHierarchy.length === hierarchy.length &&
    cachedHierarchy.every((val, idx) => val === hierarchy[idx])
  ) {
    return cachedMatchers;
  }

  cachedHierarchy = [...hierarchy];
  cachedMatchers = compileHierarchyMatchers(hierarchy);
  return cachedMatchers;
}

export function findGpuTier(
  gpuName: string,
  hierarchy: string[] = DEFAULT_GPU_HIERARCHY
): { rank: number; model: string | null } {
  if (!gpuName) return { rank: 999999, model: null };

  const matchers = getHierarchyMatchers(hierarchy);
  const target = gpuName.trim();

  for (const m of matchers) {
    if (m.regex.test(target)) {
      return { rank: m.originalRank, model: m.model };
    }
  }

  return { rank: 999999, model: null };
}
