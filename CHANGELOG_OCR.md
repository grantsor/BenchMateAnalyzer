# Benchmark OCR Analyzer - Dedicated Changelog

All notable changes, milestones, and architectural improvements to the **Benchmark OCR Analyzer** (Vision-Based AI Benchmark Recognition & Comparison Chart Engine) are documented here.

This application is also bundled as the primary vision engine within the unified **BenchMate Analyzer** suite (see [CHANGELOG.md](CHANGELOG.md)).

---

## [2.17.0] - 2026-09-11
### PCMark 10 Storage Disambiguation, Unified 3DMark & PCMark Storage Suite, Split Sub-Charts & Smart Metric Defaulting

- **PCMark 10 Storage Disambiguation**:
  - Solved classifier collision where PCMark 10 Quick System Drive and Data Drive screenshots were erroneously tagged as generic PCMark 10 (Systems).
  - Priority disambiguation in filename and OCR header analysis now accurately routes screenshots to their respective storage parsers with 100% metric extraction.
- **3DMark Storage Access Time & Score Parsing**:
  - Enhanced `ThreeDMarkStorageParser` to catch compact headers without spaces (`Averageaccesstime`) and `Your score` headers.
  - Integrated spatial row alignment so Average Access Time (µs) and Score (pts) are consistently extracted across all hardware runs.
- **Unified "3DMark and PCMark Storage Benchmark" Suite**:
  - Synthesized a consolidated storage dataset merging 3DMark Storage, PCMark 10 Quick System Drive, and PCMark 10 Data Drive into a unified cross-benchmark comparison, mirroring the architecture of Arithmetic Benchmarks.
- **Clean Split Sub-Charts for Bandwidth & Access Time**:
  - Separated Score (pts), Bandwidth (MB/s), and Access Time (µs) into dedicated sub-chart views for both individual storage benchmarks and the unified storage suite, eliminating chart scale distortion between points, transfer rates, and response latency.
- **OCR Review Needs-Review Confidence Sorting**:
  - Items in the "Needs Review" tab are now sorted in ascending order of confidence by default, placing the lowest confidence screenshots at the very top for rapid reviewer auditing.
- **Alphabetical Benchmark Assignment**:
  - Reassignment dropdowns in OCR Review now sort all available benchmark profiles alphabetically from A-Z by default for effortless navigation.
- **Smart Metric Defaulting from Batch Export Checklist**:
  - When switching benchmarks in Comparison Charts, if the "All metrics combined" view is unchecked in the export checklist, the view automatically defaults to the first checked metric/sub-group rather than reverting to all combined.

---

## [2.16.0] - 2026-09-11
### Methodical 4-Step Review Workflow, OCCT CPU vs. Storage Separation & Real-Time OCR Reparsing

- **Methodical 4-Step Review Workflow**:
  - Established a clean, guided review pipeline: New Project -> Import & Scan -> OCR Review -> Comparison Charts.
  - Once import completes, the primary action directs users to inspect and verify all newly extracted data in OCR Review before visualizing charts.
- **Dynamic Workflow Stepper & Summary Bar**:
  - Added responsive workflow breadcrumbs and a bottom floating review summary bar with real-time verification status counts (verified, unassigned, needs review) and a 1-click "All Done Reviewing? Generate Comparison Charts" shortcut.
- **OCCT CPU vs. Storage Separation**:
  - Resolved parser collision where OCCT CPU multi-thread and single-thread SSE/AVX screenshots were mistakenly identified as OCCT Storage with 0 metrics.
  - OCCT CPU now reliably extracts all 4 metrics (Single-Thread SSE, Multi-Thread SSE, Single-Thread AVX, Multi-Thread AVX) via column-anchored coordinate analysis, ignoring status bar voltages and power metrics.
- **Instant OCR Review Reassignment & Reparsing**:
  - Fixed benchmark reassignment so switching benchmark profiles immediately recalculates scores through the target parser and refreshes metric values directly in the UI without requiring page reloads.
- **Universal Parser Routing & Multi-Variant Support**:
  - Registered supported benchmark IDs across Cinebench (R26, 2024, R23, R20), CrystalDiskMark (1GB, 16GB, etc.), AS SSD, Blackmagic, and 3DMark suites so reassigned screenshots always route to their specialized extractors.

