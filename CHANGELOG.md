# Changelog & Version Evolution

All notable changes and milestones in the **BenchMate Analyzer** suite are documented here.

The suite integrates the **Benchmark OCR Analyzer** (vision-based AI extraction) and the **CapFrameX Analyzer** (telemetry ingestion & frametime analysis) into a unified, high-performance, offline desktop application.

---

## [1.1.0] - 2026-09-25
### Uniform Multi-Theme Engine, 3-in-1 Changelogs Hub, Customizable Shortcuts, Smart 9:16 Auto-Switch & Topbar Polish

- **Uniform Theming Engine Across Both Applications**:
  - Integrated a shared 4-theme styling system (`Obsidian Dark` [default], `Clean Light`, `Pure Black OLED`, and `Midnight Navy`) across both the Benchmark OCR Analyzer and the CapFrameX Analyzer.
  - Fixed CapFrameX light mode rendering by adding deep theme variables and CSS overrides (`[data-theme="light"]`) for all hex-based background surfaces, text headers, modals, cards, and input panels.
  - Added instant multi-window/popout theme synchronization via `storage` event listeners.
- **Top Navbar Polish & Dedicated Settings Hub**:
  - Removed decorative tags ("Main App", "Dedicated App", "Dual Engines Online") for a cleaner, modern professional toolbar.
  - Replaced the engine status placement with a dedicated **Settings gear button** (`Ctrl+,`) opening a tabbed modal with 6 sections:
    1. **Appearance & Themes**: 4 rich visual theme cards with real-time preview and instant switching.
    2. **Changelogs Hub**: Interactive 3-in-1 changelog browser supporting BenchMate Suite, Benchmark OCR Analyzer, and CapFrameX Analyzer with real-time keyword search and 1-click Markdown copy.
    3. **Branding & Smart 9:16 Export**: Publication name (`GADGET PILIPINAS`), official logo preview, default export presets (16:9, 720p, WebP), and intelligent vertical auto-switching when products $> 8$.
    4. **Keyboard Shortcuts**: Fully customizable hotkeys with interactive keystroke recording, conflict detection, and 1-click default restoration.
    5. **Export File Naming**: Configurable file naming template preview (`[product] - [benchmark] - [resolution]`).
    6. **Data & Storage Diagnostics**: 1-click "Open Data Folder" opening Windows File Explorer at the local data directory, plus independent preferences reset buttons.
- **Smart 9:16 Auto-Switching for Large Comparisons**:
  - Automatically switches chart aspect ratio to `9:16` vertical when comparing more than 8 products or configurations (customizable threshold in Settings).
  - Equipped with a manual override guard so user-chosen aspect ratios are preserved on the active dataset without fighting manual clicks.
- **Customizable Global Keyboard Shortcuts**:
  - User-configurable shortcuts for Switch to OCR App (`Ctrl+1`), Switch to CapFrameX App (`Ctrl+2`), Quick Export Active Chart (`Ctrl+E`), Batch Export (`Ctrl+B`), Open Settings (`Ctrl+,`), Cycle UI Theme (`Ctrl+Shift+T`), and Open Data Folder (`Ctrl+O`).
  - Input-focus guards prevent typing in search bars or text fields from triggering app shortcuts.
- **System Integration & Diagnostics**:
  - Added `POST /api/system/open-data-folder` endpoint launching Windows File Explorer directly into the application data and exports directory (`os.startfile`).

---

## [1.0.0] - 2026-09-24
### Initial Release of BenchMate Analyzer Unified Desktop Suite

- **Dual-Engine Unified Architecture**:
  - Merged **Benchmark OCR Analyzer** and **CapFrameX Analyzer** into a single executable (`BenchMate-Analyzer.exe`).
  - Isolated memory, caching, and state management: OCR ingested image sessions and CapFrameX JSON capture sessions operate concurrently without cross-contamination.
- **Multi-Window & Popout Support**:
  - Support for popping out CapFrameX Analyzer into a dedicated standalone browser window or multi-monitor setup while running OCR in the primary window.
- **Offline Self-Contained Deployment**:
  - Built-in PaddleOCR v4 models, ONNX Runtime, and SQLite embedded database packaged via PyInstaller with zero internet dependencies.

---

## [2.15.0] - 2026-09-11 (Benchmark OCR Analyzer Legacy Milestone)
### Filename-Agnostic OCR Vision, No-Recompile Dynamic AI Benchmark Builder & Interactive Review Tagging
- **Filename-Agnostic Visual OCR Detection**:
  - Automatically identifies benchmark screenshots (3DMark Speed Way, Steel Nomad, Time Spy, Fire Strike, Port Royal, Geekbench Compute & AI, Procyon AI Vision & Image Gen, Octane, Cinebench, SuperPI, wPrime) with 95–99% confidence directly from visual layout and text anchors.
  - Completely eliminates identification failures when screenshots follow generic Windows Snipping Tool timestamp conventions (`Screenshot 2025-06-24...`). Tested on `N:\BenchMarkTool\HP OMEN MAX 16 DATA` achieving 57/58 recognized benchmarks.
