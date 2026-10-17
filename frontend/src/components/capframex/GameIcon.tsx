import React, { useState } from "react";
import { Gamepad2 } from "lucide-react";

export interface GameIconProps {
  gameName: string;
  customIconUrl?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

// Deterministic color palette for fallback monogram badges
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
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
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

/**
 * Resolves the bundled real official game icon asset URL.
 */
export function getGameIconUrl(gameName: string): string | null {
  if (!gameName) return null;
  const clean = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (clean.includes("cs2") || clean.includes("counterstrike")) return "/game-icons/counter-strike-2.png";
  if (clean.includes("cyberpunk")) return "/game-icons/cyberpunk-2077.png";
  if (clean.includes("wukong") || clean.includes("blackmyth")) return "/game-icons/black-myth-wukong.png";
  if (clean.includes("dota")) return "/game-icons/dota-2.png";
  if (clean.includes("mirage") || (clean.includes("assassin") && clean.includes("creed"))) return "/game-icons/assassins-creed-mirage.png";
  if (clean.includes("farcry")) return "/game-icons/far-cry-6.png";
  if (clean.includes("ghost") || clean.includes("tsushima")) return "/game-icons/ghost-of-tsushima.png";
  if (clean.includes("hogwart")) return "/game-icons/hogwarts-legacy.png";
  if (clean.includes("forbiddenwest")) return "/game-icons/horizon-forbidden-west.png";
  if (clean.includes("zerodawn")) return "/game-icons/horizon-zero-dawn.png";
  if (clean.includes("horizon")) return "/game-icons/horizon-forbidden-west.png";
  if (clean.includes("spider") || clean.includes("milesmorales")) return "/game-icons/marvels-spider-man-miles-morales.png";
  if (clean.includes("returnal")) return "/game-icons/returnal.png";
  if (clean.includes("f125")) return "/game-icons/f1-25.png";
  if (clean.includes("f123")) return "/game-icons/f1-23.png";
  if (clean.includes("f124")) return "/game-icons/f1-24.png";
  if (clean.includes("f1")) return "/game-icons/f1-25.png";
  if (clean.includes("eldenring")) return "/game-icons/elden-ring.png";
  if (clean.includes("godofwar")) return "/game-icons/god-of-war.png";
  if (clean.includes("baldur")) return "/game-icons/baldurs-gate-3.png";
  if (clean.includes("reddead") || clean.includes("rdr2")) return "/game-icons/red-dead-redemption-2.png";
  if (clean.includes("forza")) return "/game-icons/forza-horizon-5.png";
  if (clean.includes("apex")) return "/game-icons/apex-legends.png";
  if (clean.includes("valorant")) return "/game-icons/valorant.png";
  if (clean.includes("pubg")) return "/game-icons/pubg.png";
  if (clean.includes("gta") || clean.includes("grandtheftauto")) return "/game-icons/grand-theft-auto-v.png";
  if (clean.includes("marvelrivals")) return "/game-icons/marvel-rivals.png";
  if (clean.includes("monsterhunter") || clean.includes("wilds")) return "/game-icons/monster-hunter-wilds.png";
  if (clean.includes("residentevil") || clean.includes("biohazard")) return "/game-icons/resident-evil-requiem.png";
  if (clean.includes("mafia") || clean.includes("oldcountry")) return "/game-icons/mafia-the-old-country.png";
  if (clean.includes("onimusha")) return "/game-icons/onimusha.png";
  if (clean.includes("deadlock")) return "/game-icons/deadlock.png";
  if (clean.includes("outlaws")) return "/game-icons/star-wars-outlaws.png";
  if (clean.includes("borderland")) return "/game-icons/borderlands.png";
  if (clean.includes("farlight")) return "/game-icons/farlight-84.png";
  if (clean.includes("command") && clean.includes("conquer")) return "/game-icons/command-and-conquer-generals-zero-hour.png";
  if (clean.includes("arcraider")) return "/game-icons/arc-raiders.png";
  if (clean.includes("witcher")) return "/game-icons/the-witcher-3.png";

  return null;
}

export const GameIcon: React.FC<GameIconProps> = ({
  gameName,
  customIconUrl,
  className = "w-7 h-7"
}) => {
  const [imgError, setImgError] = useState(false);

  // 1. Highest priority: User custom icon URL
  const primaryUrl = (!imgError && customIconUrl) ? customIconUrl : null;

  // 2. Secondary priority: Official bundled game icon
  const officialUrl = (!imgError && !primaryUrl) ? getGameIconUrl(gameName) : null;

  const activeSrc = primaryUrl || officialUrl;

  if (activeSrc) {
    return (
      <img
        src={activeSrc}
        alt={gameName}
        className={`${className} object-contain rounded select-none pointer-events-none drop-shadow-sm transition-transform duration-150`}
        onError={() => setImgError(true)}
      />
    );
  }

  // 3. Graceful fallback: Clean gaming monogram badge
  const palette = MONOGRAM_PALETTES[hashString(gameName || "Game") % MONOGRAM_PALETTES.length];
  const monogram = getMonogram(gameName);

  return (
    <div
      className={`${className} flex items-center justify-center rounded bg-gradient-to-br ${palette.bg} border ${palette.border} shadow-sm select-none`}
      title={gameName}
    >
      {monogram.length > 0 ? (
        <span className={`text-[10px] font-black tracking-wider leading-none ${palette.text}`}>
          {monogram}
        </span>
      ) : (
        <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
      )}
    </div>
  );
};

export default GameIcon;