---

## [2.15.0] - 2026-09-11
### Filename-Agnostic OCR Vision, No-Recompile Dynamic AI Benchmark Builder & Review Reassignment

- **Filename-Agnostic Visual OCR Detection**:
  - Recognizes benchmark screenshots (3DMark Speed Way, Steel Nomad, Time Spy, Fire Strike, Port Royal, Geekbench Compute & AI, Procyon AI Vision & Image Gen, Octane, Cinebench, SuperPI, wPrime) with 95–99% confidence directly from visual layout and text anchors, completely eliminating errors from generic Windows Snipping Tool timestamps (e.g. `Screenshot 2025-06-24...`).
- **No-Recompile Dynamic Benchmark Builder**:
  - Users can create, register, and calibrate brand new benchmarks on the fly directly inside the app.
  - Custom benchmark definitions save to local JSON schemas (`data/benchmarks/*.json`), instantly enabling OCR parsing, metric extraction, and comparison chart generation without requiring Python code changes or standalone app recompilation.
- **OCR Review Interactive Tagging & Reassignment**:
  - Unknown or misdetected screenshots in OCR Review can now be interactively reassigned to any benchmark via a dedicated dropdown with 1-click "Apply & Reparse", immediately recalculating and displaying updated metric scores.
- **Dedicated "Unknown" Filter Tab & Review Badges**:
  - Added an "Unknown (N)" quick filter tab and warning badges in OCR Review so users can immediately locate and tag unclassified screenshots.
- **Hardware Subsystem & Component Spec Classification**:
  - Automatically classifies benchmark test categories (GPU, CPU, Motherboard, RAM, SSD, Laptop) and extracts detailed hardware specs (e.g. RTX 5080 Laptop GPU, RX 9070 GRE, Ryzen 7 9800X3D, Ultra 9 275HX) from visual OCR text and paths.
- **Procyon AI & Multi-Variant Parser Calibration**:
  - Calibrated Procyon AI Image Generation (Stable Diffusion 1.5) to parse overall score (2003), UNET speed (32.40 it/s), and generation speed (3.119 s/image), Procyon AI Vision (941), and Geekbench 6 OpenCL (36164) and Vulkan (156936) with fuzzy OCR token resilience.
- **Hardware Acceleration & On-Device Inference Config**:
  - Added on-device NPU / GPU DirectML / CPU inference configuration in Settings with real-time hardware status and acceleration controls.

---

## [2.14.0] - 2026-09-10
### Unified Arithmetic Benchmark, Combined 3DMark Suite, Default Brand Logo & Process Safeguards

- **Unified "Arithmetic Benchmark" (SuperPI 32M + wPrime 1024M)**:
  - Combined SuperPI 32M and wPrime 1024M into a single unified dual-bar comparison chart.
  - Automatically converts SuperPI minutes/seconds to exact unrounded seconds (s) with full millisecond precision, tagged as `LOWER IS BETTER (s)`.
- **Combined "3DMark Suite - Speedway and Steel Nomad"**:
  - Merged 3DMark Speed Way and 3DMark Steel Nomad into a single dual-bar comparison chart displaying Graphics Test scores in FPS, tagged as `HIGHER IS BETTER (FPS)`.
- **Default Publication Logo Integration**:
  - Integrated high-resolution "Full Logo Horizontal Colored" (12500x4500, aspect 2.7778) as the default publication logo positioned top-right on all benchmark charts.
  - Added an `isCustomLogo` preference flag to preserve custom uploads, along with a 1-click `[Default]` button to instantly revert to the official logo.
- **Self-Contained Installer Logo Bundling**:
  - Bundled default logo assets directly into the standalone distribution package, eliminating any external dependency on local drive `N:`.
- **Process Auto-Attach & Port Conflict Recovery**:
  - If `Benchmark-Analyzer.exe` is launched while an instance is already active, it automatically detects the healthy server, brings up your browser, and cleanly exits without crashing.
  - If port 8742 is occupied by an orphaned zombie process, it automatically terminates the dead process to free the port.
- **In-App "Exit App" Shutdown**:
  - Added an Exit button (Power icon) in the top Navbar with confirmation modal to cleanly terminate the background server and release system resources without needing Task Manager.