- **No-Recompile Dynamic Benchmark Builder**:
  - Users can create, register, and calibrate brand-new benchmarks on the fly directly inside the app.
  - Benchmark definitions are stored in local JSON schemas (`data/benchmarks/*.json`), immediately enabling OCR parsing, metric extraction, and comparison chart generation without requiring Python code modifications or standalone app recompilation.
  - Added layout auto-detection endpoint (`POST /api/benchmarks/auto-detect-schema`) to suggest metric anchors and categories directly from screenshot OCR tokens.
- **OCR Review Interactive Tagging & Reassignment**:
  - Unknown or misdetected screenshots in OCR Review can now be interactively reassigned to any benchmark via a dedicated dropdown with a 1-click `Apply & Reparse` action.
  - Automatically re-executes parsing with the chosen benchmark definition, recalculating and persisting all updated metric values.
- **Dedicated "Unknown" Filter Tab & Review Badges**:
  - Added an `Unknown (N)` quick filter tab and warning badges in OCR Review so users can immediately locate and tag unclassified screenshots.
- **Hardware Subsystem & Component Spec Classification**:
  - Automatically classifies benchmark test categories (`GPU`, `CPU`, `Motherboard`, `RAM`, `SSD`, `Laptop`) and extracts detailed hardware specs (e.g. `RTX 5080 Laptop GPU`, `RX 9070 GRE`, `Ryzen 7 9800X3D`, `Ultra 9 275HX`) from visual OCR text and paths.
- **Procyon AI & Multi-Variant Parser Calibration**:
  - Calibrated Procyon AI Image Generation (Stable Diffusion 1.5) to parse overall score (`2003`), UNET speed (`32.40 it/s`), and generation speed (`3.119 s/image`).
  - Calibrated Procyon AI Vision (`941`), Geekbench 6 OpenCL (`36164`), and Geekbench 6 Vulkan (`156936`) with robust fuzzy token matching for degraded OCR.
- **Hardware Acceleration & On-Device Inference Config**:
  - Added on-device NPU / GPU DirectML / CPU inference configuration in Settings with real-time hardware status and acceleration controls.

---

## [2.14.0] - 2026-09-10
### Combined Benchmarks, Default Brand Logo Integration & Process Hardening
- **Unified "Arithmetic Benchmark" (SuperPI 32M + wPrime 1024M)**:
  - Combined SuperPI 32M and wPrime 1024M into a single dual-bar benchmark titled strictly `Arithmetic Benchmark`.
  - In comparison charts and batch exports, each profile/configuration renders two distinct bars: one for SuperPI 32M and one for wPrime 1024M.
  - Converted SuperPI minutes/seconds (`mm:ss`, `mm:ss.xxx`, `Xh Ym Zs`, `Xm Ys`) to exact unrounded seconds (`s`) with full millisecond precision.
  - Tagged as `LOWER IS BETTER (s)` with ascending sort order (`asc`).
- **Combined "3DMark Suite - Speedway and Steel Nomad"**:
  - Combined 3DMark Speed Way and 3DMark Steel Nomad into a single dual-bar benchmark titled strictly `3DMark Suite - Speedway and Steel Nomad`.
  - Plotted Graphics Test scores in `FPS` with `HIGHER IS BETTER (FPS)` polarity.
- **Default Publication Logo Integration**:
  - Integrated high-resolution `Full Logo Horizontal Colored` (`12500x4500`, aspect `2.7778`) as the default publication logo positioned top-right on all benchmark charts.
  - Added an `isCustomLogo` flag in chart preferences: user custom uploads are preserved, while a 1-click `[Default]` button allows instant reversion to the official logo.
  - Bundled logo assets directly into the standalone distribution package so the app runs fully offline without requiring drive `N:`.
- **Process Auto-Attach & Port Conflict Recovery**:
  - If `Benchmark-Analyzer.exe` is launched while an instance is already running in the background, the new process detects the healthy server, opens your browser, and cleanly exits without crashing.
  - If port `8742` is occupied by an orphaned zombie process, the engine automatically finds the listening PID via `netstat` and terminates it via `taskkill`, freeing the port for a clean startup.
- **In-App "Exit App" Shutdown**:
  - Added an `Exit` button (Power icon) in the top Navbar with a confirmation dialog to cleanly terminate the Python background server and release system resources.
- **Unextracted ZIP Detection**:
  - Added a native Windows warning dialog alerting users if `Benchmark-Analyzer.exe` is launched directly from inside an uncompressed zip preview folder.
- **Bundled Utility Scripts**:
  - Included `Stop-App.bat` and `Restart-App.bat` in the root folder alongside `Benchmark-Analyzer.exe` for 1-click troubleshooting.

---

