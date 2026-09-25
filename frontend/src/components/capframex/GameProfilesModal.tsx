import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Search,
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  FileText,
  Info
} from "lucide-react";
import { GameProfile, GameProfilesMap } from "../../types/capframex";
import { api } from "../../api/capframexClient";

interface GameProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedGames: string[];
  selectedGame: string;
  onApplyProfileToActiveChart?: (title: string, subHeader: string) => void;
  onProfilesUpdated?: (profiles: GameProfilesMap) => void;
}

export const GameProfilesModal: React.FC<GameProfilesModalProps> = ({
  isOpen,
  onClose,
  scannedGames,
  selectedGame,
  onApplyProfileToActiveChart,
  onProfilesUpdated
}) => {
  const [profiles, setProfiles] = useState<GameProfilesMap>({});
  const [configFile, setConfigFile] = useState<string>("");
  const [activeGameKey, setActiveGameKey] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [newGameInput, setNewGameInput] = useState("");

  // Current active game form fields
  const [titleInput, setTitleInput] = useState("");
  const [subHeaderInput, setSubHeaderInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load profiles on open
  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      const res = await api.getGameProfiles();
      if (res.status === "success") {
        setProfiles(res.profiles || {});
        if (res.config_file) setConfigFile(res.config_file);
        // Default active game: current selectedGame if available, or first available game
        const initialGame = selectedGame || scannedGames[0] || Object.keys(res.profiles || {})[0] || "";
        selectGame(initialGame, res.profiles || {});
      }
    } catch (e: any) {
      console.error("Failed to load game profiles:", e);
      setStatusMessage({ type: "error", text: "Failed to load game_profiles.json: " + e.message });
    }
  };

  // Select game in list and populate form fields
  const selectGame = (gameKey: string, currentProfiles: GameProfilesMap = profiles) => {
    setActiveGameKey(gameKey);
    setStatusMessage(null);

    // Find profile (case-insensitive lookup)
    let foundProfile: GameProfile | null = null;
    if (currentProfiles[gameKey]) {
      foundProfile = currentProfiles[gameKey];
    } else {
      const norm = gameKey.trim().toLowerCase();
      for (const [k, v] of Object.entries(currentProfiles)) {
        if (k.trim().toLowerCase() === norm) {
          foundProfile = v;
          break;
        }
      }
    }

    if (foundProfile) {
      setTitleInput(foundProfile.title || gameKey.toUpperCase());
      setSubHeaderInput(foundProfile.sub_header || "");
      setNotesInput(foundProfile.notes || "");
    } else {
      // Default to uppercase game name and empty preset
      setTitleInput(gameKey ? gameKey.toUpperCase() : "");
      setSubHeaderInput("");
      setNotesInput("");
    }
  };

  // Combine scanned games + games saved in profiles
  const allGameKeys = useMemo(() => {
    const set = new Set<string>();
    scannedGames.forEach((g) => {
      if (g && g.trim()) set.add(g.trim());
    });
    Object.keys(profiles).forEach((g) => {
      if (g && g.trim()) set.add(g.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scannedGames, profiles]);

  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return allGameKeys;
    const q = searchQuery.toLowerCase();
    return allGameKeys.filter((g) => g.toLowerCase().includes(q));
  }, [allGameKeys, searchQuery]);

  const handleSaveCurrentProfile = async () => {
    if (!activeGameKey) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await api.saveGameProfile({
        game_name: activeGameKey,
        title: titleInput,
        sub_header: subHeaderInput,
        notes: notesInput
      });

      if (res.status === "success") {
        setProfiles(res.profiles);
        if (onProfilesUpdated) onProfilesUpdated(res.profiles);
        setStatusMessage({
          type: "success",
          text: `Profile for "${activeGameKey}" saved to game_profiles.json`
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (e: any) {
      console.error("Save profile error:", e);
      setStatusMessage({ type: "error", text: "Failed to save: " + e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyToActive = () => {
    if (onApplyProfileToActiveChart) {
      onApplyProfileToActiveChart(titleInput, subHeaderInput);
      setStatusMessage({
        type: "success",
        text: `Applied "${titleInput}" and preset to active chart view!`
      });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeGameKey) return;
    if (!confirm(`Are you sure you want to remove the saved profile for "${activeGameKey}" from game_profiles.json?`)) return;

    try {
      const res = await api.deleteGameProfile(activeGameKey);
      setProfiles(res.profiles);
      if (onProfilesUpdated) onProfilesUpdated(res.profiles);
      selectGame(activeGameKey, res.profiles);
      setStatusMessage({
        type: "success",
        text: `Removed configuration for "${activeGameKey}". Defaults restored.`
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      console.error("Delete profile error:", e);
      setStatusMessage({ type: "error", text: "Failed to delete: " + e.message });
    }
  };

  const handleAddNewGame = async () => {
    const trimmed = newGameInput.trim();
    if (!trimmed) return;

    // Check if already in saved profiles (case-insensitive)
    const existingKey = Object.keys(profiles).find(
      (k) => k.toLowerCase() === trimmed.toLowerCase()
    );

    if (existingKey) {
      selectGame(existingKey);
      setStatusMessage({
        type: "success",
        text: `Selected existing profile for "${existingKey}"`
      });
      setTimeout(() => setStatusMessage(null), 3000);
      setNewGameInput("");
      setIsAddingGame(false);
      return;
    }

    // New game not on the existing list -> automatically save as a new profile in game_profiles.json
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const newTitle = trimmed.toUpperCase();
      const res = await api.saveGameProfile({
        game_name: trimmed,
        title: newTitle,
        sub_header: "",
        notes: ""
      });

      if (res.status === "success") {
        setProfiles(res.profiles);
        if (onProfilesUpdated) {
          onProfilesUpdated(res.profiles);
        }
        selectGame(trimmed, res.profiles);
        setStatusMessage({
          type: "success",
          text: `Added and saved new profile for "${trimmed}" to game_profiles.json`
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (e: any) {
      console.error("Failed to auto-save new game profile:", e);
      selectGame(trimmed);
      setTitleInput(trimmed.toUpperCase());
      setStatusMessage({ type: "error", text: "Failed to save new profile: " + e.message });
    } finally {
      setIsSaving(false);
      setNewGameInput("");
      setIsAddingGame(false);
    }
  };

  if (!isOpen) return null;

  const activeHasSavedProfile = !!profiles[activeGameKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121215] border border-[#23232a] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23232a] bg-[#18181b]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Game Profiles &amp; Configurations</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {Object.keys(profiles).length} Configured
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Default chart titles, sub-headings, and reference notes for each game (PC &amp; Laptops).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#23232a] transition-colors"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b transition-colors ${
              statusMessage.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                : "bg-red-950/40 text-red-300 border-red-800/40"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body: Split Pane */}
        <div className="flex flex-1 overflow-hidden min-h-[480px]">
          
          {/* Left Column: Game List */}
          <div className="w-72 border-r border-[#23232a] bg-[#0e0e11] flex flex-col">
            {/* Search & Add */}
            <div className="p-3 border-b border-[#23232a] space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#18181b] border border-[#23232a] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500 placeholder-slate-500"
                />
              </div>

              {!isAddingGame ? (
                <button
                  type="button"
                  onClick={() => setIsAddingGame(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#1c1c22] hover:bg-[#23232a] border border-[#272730] rounded-lg text-xs font-semibold text-purple-400 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Game Title</span>
                </button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <input
                    type="text"
                    value={newGameInput}
                    onChange={(e) => setNewGameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddNewGame();
                      if (e.key === "Escape") setIsAddingGame(false);
                    }}
                    placeholder="Enter game name..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 bg-[#18181b] border border-purple-500 rounded-lg text-xs text-white focus:outline-none placeholder-slate-500"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddNewGame}
                      className="flex-1 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold transition"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingGame(false)}
                      className="px-2 py-1 bg-[#23232a] hover:bg-[#2a2a35] text-slate-300 rounded text-[11px] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Games List Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredGames.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No games found
                </div>
              ) : (
                filteredGames.map((g) => {
                  const isSelected = g.toLowerCase() === activeGameKey.toLowerCase();
                  const hasProfile = !!profiles[g];
                  const isCurrentActive = g.toLowerCase() === selectedGame.toLowerCase();

                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => selectGame(g)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition group ${
                        isSelected
                          ? "bg-purple-600 text-white font-semibold shadow-sm"
                          : "text-slate-300 hover:bg-[#18181b]"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate">{g}</span>
                        {isCurrentActive && (
                          <span className={`text-[10px] block ${isSelected ? "text-purple-200" : "text-blue-400"}`}>
                            ● Active in Chart
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasProfile && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? "bg-white" : "bg-purple-400"
                            }`}
                            title="Has custom saved profile"
                          />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Editor Panel */}
          <div className="flex-1 flex flex-col bg-[#121215] overflow-y-auto p-6 space-y-5">
            {activeGameKey ? (
              <>
                {/* Active Game Title Bar */}
                <div className="flex items-start justify-between pb-3 border-b border-[#23232a]">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-purple-400 font-bold">
                      Configuring Game
                    </span>
                    <h3 className="text-lg font-bold text-white">{activeGameKey}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeHasSavedProfile ? (
                      <button
                        type="button"
                        onClick={handleDeleteProfile}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-800/40 text-xs font-medium transition"
                        title="Delete this profile and revert to defaults"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Profile</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveCurrentProfile}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-medium transition disabled:opacity-50"
                        title="Save as a new profile in game_profiles.json"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save as New Profile</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Default Chart Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <span>Default Chart Heading / Title</span>
                        <span className="text-[10px] font-normal text-slate-400">(renders on top of the chart)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setTitleInput(activeGameKey.toUpperCase())}
                        className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Game Name</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder={`e.g. ${activeGameKey.toUpperCase()} - The International 2024 Finals`}
                      className="w-full px-3.5 py-2 bg-[#18181b] border border-[#23232a] focus:border-purple-500 rounded-lg text-sm text-white focus:outline-none placeholder-slate-500 font-medium"
                    />
                    <p className="text-[11px] text-slate-400">
                      When this game is scanned or viewed, the chart title will default to this text automatically.
                    </p>
                  </div>

                  {/* Default Sub-Heading / Settings Preset */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>Default Sub-Heading / Settings Preset</span>
                      <span className="text-[10px] font-normal text-slate-400">(renders below the title)</span>
                    </label>
                    <input
                      type="text"
                      value={subHeaderInput}
                      onChange={(e) => setSubHeaderInput(e.target.value)}
                      placeholder="e.g. 1080p | ULTRA HIGH PRESET | DX11"
                      className="w-full px-3.5 py-2 bg-[#18181b] border border-[#23232a] focus:border-purple-500 rounded-lg text-sm text-white focus:outline-none placeholder-slate-500 font-medium"
                    />

                  </div>

                  {/* Private Reference Notes */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        <span>Internal Reference Notes</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Won't appear on chart
                        </span>
                      </label>
                    </div>
                    <textarea
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      rows={4}
                      placeholder="Add notes about benchmark scenes, replay IDs, driver versions, specific graphic settings, or testing methodology..."
                      className="w-full px-3.5 py-2 bg-[#18181b] border border-[#23232a] focus:border-purple-500 rounded-lg text-xs text-slate-200 focus:outline-none placeholder-slate-500 resize-none font-sans"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        These notes are saved in the database for your reference and will never be rendered on the exported chart.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save and Apply Action Buttons */}
                <div className="pt-4 border-t border-[#23232a] flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {activeHasSavedProfile ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved in game_profiles.json</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Not yet saved as a profile in game_profiles.json</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onApplyProfileToActiveChart && activeGameKey.toLowerCase() === selectedGame.toLowerCase() && (
                      <button
                        type="button"
                        onClick={handleApplyToActive}
                        className="px-3 py-2 rounded-lg bg-[#23232a] hover:bg-[#2c2c35] border border-[#30303c] text-xs font-semibold text-slate-200 transition"
                        title="Apply current inputs to active chart immediately"
                      >
                        Apply to Active Chart
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveCurrentProfile}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? "Saving..." : activeHasSavedProfile ? "Update Profile" : "Save as New Profile"}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Gamepad2 className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Select a game from the list</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Choose any game on the left to configure its default chart title, settings sub-header, and reference notes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#23232a] bg-[#0e0e11] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 truncate max-w-xl">
            <span className="font-semibold text-slate-300">Config File:</span>
            <span className="font-mono text-[11px] text-slate-400 truncate" title={configFile || "backend/game_profiles.json"}>
              {configFile || "backend/game_profiles.json"}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-purple-950/40 text-purple-300 text-[10px] font-mono border border-purple-800/40">
              Notepad Ready
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#23232a] hover:bg-[#2c2c35] text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