- **Unextracted ZIP Warning**:
  - Native Windows dialog alerts users if the .exe is launched from inside a compressed zip preview, preventing broken temporary runs.
- **Stop & Restart Utility Scripts**:
  - Packaged `Stop-App.bat` and `Restart-App.bat` alongside the executable for 1-click troubleshooting.

---

## [2.13.0] - 2026-09-09
### Native Desktop Folder Picker Dialog & Clean Machine Reliability

- **Native Desktop Folder Picker**:
  - Resolved silent folder browse failures on clean/new Windows devices.
  - Added robust multi-tier folder picker engine using Windows PowerShell/Win32 FolderBrowserDialog with Tkinter fallback and strict timeout guards.
- **Import Path Validation**:
  - Added real-time path validation feedback and clear error reporting on the Import Benchmark Data screen.

---

## [2.12.0] - 2026-09-09
### Persistent SEO / Editorial File Naming Phrase Engine

- **SEO & Editorial Export Naming Phrase**:
  - Added persistent input field for appending phrases (e.g. 'Review', 'First Impressions', 'Unboxing') before benchmark names in exported filenames for WordPress and web SEO.
- **Clean Graph Separation**:
  - Strict isolation ensures the SEO phrase affects only exported filenames, leaving chart bar text clean (e.g. 'ASUS ExpertBook Ultra - Configuration').
- **Dedicated Exact Persistence**:
  - Stored in dedicated localStorage (`gp_export_naming_phrase_v1`). Whatever you type persists across benchmarks, project switches, and app restarts; leaving it blank keeps it blank.
- **Streamlined Export Card UX**:
  - Removed redundant notes and quick-add buttons for a clean, professional export card layout.

---

## [2.11.0] - 2026-09-09
### UI Dark Mode Themes, Benchmark Selector Redesign, Duplicate Project Detection & Startup Hardening

- **UI Dark Mode & Theme System**:
  - Implemented native pure dark mode (Obsidian / Charcoal) as default, high-contrast OLED pitch black, and legacy midnight navy with an instant 1-click header switcher and settings configuration swatches.
- **Results Benchmark Selector Redesign**:
  - Eliminated single-row horizontal scrolling on the Results page, replacing it with a responsive, multi-line wrapping pill grid sorted alphabetically (A-Z) to take full advantage of wide screens.
- **Duplicate Project Detection on Import**:
  - Automatically checks folder paths and project names against existing records when selecting or entering a folder. If an existing project matches, prompts with a clear modal to prevent accidental project duplication.
- **Smart Rescan Folder for Changes**:
  - Added a dedicated 'Rescan Folder for Changes' action on duplicate detection that incrementally ingests new or updated benchmark screenshots into the existing project without re-creating it or wiping existing data.
- **Startup Race Condition Resolution**:
  - Updated local launcher to actively poll backend health (`/api/health`) before opening the browser, and equipped project store with exponential retry backoff so project lists never appear empty on cold launch.
- **Project Page Duplicate Badging & 1-Click Cleanup**:
  - Review Projects page now flags duplicate folder paths with amber badges, highlights redundant duplicate entries, and offers 1-click 'Delete Duplicate' to safely clean up extra entries without affecting the primary project.
- **Direct 'Rescan' on Project Cards**:
  - Every project card with an associated root folder now includes a quick 'Rescan' button to immediately check for newly completed benchmark screenshots.
- **Database Cascade & Cleanup Hardening**:
  - Enhanced project deletion to explicitly purge all child configurations, source images, results, and metrics in SQLite, preventing orphaned data.

---

## [2.10.0] - 2026-09-09
### CrossMark Support, Full 3DMark Suite, Universal Typo Tolerance & Cinebench Score Fix

- **CrossMark Benchmark Support**:
  - Added complete definition, registry, and parser for BAPCo CrossMark, extracting Overall Score, Productivity, Creativity, and Responsiveness with sub-score chart grouping in the Comparison Builder.
- **Expanded 3DMark Test Suite**:
  - Implemented dedicated benchmark definitions and extraction logic for 3DMark Fire Strike, Speed Way, and Steel Nomad alongside Time Spy, supporting both Overall and Component score breakdowns.