## [2.13.0] - 2026-09-09
### Standalone Desktop Folder Picker Dialog & Clean Machine Resilience
- **Native Desktop Folder Picker**:
  - Resolved silent folder browse failures on clean/new Windows devices. Added robust multi-tier folder picker engine using Windows PowerShell/Win32 FolderBrowserDialog with Tkinter fallback and strict timeout guards.
  - Added real-time path validation feedback and clear error reporting on the Import Benchmark Data screen.
- **SEO & Editorial File Naming Phrase**:
  - Implemented custom export phrase input for files uploaded to WordPress or editorial media (e.g. `ASUS ExpertBook Ultra Review - Geekbench 6.webp`).
  - Strict separation: Product Name continues to cleanly identify hardware in chart bar labels (`ASUS ExpertBook Ultra - Profile`), while the SEO phrase is appended exclusively to the exported filename.
- **Dedicated Exact Persistence**:
  - Backed by dedicated `localStorage` (`gp_export_naming_phrase_v1`). Whatever you enter (e.g. `Review`) persists permanently across benchmarks, project switching, and app restarts; leaving it blank keeps it blank.
- **Streamlined Export UX & Whitespace Normalization**:
  - Eliminated redundant notes and extra pills for a clean, professional export card layout.
  - Added strict whitespace normalization in `buildChartFileName` to prevent double spaces.
- **Pipeline Integration**:
  - Fully synchronized across single chart export, batch separate images, batch ZIP archive bundling, and the batch checklist modal.

---

## [2.12.0] - 2026-09-09
### UI Dark Mode Theme Engine, Results Benchmark Redesign & Universal Version Alignment
- **UI Dark Mode & Multi-Theme System**:
  - Implemented native pure dark mode (Obsidian / Charcoal) as default, high-contrast OLED pitch black, and legacy midnight navy with an instant 1-click header switcher and settings configuration swatches.
  - Zero-flicker pre-hydration script in `index.html` loads saved theme instantly before React mount.
- **Results Page Benchmark Selector Redesign**:
  - Eliminated single-row horizontal scrolling on the Results page, replacing it with a responsive, multi-line wrapping pill grid sorted alphabetically (A-Z) to take full advantage of wide screens.
  - Added dedicated header with Available Benchmarks count badge and Multi-Run Aggregation selector.
- **Universal Single Source of Truth Version Alignment**:
  - Centralized application version constant (`APP_VERSION = "2.13.0"`) across sidebar, changelog, navbar, and settings.

---

## [2.11.0] - 2026-09-09
### Duplicate Project Detection, Smart Rescan Flow & Startup Hardening
- **Duplicate Project Detection on Import**:
  - Automatically checks folder paths and project names against existing records when selecting or entering a folder.
  - If an existing project matches, prompts with a clear modal to prevent accidental project duplication.
- **Smart Rescan Folder for Changes**:
  - Added a dedicated "Rescan Folder for Changes" action on duplicate detection that incrementally ingests new or updated benchmark screenshots into the existing project without re-creating it or wiping existing data.
- **Startup Race Condition Resolution**:
  - Updated local launcher to actively poll backend health (`/api/health`) before opening the browser, and equipped project store with exponential retry backoff so project lists never appear empty on cold launch.
- **Project Page Duplicate Badging & 1-Click Cleanup**:
  - Review Projects page flags duplicate folder paths with amber badges, highlights redundant duplicate entries, and offers 1-click "Delete Duplicate" to safely clean up extra entries without affecting the primary project.
- **Direct "Rescan" on Project Cards**:
  - Every project card with an associated root folder now includes a quick "Rescan" button to immediately check for newly completed benchmark screenshots.
- **Database Cascade & Cleanup Hardening**:
  - Enhanced project deletion to explicitly purge all child configurations, source images, results, and metrics in SQLite, preventing orphaned data.

---

## [2.10.0] - 2026-09-09
### CrossMark Benchmark Support, 3DMark Suite Expansion & Universal Typo Tolerance
- **CrossMark Benchmark Integration**:
  - Added full benchmark definition (`crossmark.json`) and neural parser (`crossmark.py`) extracting Overall Score, Productivity, Creativity, and Responsiveness in pts.
- **Expanded 3DMark Test Suite**:
  - Implemented dedicated benchmark definitions and extraction logic for 3DMark Fire Strike, Speed Way, and Steel Nomad alongside Time Spy, supporting both Overall and Component score breakdowns.
- **Universal Typo Tolerance**:
  - Fuzzy sequence matching across all benchmarks to intelligently recognize human typos in folder and file names (e.g., `suoeropi` for SuperPI, `cinerr26` for Cinebench).
- **Cinebench 2026 Single-Core Fix**:
  - Resolved multi-line row leakage in Cinebench 2026 where CPU (Single Core) previously duplicated the Multi Core score.

---

