# CapFrameX Analyzer - Dedicated Changelog

All notable changes, milestones, and architectural improvements to the **CapFrameX Analyzer** (Frametime Capture Ingestion, Multi-Resolution Comparative Engine & Game Benchmark Visualizer) are documented here.

This application is also bundled as a dedicated analysis app within the unified **BenchMate Analyzer** suite (see [CHANGELOG.md](CHANGELOG.md)).

## [1.1.9] - 2026-10-26
### Telemetry Upload Mode Auto-Detection, Folder Path Persistence & Export Naming Fix

- **Automatic Laptop / Desktop Session Mode Ingestion**:
  - Fixed blank game and hardware list (`Games (0)`) when uploading laptop benchmark captures.
  - Ingestion pipeline now automatically detects telemetry hardware session type and serves games and hardware for the detected session mode immediately upon upload.
- **Folder Path Scan Persistence**:
  - Maintained original directory paths across scan requests so clicking "Scan" does not wipe or reset active capture folders.
- **Export File Naming Correction**:
  - Fixed parameter alignment in `buildChartFileName` where single and batch ZIP exports prepended "webp" into the filename instead of the user's custom review tag.

---

## [1.1.8] - 2026-10-17
### Multi-Bar Custom Charts, Editable Column Headers, Aspect Ratio Scale Stabilization & Single-Row Title Constraints

- **Multi-Bar Custom Charts with In-Place Editable Headers**:
  - Full support to add, delete, and rename custom column bars per row in custom charts (e.g. Temps with "Peak Temp" & "Idle Temp", Power Draw with "Peak Power" & "Idle Wattage").
  - Directly editable column titles within the table header, instantly updating chart legend names, series definitions, and hover tooltips.
- **Aspect Ratio Scale Stabilization & Glitch Elimination**:
  - Resolved chart scaling issues and white space glitches when switching between custom charts and game charts.
  - Sizing container isolated via `absolute inset-0`, with keyed re-instantiation and explicit ECharts `.resize()` triggers eliminating the need to toggle aspect ratios manually.
- **Strict 1-Row Title Constraint in 16:9 Landscape**:
  - Main game titles never wrap onto more than 1 row in 16:9 mode, with automatic font downscaling and text truncation overflow.
- **Adaptive Single/Double-Row Wrapping in 9:16 Vertical**:
  - Titles remain on a single centered line as long as they don't collide with the logo, and wrap onto two lines with balanced vertical rhythm only when necessary.
- **Harmonized Header Spacing**:
  - Full vertical rhythm parity with the OCR app for consistent, balanced header proportions.

---

## [1.1.7] - 2026-10-17
### Dynamic Vertical Rhythm, Graph Font Restoration, Collapsible Sidebar & Global Theme Hub

- **Dynamic Vertical Rhythm & Balanced Header Spacing**:
  - Replaced static offset numbers with dynamic geometric calculations across all resolution presets (720p, 1080p, 4K) and aspect ratios (16:9, 9:16).
  - Ensured Title $\rightarrow$ Sub-header and Sub-header $\rightarrow$ Legend gaps are perfectly symmetrical (`titleItemGap === subToLegendGap = 14px` at 1080p, `8px` in preview).
  - Explicitly bound subtext line height (`1.22 * fontSize`) and applied zero-padding normalization to eliminate cross-platform font collisions.
- **Chart Typography Isolation**:
  - Restored classic `Open Sans Condensed` and `Open Sans` typography across benchmark chart canvas and image exports while keeping modern `Geist` for UI controls.
- **Collapsible Telemetry Sidebar & Matching Game Icons**:
  - Added collapse toggle to the game and run sidebar (`w-72` $\leftrightarrow$ `w-16` icon-only with tooltips).
  - Replaced repetitive generic gamepad icons with authentic, high-resolution official game desktop icons (CS2, Cyberpunk 2077, Black Myth: Wukong, DOTA 2, AC Mirage, Ghost of Tsushima, Hogwarts Legacy, Horizon, Returnal, Far Cry 6, and 30+ titles) bundled locally in `public/game-icons/`, plus custom icon URL support in Game Profiles.
- **Global Theme Synchronization**:
  - Synced with the suite-wide theme hub in the master header.

---