- **Universal Typo & Spelling Tolerance**:
  - Enhanced fuzzy matching across all benchmarks to intelligently recognize human typos in folder and file names (e.g. 'suoeropi' for SuperPI, 'ciner26' / 'cinerr26' for Cinebench, '3dm fs/sw/sn/ss').
- **Cinebench Single-Core Extraction Fix**:
  - Resolved multi-line row leakage in Cinebench 2026 where CPU (Single Core) previously duplicated the Multi Core score, ensuring accurate single-thread metrics across all power profiles.
- **Live Project Reprocessing**:
  - Added project re-evaluation endpoint and a 1-click 'Re-scan / Refresh' button in the Comparison Builder header to re-parse existing screenshots with the latest parsers without needing to recreate the project.
- **Monitoring Tool Guard**:
  - Excluded HWiNFO and system monitoring telemetry screenshots from false positive matches in benchmark parsers.

---

## [2.8.0] - 2026-09-08
### OCCT Storage & CPU Benchmark Disambiguation, Sequential/Random Chart Grouping & Full SSD Database Synchronization

- **Dedicated OCCT Storage Parser**:
  - Created a high-precision neural parser (`occt_storage`) specifically for OCCT Storage Benchmark screenshots, extracting Sequential Read/Write and Random Read/Write throughput in MB/s.
- **Robust Number Reconstruction**:
  - Implemented targeted subcrop OCR with contrast-inverting binarization fallback to reliably extract low-contrast light-on-dark digits without character drop or upside-down OCR confusion.
- **Intelligent Component Disambiguation**:
  - Differentiated OCCT Storage tests from OCCT CPU benchmarks (AVX/SSE) using contextual column anchors and test metric presence, completely preventing CPU benchmarks and storage benchmarks from misidentifying each other.
- **Sequential & Random Comparison Chart Sub-Groups**:
  - Configured dual sub-groups for OCCT Storage in the comparison chart builder: Subgroup 1 for Sequential Read & Write (MB/s) and Subgroup 2 for Random Read & Write (MB/s), presenting clean, uncluttered visual comparisons.
- **Complete SSD Database Integration & Migration**:
  - Integrated `occt_storage` into the master SSD database schema and automatic import synchronization. Migrated all legacy OCCT database scores to real MB/s throughput across both Internal and External SSD datasets.

---

## [2.7.0] - 2026-09-08
### Unified Blackmagic Speed Test Graphs, Strict 1GB/5GB Dual-Tier Architecture, Metric Checklist Pruning & Speed-Based Disambiguation

- **Unified Blackmagic Speed Test Graphs**:
  - Both Write Speed and Read Speed are now plotted side-by-side in 1 single comparison chart per file size test (matching CrystalDiskMark and AS SSD), eliminating redundant separate sub-group graphs.
- **Strict 1GB & 5GB File Size Architecture**:
  - Standardized exclusively on official 1GB and 5GB benchmarks for Blackmagic Disk Speed Test. Completely purged legacy 16GB definitions and automatically mapped any existing 16GB entries to 5GB.
- **Metric Checklist & Parser Pruning**:
  - Eradicated all junk/temporary parser metrics from comparison chart metric selection checklists, OCR review, and SSD database records, ensuring only true benchmark metrics (Write Speed & Read Speed) appear.
- **Automatic Speed-Based Disambiguation**:
  - For Blackmagic screenshot pairs where filenames do not explicitly declare 1GB vs 5GB, the engine automatically compares combined throughput; the faster run is reliably classified as 1GB and the slower run as 5GB.
- **Subtitle Dynamic Units**:
  - Enhanced comparison chart subtitles to automatically incorporate metric units (e.g. 'HIGHER IS BETTER (MB/s)') for standalone multi-metric benchmarks.

---

## [2.6.0] - 2026-09-08
### Blackmagic Recognition, Model Aliasing, Form Factor Isolation, Smart Bar Positioning & OCR Audit

- **Blackmagic Disk Speed Test Integration**:
  - Added dedicated neural OCR parsers and benchmark definitions for Blackmagic 1GB, 5GB, and 16GB disk speed test screenshots, fully integrated into comparison charts and SSD database scoring.