## [2.9.0] - 2026-09-09
### Cinebench 2026 Single-Thread Fix, CrossMark Support, 3DMark Suite Expansion, Typo Tolerance & Sensor Filtering
- **Cinebench 2026 Single-Thread vs Multi-Thread Accuracy**:
  - Resolved an issue in `cinebench_parser` where CPU (Single Thread) or Single-Core copied the Multi-Core score.
  - Added support for `CPU (Single Thread)` and `CPU (Multiple Threads)` row labels with horizontal row matching tolerance tightened from 50px to 25px within the results container, preventing cross-row score leakage.
  - Adjusted verification confidence and score range thresholds to ensure whisper/quiet mode runs (e.g. 479 pts) verify automatically without false out-of-range warnings.
- **CrossMark Benchmark Integration**:
  - Created full benchmark definition (`crossmark.json`) and neural parser (`crossmark.py`) extracting Overall Score, Productivity, Creativity, and Responsiveness in pts.
  - Tuned confidence scoring to account for CrossMark's stylized bold digits.
- **3DMark Suite Expansion**:
  - Expanded 3DMark coverage beyond Time Spy (`threedmark_timespy`) to full suite:
    - **Fire Strike (`threedmark_firestrike`)**: Overall Score, Graphics Score, Physics Score, Combined Score.
    - **Speed Way (`threedmark_speedway`)**: Overall Score and Graphics Test (FPS).
    - **Steel Nomad (`threedmark_steelnomad`)**: Overall Score and Graphics Test (FPS).
  - Added shorthand code recognition for `3dm fs`, `3dm sn`, `3dm sw`, `3dm ss`, `3dm ts`.
- **Intelligent Typo Tolerance (SuperPI & Benchmark Identifier)**:
  - Added fuzzy sequence matching (threshold 0.75+) across `BenchmarkIdentifier.identify_by_filename` and individual parsers to gracefully handle misspelled filenames (such as `suoeropi.png` for SuperPI, `cinerr26.png` for Cinebench 2026, etc.).
  - Added structural dialog detection to `superpi_parser` matching calculation size (32M/16M/1M), completion timestamps, and result window labels.
- **Enhanced Non-Benchmark Sensor Filtering**:
  - Expanded `FolderScanner` ignore filters to automatically skip sensor and utility screenshots such as `hw1.png`, `hw2.png`, `hiwnfo3.png`, and `battlife standard.png` to ensure zero unknown files in test configurations.

---

## [2.8.0] - 2026-09-08
### OCCT Storage & CPU Benchmark Disambiguation, Sequential/Random Chart Grouping & Full SSD Database Synchronization
- **Dedicated OCCT Storage Benchmark Parser (`occt_storage`)**:
  - Implemented a dedicated high-accuracy neural parser and benchmark definition for OCCT Storage screenshots, extracting **Sequential Read**, **Sequential Write**, **Random Read**, and **Random Write** throughput in MB/s.
  - Added targeted subcrop OCR with contrast-inverting binarization fallback for light-on-dark digits to ensure reliable character extraction (e.g. `831.30` MB/s) without character loss or inversion artifacts.
- **Intelligent Component Disambiguation (OCCT Storage vs OCCT CPU)**:
  - Differentiated OCCT Storage tests from OCCT CPU benchmarks (AVX/SSE) using contextual column anchors and test metric presence.
  - Ensured CPU benchmarks (Zenbook / laptop review workflows) maintain their AVX and SSE multi/single-thread metric profiles while storage benchmarks receive their dedicated throughput metrics without false cross-talk.
  - Safeguarded 3DMark Storage parser to prevent false positives caused by OCCT's navigation menu labels.
- **Sequential & Random Comparison Chart Sub-Groups**:
  - Grouped comparison charts for OCCT Storage into two distinct sub-groups in the Comparison Chart Builder:
    - **Subgroup 1**: Sequential Read & Write in MB/s (`seq_read`, `seq_write`)
    - **Subgroup 2**: Random Read & Write in MB/s (`rnd_read`, `rnd_write`)
  - Ensures clean, publication-ready graphs adhering to hardware review standards.
- **Complete SSD Database Integration & Migration**:
  - Added `occt_storage` columns to `METRIC_COLUMNS` and registered titles in `ssd_database_service.py`.
  - Added automatic SSD synchronization during project folder imports in `import_service.py`.
  - Migrated legacy OCCT scores from `ssd_benchmark_scores` and populated all 5 test SSD models (both Internal M.2 and External USB drives) with accurate MB/s throughput data.

---

## [2.7.0] - 2026-09-08
### Unified Blackmagic Speed Test Graphs, Strict 1GB/5GB Dual-Tier Architecture, Metric Checklist Pruning & Speed-Based Disambiguation
- **Unified Blackmagic Speed Test Graphs**:
  - Combined Write Speed and Read Speed into a single comparison chart (side-by-side bars for Write & Read) matching CrystalDiskMark and AS SSD conventions.
  - Eliminated redundant sub-group tabs that unnecessarily separated Write and Read speeds into disconnected charts.
