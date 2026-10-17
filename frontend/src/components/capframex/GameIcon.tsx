import React, { useState } from "react";

export interface GameIconProps {
  gameName: string;
  customIconUrl?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

// Deterministic color palette for procedural gaming monogram badges
const MONOGRAM_PALETTES = [
  { bg: "from-blue-600 to-indigo-900", border: "border-blue-400/30", text: "text-blue-100" },
  { bg: "from-emerald-600 to-teal-950", border: "border-emerald-400/30", text: "text-emerald-100" },
  { bg: "from-purple-600 to-violet-950", border: "border-purple-400/30", text: "text-purple-100" },
  { bg: "from-rose-600 to-pink-950", border: "border-rose-400/30", text: "text-rose-100" },
  { bg: "from-amber-600 to-orange-950", border: "border-amber-400/30", text: "text-amber-100" },
  { bg: "from-cyan-600 to-sky-950", border: "border-cyan-400/30", text: "text-cyan-100" },
  { bg: "from-red-600 to-rose-950", border: "border-red-400/30", text: "text-red-100" },
  { bg: "from-fuchsia-600 to-purple-950", border: "border-fuchsia-400/30", text: "text-fuchsia-100" },
  { bg: "from-teal-600 to-emerald-950", border: "border-teal-400/30", text: "text-teal-100" },
  { bg: "from-indigo-600 to-slate-900", border: "border-indigo-400/30", text: "text-indigo-100" }
];

function getMonogram(name: string): string {
  if (!name) return "GM";
  const clean = name.replace(/[^\w\s]/gi, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    // Single word: use first 2 letters or letter + number (e.g. "Crysis" -> "CR", "F1" -> "F1")
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // 3 or more: take first letters of first 2 words + last word or number (e.g. "Black Myth Wukong" -> "BMW")
  return (parts[0][0] + parts[1][0] + (parts[2] ? parts[2][0] : "")).slice(0, 3).toUpperCase();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const GameIcon: React.FC<GameIconProps> = ({
  gameName,
  customIconUrl,
  className = "w-7 h-7",
  size = "md"
}) => {
  const [imgError, setImgError] = useState(false);

  // If a valid custom image URL is provided and has not failed, render it
  if (customIconUrl && !imgError) {
    return (
      <img
        src={customIconUrl}
        alt={gameName}
        onError={() => setImgError(true)}
        className={`${className} object-cover rounded-lg shadow-sm border border-white/10 shrink-0`}
      />
    );
  }

  const norm = (gameName || "").toLowerCase().trim();

  // 1. Counter-Strike 2 / CS2 / CS:GO
  if (norm.includes("counter-strike") || norm.includes("counter strike") || norm.includes("cs2") || norm.includes("csgo") || norm === "cs") {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#7c2d12] border border-[#fb923c]/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M12 4v4m0 8v4M4 12h4m8 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // 2. Cyberpunk 2077
  if (norm.includes("cyberpunk") || norm.includes("2077")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#fcee0a] to-[#eab308] border border-[#fef08a] flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-black text-[10px] tracking-tighter text-[#0f172a] font-mono leading-none">
          CP77
        </span>
      </div>
    );
  }

  // 3. Black Myth: Wukong
  if (norm.includes("wukong") || norm.includes("black myth")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#451a03] border border-[#eab308]/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#eab308]">
          <path
            d="M4 12c0-4.418 3.582-8 8-8s8 3.582 8 8c0 3-1.5 5.5-3.5 6.8M8 12h8m-4-6v12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="5" r="1.5" fill="#facc15" />
        </svg>
      </div>
    );
  }

  // 4. DOTA 2
  if (norm.includes("dota")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#b91c1c] via-[#991b1b] to-[#450a0a] border border-[#f87171]/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-[#fee2e2]">
          <path d="M3 5v14l6-3V8L3 5zm18 0l-6 3v8l6 3V5zM9 16l6-8H9v8z" />
        </svg>
      </div>
    );
  }

  // 5. Assassin's Creed (Mirage / Valhalla / Odyssey / etc.)
  if (norm.includes("assassin") || norm.includes("creed") || norm.includes("ac mirage") || norm.includes("valhalla")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#090d16] border border-slate-500/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full text-rose-400">
          <path
            d="M12 3L4 18h4l4-8 4 8h4L12 3z"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path d="M12 10v9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 6. Horizon (Forbidden West / Zero Dawn)
  if (norm.includes("horizon") || norm.includes("forbidden west") || norm.includes("zero dawn")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#06b6d4] to-[#0891b2] border border-[#67e8f9]/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full text-white">
          <polygon points="12 4 4 19 20 19" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="12" cy="14" r="2.5" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // 7. Shadow of the Tomb Raider / Tomb Raider
  if (norm.includes("tomb raider") || norm.includes("shadow of the")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#d97706] to-[#78350f] border border-[#f59e0b]/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full text-amber-100">
          <circle cx="12" cy="12" r="7" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 8. Red Dead Redemption 2 / RDR2
  if (norm.includes("red dead") || norm.includes("rdr2") || norm.includes("redemption")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#dc2626] to-[#7f1d1d] border border-red-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-serif font-black text-[10.5px] tracking-tight text-white leading-none">
          RDR2
        </span>
      </div>
    );
  }

  // 9. Forza Horizon / Motorsport
  if (norm.includes("forza")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#ec4899] via-[#f43f5e] to-[#fb923c] border border-pink-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-black italic text-[11px] tracking-tighter text-white leading-none">
          FH5
        </span>
      </div>
    );
  }

  // 10. Call of Duty / Warzone / MW3 / BO6
  if (norm.includes("call of duty") || norm.includes("warzone") || norm.includes("modern warfare") || norm.includes("cod")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#15803d] to-[#052e16] border border-emerald-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-mono font-black text-[11px] tracking-tight text-emerald-100 leading-none">
          COD
        </span>
      </div>
    );
  }

  // 11. Apex Legends
  if (norm.includes("apex")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#e11d48] to-[#881337] border border-rose-400/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
          <path d="M12 3L2 21h5l5-9 5 9h5L12 3zm0 9l-2.5 4.5h5L12 12z" />
        </svg>
      </div>
    );
  }