- **Model Renaming & Screenshot Alias Reference System**:
  - Reviewers can rename SSD models in the database and laptop configurations to any desired publication display name. The system binds aliases and original folder names, dynamically reflecting the custom name across all datasets, graphs, and future scans.
- **Form Factor Isolation & Filtering**:
  - Strict segregation between Internal SSDs (M.2 NVMe / SATA) and External SSDs (USB / Portable). Form-factor heuristics ensure external drives are never mixed into internal drive comparison checklists and vice-versa.
- **Smart Bar Value Positioning & Narrow Bar Adaptive Placement**:
  - Added 'Smart' value positioning that dynamically places scores inside bars when entries > 5 and outside when <= 5. Incorporates intelligent pixel-width collision detection so narrow or low-value bars automatically flip outside without label clipping.
- **Open Sans Condensed Typography**:
  - Bundled and embedded local OpenSansCondensed font family for graph headers and subtitles, delivering high-density editorial publication standards.
- **OCR Verification & Audit Review Overhaul**:
  - Fixed OCR Review verification flow — accepting results now sets confidence to 100%, updates metric status, auto-syncs scores to the SSD Database, introduces status filter tabs (All, Review, Verified, Ignored), adds revert capability, and provides real-time toast feedback.
- **Resilient Background Import Continuity**:
  - Centralized folder scanning state in a global store so navigating between tabs during large batch imports never loses progress or resets the scanned file queue.

---

## [2.5.0] - 2026-09-08
### Dual-Card Clean Layout, Product Highlighting & Color Gradient Presets

- **Dual-Card Architecture**:
  - Re-engineered Comparison Charts to decouple Included Configurations & Product Highlighting into an independent persistent top card. The lower card houses clean, dedicated tabs (Data, Style, Branding), allowing reviewers to adjust configurations and highlights while visually inspecting styling and branding changes.
- **Multi-Product Highlighting**:
  - Highlight single or multiple products with distinct gradient fills, full-width row backdrop shading, and crisp top/bottom row dividing lines.
- **Color Gradient Presets Dropdown**:
  - Integrated rich gradient preview dropdown matching the Style tab, enabling real-time gradient bar previews and 1-click `[⇄ Switch Colors]` button for flipping gradient start/end orientations.
- **Custom Reference Target Line**:
  - Added optional configurable reference line (e.g. 60 FPS Target or 100% Baseline) with custom numeric value and distinct dash styling.
- **Complete Configuration Persistence**:
  - Enabled 100% persistent local storage memory for selected configuration IDs, custom highlight product selections, color presets, and divider states across reloads.

---

## [2.4.0] - 2026-09-08
### Benchmark Metric Sub-Grouping, Split Comparison Charts & Multi-Metric Batch Export

- **Intelligent Metric Sub-Grouping**:
  - CrystalDiskMark split into Sequential and Random 4K; AS SSD Benchmark split into Sequential, 4K, 4K-64Thrd, and Access Time (ms); AS SSD Copy split into Speed (MB/s) and Duration (s); OCCT split into AVX and SSE workloads.
- **Physical Unit & Betterment Direction Separation**:
  - Speed (MB/s) and time/duration (ms, s, µs) are separated onto independent charts. Subtitle automatically flips between HIGHER IS BETTER and LOWER IS BETTER.
- **Batch Export Checklist Modal**:
  - Reviewers can selectively choose individual split sub-charts or all-metrics charts with Select All, Split Only, and Parent Only buttons.
- **Custom Export Presets Memory**:
  - Save, apply, and delete custom export presets with persistent memory across reloads.

---

## [2.3.0] - 2026-09-08
### Persistent SSD Master Database, Inline Table Editing & Multi-SSD Comparison

- **Persistent SSD Database**:
  - Centralized SQLite repository for SSD models and benchmark scores, eliminating the need to reload historical review folders when benchmarking a new SSD.
- **Spreadsheet-Style Inline Editing**:
  - Click-to-edit table with immediate backend persistence, emerald flash feedback, and category filtering.
- **Full CSV Export & Import**:
  - 1-click CSV download and upload matching reviewer master spreadsheet formats.
- **Multi-SSD Comparison Charts**:
  - Top data source switcher toggle between Review Configurations and SSD Master Database with relative baseline calculations.