- **Strict 1GB & 5GB File Size Architecture**:
  - Aligned with official Blackmagic Disk Speed Test specifications by standardizing exclusively on **1GB and 5GB** benchmarks.
  - Completely purged legacy 16GB benchmark definitions from all registries and backend schemas, automatically mapping any prior 16GB results/scores to 5GB.
- **Metric Checklist & Parser Pruning**:
  - Eradicated all junk/temporary parser metrics (such as `start`, `100209`, `blackmagic_raw`, `prores_422_hq`, `ntscpal`, `1080_hd`, `2160_4k`) from comparison chart metric checklists, OCR review screens, and the SSD database.
  - Re-engineered backend metric aggregation (`get_project_results_grouped` and `reprocess_result`) to strictly enforce defined benchmark metrics, preventing spurious OCR artifacts from entering comparison datasets.
- **Automatic Speed-Based Disambiguation**:
  - For Blackmagic screenshot pairs where filenames do not explicitly declare 1GB vs 5GB, the engine automatically compares combined throughput (`write_speed + read_speed`); the faster run is reliably classified as 1GB and the slower run as 5GB according to physical drive caching dynamics.
- **Dynamic Subtitle Metric Units**:
  - Enhanced comparison chart subtitles to automatically incorporate metric units (e.g. `HIGHER IS BETTER (MB/s)`) for standalone multi-metric benchmarks.

---

## [2.6.0] - 2026-09-08
### Blackmagic Recognition, Model Aliasing, Form Factor Isolation, Smart Bar Positioning & OCR Audit
- **Blackmagic Disk Speed Test Recognition & Profiles**:
  - Added dedicated neural OCR parsers and benchmark definitions for **Blackmagic 1GB, 5GB, and 16GB** disk speed test screenshots.
  - Automatically extracts sequential Write and Read speeds in MB/s with high precision and tolerance for dark/gradient speedometer dials.
  - Fully integrated into the SSD Master Database schema, custom benchmark profile creation, and comparison chart metric groups.
- **Model Renaming & Screenshot Alias Reference System**:
  - Reviewers can rename any SSD model directly in the SSD Database or laptop configuration to any desired publication display name (e.g. renaming an internal code or folder name to an official retail title).
  - The system records persistent folder linkages (`source_folder` and `aliases`), dynamically mapping all screenshots within that folder across all relevant datasets, graphs, and future scans without requiring disk file renaming.