  // 12. Valorant
  if (norm.includes("valorant")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#ff4655] to-[#b91c1c] border border-rose-300/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
          <path d="M4 6h8l8 12h-8L4 6z" />
        </svg>
      </div>
    );
  }

  // 13. Fortnite
  if (norm.includes("fortnite")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] border border-purple-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-black italic text-[12px] text-white leading-none">F</span>
      </div>
    );
  }

  // 14. Elden Ring
  if (norm.includes("elden ring") || norm.includes("elden")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#18181b] via-[#27272a] to-[#09090b] border border-[#eab308]/50 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#eab308" className="w-full h-full">
          <circle cx="12" cy="10" r="5" strokeWidth="2" />
          <circle cx="8" cy="15" r="4.5" strokeWidth="1.8" />
          <circle cx="16" cy="15" r="4.5" strokeWidth="1.8" />
          <path d="M12 5v14" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 15. God of War
  if (norm.includes("god of war") || norm.includes("ragnarok")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#991b1b] to-[#450a0a] border border-red-500/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#fee2e2" className="w-full h-full">
          <path
            d="M6 19c0-5 3-9 6-9s6 4 6 9M4 19h16"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="7" r="2.5" fill="#f87171" />
        </svg>
      </div>
    );
  }

  // 16. The Witcher 3
  if (norm.includes("witcher")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#3f3f46] to-[#09090b] border border-red-500/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-serif font-black text-[12px] text-red-500 leading-none">W3</span>
      </div>
    );
  }

  // 17. Starfield
  if (norm.includes("starfield")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] border border-sky-400/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <circle cx="12" cy="12" r="8" stroke="#38bdf8" strokeWidth="1.8" />
          <path d="M12 4l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z" fill="#facc15" />
        </svg>
      </div>
    );
  }

  // 18. Baldur's Gate 3
  if (norm.includes("baldur") || norm.includes("bg3")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#581c87] to-[#1e1b4b] border border-purple-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-serif font-black text-[11px] text-amber-300 leading-none">BG3</span>
      </div>
    );
  }

  // 19. Formula 1 (F1 23 / 24 / 25)
  if (norm.includes("f1") || norm.includes("formula 1")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#e10600] to-[#991b1b] border border-red-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-black italic text-[11.5px] tracking-tighter text-white leading-none">
          F1
        </span>
      </div>
    );
  }

  // 20. Far Cry 6
  if (norm.includes("far cry")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#ca8a04] to-[#854d0e] border border-yellow-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-black text-[11px] tracking-tight text-white leading-none">FC6</span>
      </div>
    );
  }

  // 21. Ghost of Tsushima
  if (norm.includes("tsushima") || norm.includes("ghost of")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#b91c1c] to-[#450a0a] border border-rose-400/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
          <circle cx="12" cy="12" r="8" fillOpacity="0.2" />
          <path d="M12 4v16m-6-8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 22. Marvel's Spider-Man / Miles Morales
  if (norm.includes("spider-man") || norm.includes("spiderman") || norm.includes("miles morales")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#e11d48] to-[#9f1239] border border-rose-400/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
          <ellipse cx="12" cy="12" rx="4" ry="6" />
          <path d="M8 8L3 4m5 8L2 12m6 4l-5 4m13-16l5-4m-5 8l6 0m-6 4l5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 23. Helldivers 2
  if (norm.includes("helldivers")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#eab308] to-[#854d0e] border border-yellow-300/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-mono font-black text-[11px] text-[#090d16] leading-none">HD2</span>
      </div>
    );
  }

  // 24. Resident Evil (RE4, Village)
  if (norm.includes("resident evil") || norm.includes("re4") || norm.includes("village")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#18181b] to-[#09090b] border border-red-500/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <circle cx="12" cy="12" r="8" stroke="#ef4444" strokeWidth="2" />
          <path d="M12 4v16M4 12h16" stroke="#ef4444" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // 25. Hogwarts Legacy
  if (norm.includes("hogwarts") || norm.includes("harry potter")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] border border-amber-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-serif font-black text-[12px] text-amber-300 leading-none">HL</span>
      </div>
    );
  }

  // 26. Grand Theft Auto (GTA V)
  if (norm.includes("grand theft auto") || norm.includes("gta")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#15803d] to-[#14532d] border border-emerald-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-serif font-black italic text-[12px] text-emerald-200 leading-none">V</span>
      </div>
    );
  }

  // 27. Rainbow Six Siege
  if (norm.includes("rainbow six") || norm.includes("siege") || norm.includes("r6")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#f97316] to-[#c2410c] border border-orange-400/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-mono font-black text-[12px] text-white leading-none">6</span>
      </div>
    );
  }

  // 28. Returnal
  if (norm.includes("returnal")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#0d9488] to-[#115e59] border border-teal-300/40 flex items-center justify-center p-1 shadow-sm shrink-0`}
        title={gameName}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" className="w-full h-full">
          <circle cx="12" cy="12" r="7" strokeWidth="2" strokeDasharray="6 3" />
          <circle cx="12" cy="12" r="3" fill="#2dd4bf" />
        </svg>
      </div>
    );
  }

  // 29. Diablo IV
  if (norm.includes("diablo")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#7f1d1d] to-[#450a0a] border border-red-500/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-serif font-black text-[12px] text-red-400 leading-none">D4</span>
      </div>
    );
  }

  // 30. Alan Wake 2
  if (norm.includes("alan wake")) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-[#1c1917] to-[#0c0a09] border border-amber-500/40 flex items-center justify-center p-0.5 shadow-sm shrink-0`}
        title={gameName}
      >
        <span className="font-mono font-black text-[11px] text-amber-400 leading-none">AW2</span>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Universal Fallback: Smart Procedural Monogram Gaming Badge
  // --------------------------------------------------------------------------
  const monogram = getMonogram(gameName);
  const palette = MONOGRAM_PALETTES[hashString(gameName || "default") % MONOGRAM_PALETTES.length];

  return (
    <div
      className={`${className} rounded-lg bg-gradient-to-br ${palette.bg} border ${palette.border} flex items-center justify-center shadow-sm shrink-0 select-none`}
      title={gameName}
    >
      <span className={`font-mono font-black tracking-tight ${palette.text} ${
        monogram.length >= 3 ? "text-[9px]" : "text-[10.5px]"
      } leading-none`}>
        {monogram}
      </span>
    </div>
  );
};