## [1.1.6] - 2026-10-17
### BrewedOps Telemetry Sidebar, Keyboard Search & Obsidian Dark Palette

- **BrewedOps Telemetry Sidebar Overhaul**:
  - Redesigned the game selection sidebar with deep obsidian styling (`#0a0e17`), delicate hairline borders, and subdued telemetry entry cards.
- **Inline Keyboard Shortcut Search**:
  - Added instantaneous search focus triggered via `/` keycap pill, filtering games and custom telemetry runs in real time.
- **Segmented Filter Chips**:
  - Upgraded filter navigation (All, Games, Custom) with clean segmented chips and subtle active states.
- **Geist & Geist Mono Typography**:
  - Integrated tabular figures for run counts and model statistics, eliminating layout shift during telemetry queries.

---

## [1.1.5] - 2026-10-17
### Concurrent Multi-Threaded Ingestion Engine & Unified Modern Windows Folder Picker

- **Concurrent Directory Scanning**:
  - Refactored CapFrameX directory scanning with `concurrent.futures.ThreadPoolExecutor(max_workers=32)`, cutting file parse time by >40% across large capture datasets while maintaining exact deterministic run sequence.
- **Asynchronous Multipart Uploads**:
  - Parallelized JSON decoding and run ingestion via `asyncio.gather` and non-blocking worker threads for large browser file selections.
- **Unified Modern Folder Dialog**:
  - Standardized backend folder picker with native Windows `IFileOpenDialog`, guaranteeing identical modern Explorer UI and instant single-click cancellation across shortcuts and dialogs.

---

## [1.1.4] - 2026-10-08
### Offline Font Portability & Monochromatic Blue Highlight Parity

- **Offline Typography Consistency**:
  - Embedded `Open Sans`, `Open Sans Condensed`, and `Inter` fonts into the native runtime bundle, ensuring uniform rendering on secondary devices without internet access.
- **Monochromatic Blue Highlight Default**:
  - Enabled `useHighlightBarColor` by default and aligned highlight gradients to Monochromatic Blue (`#2563eb` / `#60a5fa`), eliminating residual amber/yellow 1% Low highlights (`#b45309`).
- **Automatic Settings Migration**:
  - Seamlessly converts existing user preferences from amber presets to Monochromatic Blue.

---

## [1.1.3] - 2026-09-30
### Export Engine Parity, Guarded Tab Export Handling & User Warning Feedback

- **Direct Export Delivery Reliability**:
  - Standardized single chart exports, Tri-Resolution ZIPs, and All Games ZIPs through dynamic API routing (`getApiBase`) ensuring files always download to Windows `Downloads`.
  - Resolved dev server relative path resolution failures that prevented downloads from firing.
- **Dataset Guard Warning Toasts**:
  - Eliminated silent failures when exporting with unselected or empty datasets by displaying clear, actionable warning notifications.
- **Enhanced Exception Catching**:
  - Added comprehensive error toasts to Tri-Res and All Games batch exporters to guarantee full user feedback on failures.
- **Vite Dev Server Compatibility**:
  - Full proxying support enabling full export capabilities during frontend development on port 5173.

---

## [1.1.2] - 2026-09-28
### Direct Downloads Delivery, Tri-Res & All-Games ZIP Export Reliability & Title Margin Safety

- **Direct Downloads Delivery via Backend Engine**:
  - Routed single chart image exports (`exportSingleChart`), Tri-Resolution ZIP packages (`exportTriResolutionZip`), and Batch All-Games archives (`handleExportAllGamesZip`) through `deliverExportFile` and `POST /api/export/save-file`.
  - Files are written directly to the Windows `Downloads` directory, eliminating WebView2 silent cancellation of blob downloads.
- **Export Toast Notifications & "Show in Explorer"**:
  - Added on-screen success toasts reporting exported filenames and file sizes, complete with a 1-click **"Show in Explorer"** button that selects the generated file in Windows File Explorer.
- **9:16 Vertical Safe Title Layout & Dynamic Offsets**:
  - Implemented safe centered title width constraints to prevent long game or profile titles from overlapping the top-right publication logo.
  - Aligned dynamic top offsets (`titleTop`, `legendTop`, `gridTop`) based on line count for balanced typography.

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