- **Form Factor Isolation & Filtering**:
  - Strict classification and segregation between **Internal SSDs** (M.2 NVMe, 2.5" SATA) and **External SSDs** (USB / Portable drives).
  - Automatically detects form factors from model nomenclature (e.g. SC810, T7, Extreme) and enforces form factor isolation so external drives are never mixed into internal drive comparison checklists and vice-versa.
- **Smart Bar Value Positioning & Narrow-Bar Adaptive Placement**:
  - Added **Smart** bar value positioning: automatically sets score placement to `inside` when total entries/products > 5, and `outside` when ≤ 5.
  - **Adaptive Small-Bar Detection**: when inside positioning is active, values on very short or narrow bars (e.g. `0.61` or `97.04`) automatically flip to `position: "right"` (outside) in theme text color, completely eliminating clipping by the y-axis / product labels.
- **Open Sans Condensed Typography**:
  - Bundled and integrated local `OpenSansCondensed-Light.ttf` and `OpenSansCondensed-Bold.ttf` font assets.
  - Graph headers and subtitles styled with Open Sans Condensed typography for crisp, editorial-grade publication graphics.
- **OCR Verification & Audit Review Overhaul**:
  - Fixed OCR Review verification flow: clicking "✓ Accept Result" now immediately sets `overall_confidence = 1.0` (100%) and all metric confidences to `1.0`.
  - Automatically synchronizes accepted/verified benchmark metrics into the SSD Database.
  - Added status filter tabs (**All**, **Review**, **Verified**, **Ignored**) to quickly triage screenshots.
  - Added **`✓ Verified (100% Conf)`** badges, **`Revert`** action support, and real-time toast notifications.
- **Resilient Background Import Continuity**:
  - Centralized folder scanning state in a global store (`useImportStore.ts`) so navigating between tabs during large batch imports never loses progress or resets the scanned file queue.

---

## [2.5.0] - 2026-09-08
### Dual-Card Clean Layout, Multi-Product Highlighting & Color Gradient Presets
- **Dual-Card Comparison Architecture**:
  - Re-architected Comparison Charts to decouple `Included Configurations` and `Product Highlighting` into a dedicated, persistent top card.
  - The lower card now houses 3 clean, focused tabs (`Data`, `Style`, `Branding`), allowing reviewers to select products and configure visual highlights while simultaneously seeing style or branding adjustments.
- **Multi-Product Highlighting & Visual Contrast**:
  - Highlight single or multiple products to visually distinguish reviewed devices from baseline test bench hardware.
  - Supports 6 distinct gradient presets: **Hardware Unboxed Orange**, **TechTube Crimson Red**, **Sapphire Cyan**, **Emerald Green**, **Goldenrod Amber**, and **Purple Reign**.
  - Includes **Full-Width Row Backdrop Shading** and **Crisp Dividing Lines** (top/bottom borders) for unmistakable visual separation on busy multi-bar charts.
  - Configurable **Reference Line** (e.g. 60 FPS Target or 100% Baseline) with custom numeric values and dashed line styling.
- **Interactive Color Gradient Presets Dropdown & Direction Switch**:
  - Product highlight dropdown mirrors the primary Style gradient picker with rich multi-color gradient preview bars.
  - Added 1-click **`[⇄ Switch Colors]`** button to easily invert gradient start and end tones.
  - Interactive color swatches for granular primary/secondary hex color picking.
- **100% Local Storage State Persistence**:
  - Selected configurations and highlight settings (`highlightOptions`, custom products, color presets, dividers, and reference values) are stored in `localStorage` and automatically restored across app reloads and benchmark dataset changes.

---

## [2.4.0] - 2026-09-08
### Benchmark Metric Sub-Grouping, Split Comparison Charts & Multi-Metric Batch Export
- **Intelligent Benchmark Metric Sub-Grouping**:
  - Automatically breaks multi-metric benchmarks into distinct, uncluttered sub-charts to avoid data crowding and scale mismatch.
  - **CrystalDiskMark (1GB & 16GB)**: Split into **Sequential** (`Seq Read`, `Seq Write` in MB/s) and **Random 4K** (`RND 4K Read`, `RND 4K Write` in MB/s).
  - **AS SSD Benchmark (1GB & 10GB)**: Split into **Sequential** (MB/s), **4K Read & Write** (MB/s), **4K-64Thrd** (MB/s), and **Access Time** (`Acc. Time Read`, `Acc. Time Write` in milliseconds).
  - **AS SSD Copy Benchmark**: Split into **Copy Speed** (`ISO Speed`, `Program Speed`, `Game Speed` in MB/s) and **Copy Duration** (`ISO Duration`, `Program Duration`, `Game Duration` in seconds).
  - **OCCT Benchmark** (CPU/Laptop): Split into **Multi-Thread** (AVX & SSE) and **Single-Thread** (AVX & SSE).
  - **3DMark Storage & PCMark 10**: Split into **Score & Bandwidth** vs **Access Time** (µs).
- **Physical Unit & Betterment Direction Separation**:
  - Completely separates speed (MB/s) from time/duration (ms, s, µs) so incompatible metrics never share the same chart axis.
  - Dynamically flips subtitle optimization direction: `HIGHER IS BETTER` for throughput/score vs `LOWER IS BETTER` for access times and copy durations.
- **Interactive Quick-Switch Sub-Group Pills**:
  - Horizontal sub-view switcher pills positioned directly above the chart canvas for instant 1-click toggling between metric groups.
  - Also selectable directly from the Benchmark Dataset dropdown with nested indent hierarchy (`↳ CrystalDiskMark - Sequential`).
- **Enhanced Multi-Metric Batch Export**:
  - Added `[✓] Split Multi-Metric Charts` option to the Batch Export modal.
  - When enabled, batch export automatically produces individual, presentation-ready PNG charts for every sub-group with proper titles and units.

---

## [2.3.0] - 2026-09-08
### Persistent SSD Master Database, Inline Table Editing & Multi-SSD Comparison
- **Dedicated Persistent SSD Database**:
  - Centralized storage repository (`SSDModel` and `SSDBenchmarkScore`) that accumulates SSD models permanently across sessions.
  - Reviewers can add new SSD models incrementally without reloading previous SSD review folders.
- **Spreadsheet-Style Interactive Table with Inline Editing**:
  - Dedicated **SSD Database** tab on the navigation sidebar with category filtering (`All`, `CrystalDiskMark`, `AS SSD`, `AS SSD Copy`, `3DMark & PCMark Storage`).
  - Direct **click-to-edit** inline cells: Click any score cell to enter an updated number and press Enter/blur to save instantly, complete with an emerald flash confirmation.
  - Quick manual entry via `+ Add SSD Model` dialog.
  - Single-click deletion to remove models from the database.
- **Comprehensive CSV Export & Import**:
  - `Export CSV`: 1-click download of the complete SSD database in standard tabular format matching reviewer masterfiles.
  - `Import CSV`: 1-click upload to batch-import or restore SSD models and benchmark metrics directly from CSV.
- **Multi-SSD Comparison Chart Integration**:
  - Comparison Charts now features a top Data Source selector: `Review Configurations` vs `SSD Master Database`.
  - In SSD Master Database mode, each horizontal/vertical bar represents an SSD Model across all tested benchmarks.
  - Full support for setting any SSD as the 100% relative baseline, custom color palettes, Excel presets, font sizing, and 16:9 / 9:16 high-res exports.
- **Direct Folder Ingestion**:
  - `Scan SSD Folder...` native Windows folder picker to scan single or multi-SSD review folders and automatically upsert extracted OCR scores into the database.
- **Comprehensive SSD Benchmark Recognition**:
  - Added parsers and definitions for CrystalDiskMark (1GB & 16GB), AS SSD Benchmark (1GB & 10GB), AS SSD Copy Benchmark (Speed & Duration), 3DMark Storage Benchmark, and PCMark 10 Storage (Data Drive & Quick System Drive).
  - Automated noise filtering bypassing AS SSD compression graphs, HWInfo screenshots, and thermal logs.

---

## [2.2.0] - 2026-09-07
### Zero-Click Score Preload & Seamless Project Switching
- **Automatic Project Creation on Ingestion**: If all projects are deleted or no project is active, selecting a review folder automatically creates the project from the folder/product name and activates it immediately.
- **Zero-Click Auto-Preload**: Added an "Auto-preload charts (extract immediately)" setting (enabled by default). Selecting a review folder via the native folder picker or typing a path immediately previews and kicks off OCR score extraction in the background without requiring a manual click on "Extract Scores".
- **Live Background Progress in Comparison Charts**: If a reviewer opens the Comparison Charts tab while an extraction is running, the screen displays a live progress bar (`Extracting Scores: X of Y screenshots...`) with the currently analyzed file. Once extraction completes, the comparison graphs automatically render without any user refresh.
- **1-Click Auto-Load in Comparison Charts**: Added an "Auto-Load Benchmark Folder & Plot Charts" button directly on the Comparison Builder empty state.
- **100% Branding & Style Persistence Verification**: Verified and enforced that publication logos (URL, position, 16:9/9:16 offsets and sizes), themes (light/dark), Excel gradient presets, custom bar colors, font sliders, margin sliders, and bar value positions remain completely persistent across project switching and app reboots.
- **App Header Version Badge Reflection**: Header badge in Navbar now explicitly displays Offline v2.2.0 with emerald styling, matching the backend and GitHub repository versioning.
- **Dedicated In-App Changelogs Navigation Tab**: Added a dedicated Changelogs tab directly after Settings in the sidebar navigation. Allows reviewers to browse all 22 milestones, search changes, view visual timeline cards, read raw markdown, and copy release notes.
- **Dynamic /api/changelog Backend Endpoint**: Added FastAPI endpoint that dynamically reads and returns CHANGELOG.md from the repository root.

---

## [2.1.0] - 2026-09-07
### Database Independence, Data File Backups & Model Tracking
- **Model & Category Tracking in CSV Exports**: Exported CSV files from *Benchmark Results & Grouping* now include `Product (Model)` and `Category` as the first two columns (`Product,Category,Benchmark,Configuration,Metric,Score,Unit,Source`).
- **Export JSON Database Backup**: Added 1-click JSON snapshot download containing all project specs, test configurations, benchmark definitions, and scores.
- **Direct Data File Import (No Screenshots Required)**: Added a direct CSV/JSON file ingestion mode in *Import Benchmark Data*, allowing reviewers to import benchmark tables from previous reviews or external test benches without screenshots.
- **Self-Contained SQLite Database**: Decoupled projects from original screenshot folders, allowing full transferability between machines.

---

## [2.0.0] - 2026-09-07
### Session Continuity & Resume on App Reopen
- **Navigation State Persistence**: Reopening the application automatically resumes on the exact tab where the reviewer left off (`compare`, `results`, `ocr_review`, `profiles`, `import`, `projects`, etc.) via `gp_active_nav_tab_v1`.
- **Active Project Persistence**: Remembers the last active project via `gp_active_project_id_v1`.
- **Active Comparison Chart Persistence**: Remembers the active benchmark dataset and relative summary baseline across app reboots.

---

## [1.9.0] - 2026-09-07
### Hardware Component Classification & Multi-Product Comparison
- **Expanded Hardware Support**: Added support for Laptops, Desktops, CPUs, GPUs, Motherboards, SSDs, and RAM.
- **Intelligent Category-Prioritized Sorting**: Benchmark dropdown automatically reorders and prioritizes benchmarks relevant to the tested component (e.g. 3DMark and Superposition for GPUs; Cinebench, Geekbench, Blender, and Octane for CPUs; PCMark for Laptops).
- **Component Classification Badges**: Visual badges for hardware categories across Projects, Import, and Comparison Charts.
- **Category Tag in Exports**: Option to include hardware classification tag in batch export filenames.

---

## [1.8.0] - 2026-09-07
### Native Windows Folder Picker Popup
- **Native OS Dialog Integration**: Replaced manual path pasting with an interactive Windows folder picker dialog (`POST /api/scanner/browse-folder` via `folder_picker.py`).
- **Zero-Click Ingestion Flow**: Selecting a folder automatically detects the product name, classifies the component, and scans the tree.

---

## [1.7.0] - 2026-09-07
### Overall Performance Relative Summary Engine
- **Normalized Relative Summary Chart**: Added overall performance summary graph calculating percentage performance relative to any selectable baseline configuration (e.g. `Standard Mode = 100%`).
- **Direction-Aware Normalization**: Automatically inverts "Lower is Better" benchmarks so higher percentages always represent faster execution.
- **Benchmark Selection Filters**: Option to include or exclude specific benchmarks from the overall summary calculation.

---

## [1.6.0] - 2026-09-07
### Adaptive Excel-Style Gradient Palettes
- **10 Curated Multi-Tone Palettes**: Added Excel-style gradient presets (Emerald Teal, Violet Ruby, Sunset Amber, Ocean Blue, Crimson Fire, etc.).
- **Dynamic Metric Scaling**: Palettes dynamically scale and sample across single-metric and multi-metric benchmarks.
- **Visual Dropdown Selector**: Custom dropdown with real-time linear-gradient color previews.

---

## [1.5.0] - 2026-09-07
### Multi-Aspect Ratio & Publication Export Engine
- **Dual Aspect Ratios**: Added full 16:9 (Desktop/YouTube) and 9:16 (Shorts/Reels/TikTok/Mobile) canvas rendering.
- **Independent Logo Alignment**: Dedicated width and offset controls for both 16:9 and 9:16 aspect ratios.
- **Multi-Resolution Rendering**: Export in 720p HD, 1080p Full HD, or 4K UHD.
- **Modern Formats**: Support for PNG, JPG, and WebP.
- **Batch Export Modes**: 1-click batch export as individual files or packaged ZIP archive.

---

## [1.4.0] - 2026-09-07
### Interactive In-Place Graph Customization
- **In-Place Score Quick Editor**: Direct editable table under the chart allows instant score adjustments with real-time graph re-rendering.
- **Live Configuration Renaming**: Rename any power profile directly (e.g. `whisper` -> `Whisper Mode (15W)`).
- **Live Metric Renaming**: Custom display labels for any metric on the chart and legend.
- **Custom Color Picker**: Color swatches for individual bar colors.

---

## [1.3.0] - 2026-09-07
### Publication Visual Fidelity & Kingston Fury Reference Alignment
- **2-Row Clean Label Wrapping**: Automatic 2-row wrapping for long power profile or product names using `\n` or ` - ` delimiters.
- **Fixed Grid Margins**: Configurable `gridLeftMargin` (180px–340px) preventing bars from shrinking into narrow stubs.
- **Inside/Outside Value Labels**: Toggle between inside bars (matching Kingston Fury reference) and outside bars with clean contrast.
- **Label Font Size Slider**: Real-time slider (9px–14px).
- **Gadget Pilipinas Branding**: Top-right publication logo with dual geometric ribbons and corner accents.

---

## [1.2.0] - 2026-09-07
### Spatial OCR Text Clustering & Typo Tolerance
- **Cross-Folder Clustering Engine**: Jaccard similarity clustering on OCR vocabulary and headers groups benchmarks across power profile folders regardless of filenames.
- **Typo Resiliency**: Successfully groups misspelled files (e.g. `blener.png` correctly recognized as Blender Benchmark).

---

## [1.1.0] - 2026-09-07
### Benchmark Suite Expansion & Metric Polarities
- **11 Dedicated Benchmark Parsers**:
  1. Blender Benchmark (Monster, Junkshop, Classroom)
  2. Cinebench (R23, 2024, 2026)
  3. Corona 10 (rays/s)
  4. Geekbench 6 (Single-Core & Multi-Core)
  5. Geekbench AI (Single, Half, Quantized)
  6. OCCT Benchmark (SSE & AVX)
  7. Octane 2.0 (Single & Multi)
  8. PCMark 10 Extended (Overall, Essentials, Productivity, Digital, Gaming)
  9. Super PI Mod (seconds - Lower is Better)
  10. V-Ray Benchmark (vsamples)
  11. wPrime Benchmark (1024M seconds - Lower is Better)
  12. 3DMark Time Spy (Graphics, CPU, Overall)
  13. Generic OCR Fallback
- **Directional Subtitles**: Dynamic subtitle automatically detects whether plotted metrics are `HIGHER IS BETTER` or `LOWER IS BETTER`.

---

## [1.0.0] - 2026-09-07
### Initial MVP Release
- Local Python FastAPI backend on `http://127.0.0.1:8742`.
- Offline RapidOCR (PaddleOCR v4 ONNX models) integration.
- Initial parsers for Geekbench 6 and Cinebench.
- React 18 + TypeScript + Vite + Tailwind CSS frontend.
- Horizontal Apache ECharts bar charts.
- Formatted Table Designer with Markdown copy and CSV export.