- **Comprehensive SSD Benchmark Parsers**:
  - Added parsers for CrystalDiskMark, AS SSD Benchmark, AS SSD Copy, 3DMark Storage, and PCMark 10 Storage.

---

## [2.2.0] - 2026-09-07
### Zero-Click Score Preload & Seamless Project Switching

- **Automatic Project Creation on Ingestion**:
  - If all projects are deleted or no project is active, selecting a review folder automatically creates the project from the folder/product name and activates it immediately.
- **Zero-Click Auto-Preload**:
  - Added 'Auto-preload charts (extract immediately)' setting (enabled by default). Selecting a review folder via the native folder picker or typing a path immediately previews and kicks off OCR score extraction in the background without requiring a manual click on 'Extract Scores'.
- **Live Background Progress in Comparison Charts**:
  - If a reviewer opens the Comparison Charts tab while an extraction is running, the screen displays a live progress bar with the currently analyzed file. Once extraction completes, graphs automatically render without any user refresh.
- **1-Click Auto-Load in Comparison Charts**:
  - Added an 'Auto-Load Benchmark Folder & Plot Charts' button directly on the Comparison Builder empty state.
- **100% Branding & Style Persistence Verification**:
  - Verified and enforced that publication logos (URL, position, 16:9/9:16 offsets and sizes), themes (light/dark), Excel gradient presets, custom bar colors, font sliders, margin sliders, and bar value positions remain completely persistent across project switching and app reboots.

---

## [2.1.0] - 2026-09-07
### Database Independence, Data File Backups & Model Tracking

- **Model & Category Tracking in CSV Exports**:
  - Exported CSV files now include Product (Model) and Category as the first two columns (`Product,Category,Benchmark,Configuration,Metric,Score,Unit,Source`).
- **Export JSON Database Backup**:
  - Added 1-click JSON snapshot download containing all project specs, test configurations, benchmark definitions, and scores.
- **Direct Data File Import (No Screenshots Required)**:
  - Added direct CSV/JSON file ingestion mode in Import Benchmark Data, allowing reviewers to import benchmark tables from previous reviews or external test benches without screenshots.
- **Self-Contained SQLite Database**:
  - Decoupled projects from original screenshot folders, allowing full transferability between machines.

---

## [2.0.0] - 2026-09-07
### Session Continuity & Resume on App Reopen

- **Navigation State Persistence**:
  - Reopening the application automatically resumes on the exact tab where the reviewer left off (`compare`, `results`, `ocr_review`, `profiles`, `import`, `projects`, `settings`) via `gp_active_nav_tab_v1`.
- **Active Project Persistence**:
  - Remembers the last active project via `gp_active_project_id_v1` across application restarts.
- **Active Comparison Chart Persistence**:
  - Remembers the active benchmark dataset and relative summary baseline across app reboots.

---

## [1.9.0] - 2026-09-07
### Hardware Component Classification & Multi-Product Comparison

- **Expanded Hardware Support**:
  - Added support for Laptops, Desktops, CPUs, GPUs, Motherboards, SSDs, and RAM.
- **Intelligent Category-Prioritized Sorting**:
  - Benchmark dropdown automatically reorders and prioritizes benchmarks relevant to the tested component (e.g. 3DMark and Superposition for GPUs; Cinebench, Geekbench, Blender, and Octane for CPUs; PCMark for Laptops; CrystalDiskMark for SSDs).
- **Component Classification Badges**:
  - Visual badges for hardware categories across Projects, Import, and Comparison Charts.
- **Category Tag in Exports**:
  - Option to include hardware classification tag in batch export filenames (e.g. `[CPU] Ryzen 9 9950X - Cinebench.webp`).

---

## [1.8.0] - 2026-09-07
### Native Windows Folder Picker Popup

- **Native OS Dialog Integration**:
  - Replaced manual path pasting with an interactive Windows folder picker dialog (`POST /api/scanner/browse-folder` via `folder_picker.py`).
- **Zero-Click Ingestion Flow**:
  - Selecting a folder automatically detects the product name, classifies the component, and scans the tree.

---

## [1.7.0] - 2026-09-07
### Overall Performance Relative Summary Engine

- **Normalized Relative Summary Chart**:
  - Added overall performance summary graph calculating percentage performance relative to any selectable baseline configuration (e.g. Standard Mode = 100%).
