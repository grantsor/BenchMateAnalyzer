import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, Shield, Sparkles, Moon, CheckCircle2, Palette, Zap, Key, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { useThemeStore, THEME_OPTIONS } from "../stores/themeStore";
import { api, AISettings } from "../api/client";

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Application Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Review engine settings, interface appearance, offline OCR preferences, and database health.
        </p>
      </div>

      {/* UI Theme & Appearance Card */}
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-brand-border/60 pb-4">
          <Palette className="w-5 h-5 text-brand-red" />
          <div>
            <h3 className="text-sm font-bold text-white">UI Theme & Appearance</h3>
            <p className="text-xs text-slate-400">Choose your preferred workspace aesthetic and contrast level</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {THEME_OPTIONS.map((t) => {
            const isSelected = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "bg-brand-surface border-brand-red ring-2 ring-brand-red/30 shadow-lg shadow-rose-900/10"
                    : "bg-brand-surface/60 border-brand-border hover:border-slate-500 hover:bg-brand-surface/90"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{t.icon}</span>
                      <span className="text-xs font-bold text-white">{t.name}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-brand-red shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                {/* Color Swatch Preview */}
                <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t.badge}</span>
                  <div className="flex items-center space-x-1.5">
                    <div
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: t.surfaceColor }}
                      title={`Surface: ${t.surfaceColor}`}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: t.cardColor }}
                      title={`Card: ${t.cardColor}`}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: t.borderColor }}
                      title={`Border: ${t.borderColor}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OCR Engine Status Card */}
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-brand-border/60 pb-4">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Primary OCR Engine</h3>
            <p className="text-xs text-slate-400">Offline high-accuracy neural text recognition</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-brand-surface p-3.5 rounded-xl border border-brand-border/60">
            <span className="text-slate-400 font-medium">Model Architecture</span>
            <div className="text-sm font-bold text-white mt-1">
              RapidOCR (PaddleOCR PP-v4 ONNX)
            </div>
          </div>
          <div className="bg-brand-surface p-3.5 rounded-xl border border-brand-border/60">
            <span className="text-slate-400 font-medium">Execution Provider</span>
            <div className="text-sm font-bold text-emerald-400 mt-1">
              Microsoft ONNX Runtime (CPU / DirectML)
            </div>
          </div>
        </div>
      </div>

      {/* AI Vision Engine & Hardware Acceleration Card */}
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">AI Vision Engine & Hardware Acceleration</h3>
              <p className="text-xs text-slate-400">Configure local GPU/NPU acceleration and optional cloud fallback</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800">
            Phase 2 AI Core
          </span>
        </div>

        <AIEngineSettingsCard />
      </div>

      {/* Privacy & Cloud AI Card */}
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-brand-border/60 pb-4">
          <Shield className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Privacy & Offline Guarantee</h3>
            <p className="text-xs text-slate-400">Your benchmark screenshots are processed 100% locally by default</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The software operates completely offline. No screenshots or hardware data are transmitted over the internet when using DirectML local acceleration.
          Optional cloud vision fallbacks remain inactive unless you explicitly provide a Gemini API key.
        </p>

        <div className="p-3 bg-brand-surface rounded-xl border border-brand-border/60 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Local Hardware Mode</span>
          <span className="px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-800 uppercase text-[10px]">
            Active
          </span>
        </div>
      </div>

      {/* Storage & Database Card */}
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-brand-border/60 pb-4">
          <HardDrive className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Database & Storage</h3>
            <p className="text-xs text-slate-400">Local embedded SQLite storage</p>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-2">
          <div>
            <span className="text-slate-400">Database Location: </span>
            <span className="font-mono text-slate-200">
              backend/data/benchmark_analyzer.db
            </span>
          </div>
          <div>
            <span className="text-slate-400">Original Screenshots Safety: </span>
            <span className="text-emerald-400 font-semibold">
              Read-only (original screenshots are never modified or moved)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIEngineSettingsCard: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>({
    provider: "directml",
    has_api_key: false,
    model_name: "gemini-2.5-flash"
  });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getAISettings()
      .then((cfg) => {
        setSettings(cfg);
      })
      .catch((err) => {
        console.warn("Could not load AI settings:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (providerOverride?: "directml" | "gemini") => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const targetProvider = providerOverride || settings.provider;
      const res = await api.updateAISettings({
        provider: targetProvider,
        api_key: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
        model_name: settings.model_name
      });
      if (res?.settings) {
        setSettings(res.settings);
      } else {
        setSettings((prev) => ({ ...prev, provider: targetProvider }));
      }
      setApiKeyInput("");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save AI settings: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        <span>Loading AI vision engine status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Provider Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Local DirectML Option */}
        <div
          onClick={() => {
            setSettings((p) => ({ ...p, provider: "directml" }));
            handleSave("directml");
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            settings.provider === "directml"
              ? "bg-brand-surface border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-900/10"
              : "bg-brand-surface/60 border-brand-border hover:border-slate-500 hover:bg-brand-surface/90"
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Local DirectML Engine</span>
              </div>
              {settings.provider === "directml" && (
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Accelerated via your <strong className="text-slate-200">RTX 4070 GPU</strong> or <strong className="text-slate-200">Windows NPU</strong>. 100% offline, private, and instant with zero cloud network traffic.
            </p>
          </div>

          <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Hardware Target</span>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-bold border border-purple-800/80">
              NVIDIA RTX 4070 / NPU
            </span>
          </div>
        </div>

        {/* Gemini Cloud Fallback Option */}
        <div
          onClick={() => {
            setSettings((p) => ({ ...p, provider: "gemini" }));
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            settings.provider === "gemini"
              ? "bg-brand-surface border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-900/10"
              : "bg-brand-surface/60 border-brand-border hover:border-slate-500 hover:bg-brand-surface/90"
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Google Gemini Multimodal AI</span>
              </div>
              {settings.provider === "gemini" && (
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              State-of-the-art vision reasoning with <strong className="text-slate-200">Gemini 2.5 Flash</strong>. Deeply analyzes complex multi-score grids and unrecognized layouts.
            </p>
          </div>

          <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Cloud Model</span>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-bold border border-purple-800/80">
              {settings.model_name}
            </span>
          </div>
        </div>
      </div>

      {/* Cloud Gemini Configuration (When Gemini is active or configured) */}
      {settings.provider === "gemini" && (
        <div className="p-4 bg-brand-surface rounded-xl border border-brand-border space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Gemini API Key</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {settings.has_api_key ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 inline" />
                  <span>Configured & Encrypted</span>
                </span>
              ) : (
                <span className="text-amber-400">Key Not Set (Enter below)</span>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={settings.has_api_key ? "••••••••••••••••••••••••••••••••" : "Paste your Gemini API key here..."}
                className="w-full bg-brand-card border border-brand-border rounded-xl px-3 py-2 pr-10 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave("gemini")}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Key</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>AI vision preferences saved successfully!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
