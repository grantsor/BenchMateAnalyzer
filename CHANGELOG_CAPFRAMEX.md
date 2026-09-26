# CapFrameX Analyzer - Dedicated Changelog

All notable changes, milestones, and architectural improvements to the **CapFrameX Analyzer** (Frametime Capture Ingestion, Multi-Resolution Comparative Engine & Game Benchmark Visualizer) are documented here.

This application is also bundled as a dedicated analysis app within the unified **BenchMate Analyzer** suite (see [CHANGELOG.md](CHANGELOG.md)).

---

## [1.1.1] - 2026-09-26
### Chart Scaling & Typography Overhaul, Heading Spacing Parity, Default Gadget Pilipinas Branding & Import Folder Access

- **Chart Text Scaling & Subheading Sizing Parity**:
  - Eliminated text scaling disparities on charts with few products.
  - Subheadings, axis labels, and bar metrics now scale proportionally across both horizontal (16:9) and vertical (9:16) export orientations.
  - Aligned heading and subheading line-heights and vertical gaps to match Benchmark OCR Analyzer's editorial presentation standards.
- **Even Heading & Subheading Spacing**:
  - Unified margin calculations for titles, subtitles, and category labels across single-metric, split-metric, and merged dual-bar charts.
- **Default Publication Branding Integration**:
  - Pre-configured the official high-resolution Gadget Pilipinas colored ribbon logo (`12500x4500`, aspect `2.7778`) as the active default publication mark.
  - Matched logo scaling, top-right positioning offsets, and aspect ratio handling with Benchmark OCR Analyzer.
- **Chart Defaults & User Setting Retention**:
  - Fixed persistence of export aspect ratios (`16:9` vs `9:16`), resolutions (`720p`, `1080p`, `4K`), image formats (`WebP`, `PNG`), and smart auto-switch thresholds.
  - User-selected display configurations and export preferences are reliably saved and restored across sessions.
- **1-Click Import Folder Explorer Integration**:
  - Added clickable folder icon on the capture path input allowing reviewers to immediately open their CapFrameX JSON capture folder in Windows File Explorer.
  - Integrated with the global `Ctrl+I` shortcut and top navbar action to trigger app-relative import directory launching.

---

## [1.1.0] - 2026-09-25
### Tri-Resolution Comparative Engine, Laptop Power Profiles, GPU Hierarchy Ranking, Merged Dual-Bars & Metadata Editor

- **Tri-Resolution Comparative Engine (1080p, 1440p, 4K)**:
  - Added multi-resolution comparative tabs with GPU and CPU comparative grouping.
  - Seamless 1-click resolution switching across 1080p, 1440p, and 4K benchmark runs.
- **Laptop Mode & Power Profile Benchmarking**:
  - Automated grouping by Laptop Name and Power Profile (Whisper / Balanced / Turbo / Custom).
  - Multi-resolution comparative tables for mobile workstation and gaming laptop reviews.
- **GPU Hierarchy Ranking**:
  - Visual drag-and-drop / rank-ordered hierarchy sorting that groups benchmark bars strictly by GPU generation and performance tiers.
- **Merged Dual-Bar Chart Mode**:
  - Combines 1% Low FPS and Average FPS into an elegant single composite bar per GPU.
  - Displays both metrics with hybrid collision-free label placement.
- **CapFrameX Run Table & Metadata Editor**:
  - In-app editor to inspect ingested JSON runs, rename misidentified GPUs or CPUs, and reassign game titles across capture batches.
- **Game Profiles JSON Editor**:
  - Edit game titles, resolutions, presets, and review notes with 1-click "Open in Notepad" and hot-reloading.

---

## [1.0.0] - 2026-09-24
### Standalone CapFrameX Analyzer Launch

- **Automatic JSON Capture Ingestion**:
  - Scans folders of CapFrameX JSON capture files and computes Average FPS, 1% Low FPS, and 0.1% Low FPS.
- **Interactive Chart Customizer**:
  - Real-time customization of bar colors, Excel gradient presets, typography, and publication logos.
- **Batch Image Export**:
  - High-resolution PNG and WebP exports formatted for editorial publications and hardware review articles.