- **Direction-Aware Normalization**:
  - Automatically inverts "Lower is Better" benchmarks so higher percentages always represent faster execution.
- **Benchmark Selection Filters**:
  - Option to include or exclude specific benchmarks from the overall summary calculation.

---

## [1.6.0] - 2026-09-07
### Adaptive Excel-Style Gradient Palettes

- **10 Curated Multi-Tone Palettes**:
  - Added Excel-style gradient presets (Emerald Teal, Violet Ruby, Sunset Amber, Ocean Blue, Crimson Fire, etc.).
- **Dynamic Metric Scaling**:
  - Palettes dynamically scale and sample across single-metric and multi-metric benchmarks.
- **Visual Dropdown Selector**:
  - Custom dropdown with real-time linear-gradient color previews.

---

## [1.5.0] - 2026-09-07
### Multi-Aspect Ratio & Publication Export Engine

- **Dual Aspect Ratios**:
  - Added full 16:9 (Desktop/YouTube) and 9:16 (Shorts/Reels/TikTok/Mobile) canvas rendering.
- **Independent Logo Alignment**:
  - Dedicated width and offset controls for both 16:9 and 9:16 aspect ratios.
- **Multi-Resolution Rendering**:
  - Export in 720p HD, 1080p Full HD, or 4K UHD.
- **Modern Formats**:
  - Support for PNG, JPG, and WebP.
- **Batch Export Modes**:
  - 1-click batch export as individual files or packaged ZIP archive.

---

## [1.4.0] - 2026-09-07
### Interactive In-Place Graph Customization

- **In-Place Score Quick Editor**:
  - Direct editable table under the chart allows instant score adjustments with real-time graph re-rendering.
- **Live Configuration Renaming**:
  - Rename any power profile directly (e.g. `whisper` -> `Whisper Mode (15W)`).
- **Live Metric Renaming**:
  - Custom display labels for any metric on the chart and legend.
- **Custom Color Picker**:
  - Color swatches for individual bar colors.

---

## [1.3.0] - 2026-09-07
### Publication Visual Fidelity & Kingston Fury Reference Alignment

- **2-Row Clean Label Wrapping**:
  - Automatic 2-row wrapping for long power profile or product names using newline or ' - ' delimiters.
- **Fixed Grid Margins**:
  - Configurable `gridLeftMargin` (180px–340px) preventing bars from shrinking into narrow stubs.
- **Inside/Outside Value Labels**:
  - Toggle between inside bars (matching Kingston Fury reference) and outside bars with clean contrast.
- **Label Font Size Slider**:
  - Real-time slider (9px–14px).
- **Gadget Pilipinas Branding**:
  - Top-right publication logo with dual geometric ribbons and corner accents.

---

## [1.2.0] - 2026-09-07
### Spatial OCR Text Clustering & Typo Tolerance

- **Cross-Folder Clustering Engine**:
  - Jaccard similarity clustering on OCR vocabulary and headers groups benchmarks across power profile folders regardless of filenames.
- **Typo Resiliency**:
  - Successfully groups misspelled files (e.g. `blener.png` correctly recognized as Blender Benchmark).

---

## [1.1.0] - 2026-09-07
### Benchmark Suite Expansion & Metric Polarities

- **12 Dedicated Parsers**:
  - Cinebench (R23, 2024, 2026), Geekbench 6, Geekbench AI, Blender, Corona 10, OCCT, Octane 2.0, PCMark 10, Super PI, V-Ray, wPrime, 3DMark Time Spy, plus Generic Fallback.
- **Directional Subtitles**:
  - Dynamic subtitle automatically detects whether plotted metrics are `HIGHER IS BETTER` or `LOWER IS BETTER`.

---

## [1.0.0] - 2026-09-07
### Initial MVP Release

- Local Python FastAPI backend on `http://127.0.0.1:8742`.
- Offline RapidOCR (PaddleOCR v4 ONNX models) integration.
- Initial parsers for Geekbench 6 and Cinebench.
- React 18 + TypeScript + Vite + Tailwind CSS frontend.
- Horizontal Apache ECharts bar charts.
- Formatted Table Designer with Markdown copy and CSV export.
