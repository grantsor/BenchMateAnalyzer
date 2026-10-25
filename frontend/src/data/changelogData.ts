export interface ReleaseItem {
  version: string;
  date: string;
  title: string;
  isLatest?: boolean;
  category: "Major" | "Feature" | "Enhancement" | "MVP";
  highlights: string[];
  tags: string[];
}

export const BENCHMATE_CHANGELOG: ReleaseItem[] = [
  {
    version: "v1.1.9",
    date: "2026-10-26",
    title: "Smooth OCR Verification, Drag-and-Drop Chart Ordering, Compact Profiles Auto-Save, Physical Preset Storage & CapFrameX Ingestion Stabilization",
    isLatest: true,
    category: "Feature",
    tags: [
      "Smooth OCR Review",
      "1-Click Ignore Result",
      "Drag & Drop Config Ordering",
      "Compact Profiles Auto-Save",
      "Live Chart Title Sync",
      "Accurate Export Checklist",
      "Physical JSON Presets",
      "CapFrameX Upload Fix",
      "Export File Naming Fix"
    ],
    highlights: [
      "Smooth OCR Review Flow: Eliminated page reloads and scroll resets when accepting or reparsing OCR benchmarks. The review list silently updates and focus smoothly moves to the next pending item.",
      "1-Click Ignore Result: Added prominent 'Ignore Result' and 'Restore' buttons in OCR Review to quickly exclude unwanted benchmark screenshots from charts.",
      "Drag-and-Drop Pill Ordering: Added drag handles to 'INCLUDED CONFIGURATIONS' in Comparison Chart Builder. Custom pill order directly controls bar order on generated charts.",
      "Compact Benchmark Profiles with Live Auto-Save: Redesigned profile cards to be ~60% more compact and added debounced auto-save on typing and blur with real-time sync to open charts.",
      "Accurate Batch Export Checklist & Physical Presets: Fixed count discrepancies in the batch export checklist and added physical JSON storage in backend/data/export_presets.json with Windows File Explorer reveal button.",
      "CapFrameX Ingestion Mode Auto-Detection & Path Retention: Fixed blank screens on capture folder uploads by auto-detecting laptop vs desktop session mode, and preserved full folder paths across re-scans.",
      "CapFrameX Export Naming Fix: Resolved argument order issue in buildChartFileName where format string ('webp') was prepended to exported file names instead of the custom review tag."
    ]
  },
  {
    version: "v1.1.8",
    date: "2026-10-17",
    title: "Multi-Bar Custom Charts, Editable Column Headers, Aspect Ratio Scale Stabilization & Single-Row Title Constraints",
    isLatest: false,
    category: "Feature",
    tags: [
      "Multi-Bar Custom Charts",
      "Editable Column Headers",
      "Aspect Ratio Scale Fix",
      "16:9 Single-Row Title",
      "9:16 Adaptive Title Wrap",
      "Header Spacing Parity",
      "Zero-Glitch Chart Switching"
    ],
    highlights: [
      "Multi-Bar Custom Charts with Editable Column Titles: Added full support in CapFrameX Custom Charts (Temps, Power Draw, Battery Life, etc.) to add, rename, and remove custom column bars per row. Column headers can now be named directly in-place (e.g. 'Peak Temp' and 'Idle Temp', or 'Peak Power' and 'Idle Wattage'), updating chart legend swatches, bar series, and hover tooltips immediately.",
      "Elimination of Aspect Ratio & Canvas Scaling Glitches: Fixed the bug where switching between custom charts (with many rows) and game charts (e.g. Assassin's Creed Mirage with 2 cards) rendered stretched boxes and empty white space. Container sizing is now isolated via absolute inset geometry and explicit ECharts instance resizing, completely eliminating the need to toggle 16:9 -> 9:16 -> 16:9 manually.",
      "Strict 1-Row Title Constraint (16:9 Landscape): Enforced strict single-line title rendering in 16:9 mode across BOTH OCR and CapFrameX applications with dynamic font downscaling and truncation overflow, ensuring benchmark titles never split onto two rows in landscape exports.",
      "Adaptive Single/Double-Row Wrapping (9:16 Vertical): In 9:16 mode across both apps, titles remain on a single centered row as long as they do not collide with the publication logo. Only when collision occurs will the title wrap to two rows, with vertical header spacing automatically balanced.",
      "Harmonized Header Spacing Parity: Aligned CapFrameX header vertical rhythm to match the OCR app, maintaining identical proportional gaps between title, subtitle, legend, and bar grid."
    ]
  },
  {
    version: "v1.1.7",
    date: "2026-10-17",
    title: "Dynamic Vertical Rhythm, Graph Font Restoration, Collapsible Sidebars & Global Theme Hub",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Dynamic Vertical Rhythm",
      "Balanced Header Spacing",
      "Matching Game Icons",
      "Chart Font Restoration",
      "Collapsible Sidebars",
      "Global Theme Switcher",
      "Zero-Lag Switching",
      "Export Chips Parity"
    ],
    highlights: [
      "Matching Game Icons in Navigation: Replaced generic gamepad icons in CapFrameX's collapsible sidebar with authentic, high-resolution official game desktop icons for over 30 top benchmark titles (Counter-Strike 2, Cyberpunk 2077, Black Myth: Wukong, DOTA 2, AC Mirage, Ghost of Tsushima, Hogwarts Legacy, Horizon Forbidden West, Returnal, Far Cry 6, etc.) bundled locally in public/game-icons/, plus custom icon URL support in Game Profiles.",
      "Dynamic Vertical Rhythm & Balanced Header Spacing: Resolved uneven spacing between main chart title, sub-header, and legend across single-line, 2-line, and 3-line layouts. Header-to-sub-header spacing is now mathematically balanced and matched with sub-header-to-legend spacing in both 16:9 and 9:16 aspect ratios across live previews and high-resolution exports.",
      "Chart Typography Isolation: Restored original Open Sans Condensed, Open Sans, and Inter typography for all generated benchmark charts and live interactive previews, while keeping modern Geist typography strictly for the application UI shell and tools.",
      "Sidebar Selection Accuracy: Fixed active highlight pill alignment with direct on-button styling, eliminating position drift and offset across all zoom levels and scroll states.",
      "Collapsible Sidebars: Implemented compact icon-only collapsible sidebars (toggling between w-64 expanded and w-16 collapsed with tooltips) across both OCR and CapFrameX analyzers.",
      "Global Theme Selector Placement: Relocated the theme switcher to the master suite header alongside Import Folder and Settings, with complete theme synchronization (Dark, Light, OLED, Midnight Navy) across all views.",
      "Zero-Lag Tab & Benchmark Switching: Eliminated window refresh animations and lag when toggling between Single Tests and Overall Summary or picking benchmarks by decoupling local selections from redundant dataset network refetches.",
      "OCR Export Chip Bar Parity: Replaced the bulky 12-column sizing grid with the sleek horizontal segmented chip bar from CapFrameX ([16:9 Wide | 9:16 Mobile], [720P | 1080P | 4K], [WEBP | PNG | JPG])."
    ]
  },  {
    version: "v1.1.8",
    date: "2026-10-17",
    title: "Multi-Bar Custom Charts, Editable Column Headers, Aspect Ratio Scale Stabilization & Single-Row Title Constraints",
    isLatest: false,
    category: "Feature",
    tags: [
      "Multi-Bar Custom Charts",
      "Editable Column Headers",
      "Aspect Ratio Scale Fix",
      "16:9 Single-Row Title",
      "9:16 Adaptive Title Wrap",
      "Header Spacing Parity"
    ],
    highlights: [
      "Multi-Bar Custom Charts with In-Place Editable Headers: Added full support in CapFrameX Custom Charts (Temps, Power Draw, Battery Life) to add, delete, and rename custom column bars per row (e.g. 'Peak Temp' and 'Idle Temp', or 'Peak Power' and 'Idle Wattage'), updating chart legend swatches, series, and hover tooltips immediately.",
      "Aspect Ratio Scale Stabilization & Glitch Elimination: Fixed canvas scaling and empty whitespace glitches when switching between custom charts and game charts via absolute inset geometry and explicit ECharts resizing.",
      "Strict 1-Row Title Constraint in 16:9: Enforced strict single-line title rendering in 16:9 landscape mode with dynamic font downscaling and truncation overflow.",
      "Adaptive Single/Double-Row Wrapping in 9:16: In 9:16 vertical mode, titles remain centered on one line as long as they don't collide with the logo, and wrap onto two rows with balanced spacing only when needed.",
      "Harmonized Header Spacing: Aligned CapFrameX header vertical rhythm to match the OCR app, maintaining identical proportional gaps between title, subtitle, legend, and bar grid."
    ]
  },
  {
    version: "v1.1.7",
    date: "2026-10-17",
    title: "Dynamic Vertical Rhythm, Graph Font Restoration, Collapsible Sidebar & Matching Game Icons",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Dynamic Vertical Rhythm",
      "Balanced Header Spacing",
      "Matching Game Icons",
      "Chart Font Restoration",
      "Collapsible Telemetry Sidebar"
    ],
    highlights: [
      "Dynamic Vertical Rhythm & Balanced Header Spacing: Replaced static lookup magic numbers with mathematical vertical rhythm across all chart export and canvas preview modes, ensuring title-to-sub-header and sub-header-to-legend spacing are perfectly symmetrical.",
      "Chart Typography Isolation: Restored original Open Sans Condensed and Open Sans typography across benchmark chart canvas and image exports while keeping modern Geist for UI controls.",
      "Collapsible Telemetry Sidebar & Matching Game Icons: Added collapse toggle to the game sidebar (w-72 <-> w-16 icon-only with tooltips) and replaced generic gamepad icons with authentic official desktop game icons for over 30 titles in public/game-icons/.",
      "Global Theme Hub Parity: Fully synchronized with the suite-wide theme hub in the master header."
    ]
  },

  {
    version: "v1.1.6",
    date: "2026-10-17",
    title: "BrewedOps UI Cleanliness Overhaul, Bundled Geist Fonts & Gliding Spring Pill Navigation",
    isLatest: false,
    category: "Feature",
    tags: [
      "BrewedOps Design System",
      "Geist & Geist Mono Fonts",
      "Gliding Spring Pill",
      "Decluttered Sidebar Groups",
      "Minimalist Top Header",
      "Obsidian Dark Palette",
      "KPI Dashboards Redesign",
      "Offline Font Bundling"
    ],
    highlights: [
      "Bundled Offline Geist & Geist Mono Typography: Integrated self-contained WOFF2 font assets for Geist (100..900) and Geist Mono, establishing modern micro-typography, tight tracking (-0.012em), and tabular numeral precision across all screens without external cloud requests.",
      "BrewedOps Gliding Active Spring Pill: Replaced cluttered per-item gradient buttons with a single shared translucent blue highlight pill that glides and stretches vertically with spring physics (cubic-bezier(0.22, 1, 0.36, 1)), delivering a fluid Linear/Vercel desktop feel.",
      "Decluttered Sidebar Hierarchy: Reorganized 11 flat navigation items into 3 clean, whisper-quiet micro-sections (Workflow, Data Explorer, Preferences) with uppercase 10px tracking and subtle version indicators.",
      "Minimalist Suite Shell & Header: Upgraded the top application header with a clean obsidian surface (#0a0e17), hairline borders (rgba(255,255,255,0.08)), and refined segmented app switcher pills.",
      "BrewedOps KPI Dashboard & Settings: Redesigned the primary Dashboard with large tabular figures, micro-labels, and interactive guided cards; refreshed Settings modal with clean obsidian panels and version parity."
    ]
  },
  {
    version: "v1.1.5",
    date: "2026-10-17",
    title: "Native Windows IFileOpenDialog Modern Folder Picker, Single-Cancel Fix & Asynchronous Concurrent Ingestion Engine",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Modern Windows Explorer Dialog",
      "IFileOpenDialog COM",
      "Single-Click Cancel Fix",
      "Asynchronous Ingestion",
      "Concurrent Directory Scan",
      "Bounded ThreadPool OCR",
      "Atomic SQLite Batching",
      "Smooth Monotonic Progress"
    ],
    highlights: [
      "Modern Windows File Explorer Folder Picker: Replaced archaic SHBrowseForFolderW Win32 treeview with native Windows IFileOpenDialog (FOS_PICKFOLDERS), giving the OCR app the exact modern File Explorer folder selection dialog with Quick Access, address bar, navigation tree, and search.",
      "Single-Click Cancel Resolution: Fixed multi-cancel fallthrough bug where cancelling a folder pick in the OCR app triggered 3 sequential popups (ctypes -> PowerShell -> Tkinter). Cancel actions now immediately and cleanly terminate folder browsing on the first click.",
      "Concurrent CapFrameX Ingestion Engine: Parallelized directory traversal and JSON parsing using ThreadPoolExecutor, achieving a >40% faster ingestion speed across capture batches with 100% deterministic run ordering.",
      "Bounded Concurrent RapidOCR Ingestion: Refactored OCR folder import and project reprocessing into a decoupled pipeline. OpenCV preprocessing and ONNX OCR inference execute concurrently across a bounded worker pool (min 4 cores), eliminating UI freezes and CPU thread thrashing.",
      "Zero-Contention SQLite Batch Persistence: Separated CPU-bound OCR processing from database commits, inserting extracted results in a single batched atomic transaction and completely preventing 'database is locked' errors.",
      "Smooth Monotonic Progress Polling: Updated OCR scanning progress reporting with atomic completion counters, ensuring the frontend progress bar advances smoothly without jitter or out-of-order jumps."
    ]
  },
  {
    version: "v1.1.4",
    date: "2026-10-08",
    title: "Offline TrueType Font Bundling (Open Sans Condensed, Open Sans, Inter) & Universal Monochromatic Blue Defaults",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Offline Font Bundling",
      "Open Sans Condensed",
      "Open Sans",
      "Inter",
      "Cross-Device Font Parity",
      "Monochromatic Blue Default",
      "Highlight Palette Alignment",
      "Preference Migration"
    ],
    highlights: [
      "Fully Bundled Offline Fonts: Packaged local TrueType font files (Inter-Regular, Inter-Medium, Inter-SemiBold, OpenSans-VariableFont, OpenSansCondensed-Light, OpenSansCondensed-Bold) directly inside the production build assets, eliminating reliance on external Google Fonts and ensuring pixel-identical typography across any offline Windows computer.",
      "Comprehensive @font-face Registrations: Defined full @font-face rules for Open Sans Condensed (weights 300..900), Open Sans (weights 300..800), and Inter (weights 400..900) in index.css, preventing Windows fallback fonts (Arial / Segoe UI) on secondary test machines.",
      "Universal Monochromatic Blue Palette: Established Monochromatic Blue (excel-blue) as the strict default palette across all benchmark graphs, bar color series, and highlight gradients in both Benchmark OCR Analyzer and CapFrameX Analyzer.",
      "Highlight Bar Blue Parity: Replaced all legacy amber (#f97316 / #ea580c / #f59e0b) fallbacks with vibrant blue gradients (#2563eb to #60a5fa) and enabled useHighlightBarColor by default in CapFrameX.",
      "Seamless Preference Auto-Migration: Added startup migration converting stale localStorage highlight presets from excel-amber to excel-blue while safely preserving users' starred hardware selections."
    ]
  },
  {
    version: "v1.1.3",
    date: "2026-09-30",
    title: "Zero-Failure Export Delivery Engine (Single & ZIP), Dynamic API Routing, Vite Dev Proxy & Safe File Write Fallback",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Export Delivery Engine",
      "Dynamic API Routing",
      "Vite Dev Proxy",
      "ZIP Archive Streaming",
      "Safe Write Fallback",
      "Warning Feedback",
      "Multi-App Parity"
    ],
    highlights: [
      "Dynamic Backend Export Routing: Resolved issue where chart and ZIP export requests failed silently during development or preview by introducing dynamic API host resolution (getApiBase) that always directs export calls to http://127.0.0.1:8742/api.",
      "Vite Dev Proxy Integration: Configured frontend/vite.config.ts with transparent /api proxying to the local backend, guaranteeing full export, scan, and run ingestion functionality in dev mode (port 5173).",
      "Safe File Write Fallback: Backend export engine (/api/export/save-file and /api/export/save-batch) now detects Windows file locks or PermissionErrors and automatically falls back to unique timestamped file names rather than failing.",
      "Active User Warning Feedback: Replaced silent returns on empty or unselected datasets in both OCR and CapFrameX with informative warning toasts, guiding reviewers on what data needs to be selected.",
      "Uvicorn Max Event Size Scaling: Expanded server max incomplete event size up to 100MB to flawlessly support large multi-game and multi-resolution batch ZIP packages.",
      "Full Portable Binary Synchronization: Recompiled BenchMate-Analyzer.exe and release ZIP distribution, updating all workspace locations with the latest binaries."
    ]
  },
  {
    version: "v1.1.2",
    date: "2026-09-28",
    title: "Backend Download Delivery System, 9:16 Title-to-Logo Collision Resolution & Export Reliability",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Backend Download Delivery",
      "WebView2 Export Fix",
      "9:16 Title Scaling",
      "Multi-Line Balanced Wrap",
      "Export Notification Toasts",
      "Show in Explorer",
      "ZIP Archive Delivery"
    ],
    highlights: [
      "Backend File & ZIP Delivery Engine: Added POST /api/export/save-file and POST /api/export/save-batch endpoints writing exports directly to the user's Windows Downloads directory and archiving locally in data/exports, completely bypassing WebView2 browser download blocking.",
      "Export Notification Toast with 'Show in Explorer': Sleek on-screen toast confirmation showing exported file name, size, and a 1-click button to reveal the file directly in Windows File Explorer.",
      "Native Desktop WebView2 Downloads Enabled: Configured PyWebView ALLOW_DOWNLOADS=True to ensure all file transfers and blob downloads execute without silent host cancellation.",
      "9:16 Vertical Title Collision Resolution: Engineered multi-line balanced word-wrapping and font scaling for long titles (e.g. SSD benchmarks like '3DMark and PCMark Storage Benchmark - Bandwidth (MB/s)'), preventing any overlap with top-right publication logos.",
      "Dynamic Export Canvas Offsets: Title width is strictly constrained to safe centered canvas geometry away from logos, with mathematically synchronized dynamic offsets (titleTop, legendTop, and gridTop) adapting seamlessly across 1-line, 2-line, and 3-line titles.",
      "Unified Exporter Alignment: Both Benchmark OCR Analyzer and CapFrameX Analyzer now use the unified download delivery system and shared title formatting logic for single chart exports and batch ZIP archives."
    ]
  },
  {
    version: "v1.1.1",
    date: "2026-09-26",
    title: "App-Relative Import Folder Shortcut, Chart Scaling Alignment, Dedicated Standalone Changelogs & Version Synchronization",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Open Import Folder",
      "Customizable Shortcuts",
      "Chart Scaling Parity",
      "Typography Alignment",
      "Settings Persistence",
      "Multi-App Changelogs",
      "Version Synchronization"
    ],
    highlights: [
      "App-Relative Import Folder Quick Launch: Added a dedicated shortcut (Ctrl+I) and top navbar action to open the folder picker or import directory corresponding to the currently active app (OCR screenshots folder or CapFrameX JSON captures) in Windows File Explorer.",
      "CapFrameX Chart Typography & Scaling Alignment: Completely overhauled CapFrameX chart rendering to match Benchmark OCR Analyzer aesthetic. Harmonized heading/subheading spacing, dynamic text scaling across both few-product and many-product datasets, and horizontal/vertical aspect ratio parity.",
      "Default Publication Branding Integration: Official high-resolution Gadget Pilipinas logo is now active by default across both OCR and CapFrameX export engines.",
      "Chart Defaults & Settings Retention: Fixed persistence of chart aspect ratios (16:9 vs 9:16), export resolution, format defaults, and custom auto-switch thresholds across app sessions.",
      "Dedicated Standalone Changelogs: Published comprehensive markdown release histories for each individual application (CHANGELOG_OCR.md, CHANGELOG_CAPFRAMEX.md) alongside the unified CHANGELOG.md.",
      "Full Codebase Version Marker Alignment: Synchronized Suite v1.1.1, CapFrameX v1.1.1, and OCR Analyzer v2.17.0 across backend API health endpoints, config files, package manifests, and UI badges."
    ]
  },
  {
    version: "v1.1.0",
    date: "2026-09-26",
    title: "Unified Multi-Theme Engine, 3-in-1 Changelog Hub, Customizable Keyboard Shortcuts, Smart Auto-Switch to 9:16 & Master Navbar Cleanup",
    isLatest: false,
    category: "Major",
    tags: [
      "Master Navbar Cleanup",
      "Unified Theme Engine",
      "Clean Light Mode",
      "Customizable Shortcuts",
      "Smart 9:16 Auto-Switch",
      "3-in-1 Changelog Hub",
      "Data Folder Quick-Launch"
    ],
    highlights: [
      "Master Top Navbar Cleanup: Stripped redundant 'Main App', 'Dedicated App', and 'Dual Engines Online' badges from the top bar for a minimalist, uncluttered dual-app switcher.",
      "Unified Multi-Theme Engine: Built global styling across both Benchmark OCR and CapFrameX with 4 distinct aesthetics: Clean Light (crisp white & slate), Obsidian Dark (charcoal, default), OLED Pure Black (100% black contrast), and Midnight Navy (deep blue slate).",
      "Fixed CapFrameX Light Mode: Solved broken theme toggling in CapFrameX Analyzer by introducing comprehensive [data-theme='light'] CSS variables and high-contrast text styling across all panels.",
      "Customizable Keyboard Shortcuts: Users can now record and customize hotkeys (Switch to OCR [Ctrl+1], Switch to CapFrameX [Ctrl+2], Quick Export [Ctrl+E], Batch Export [Ctrl+B], Open Settings [Ctrl+,], Toggle Theme [Ctrl+Shift+T]) with conflict prevention and input guard.",
      "Smart Auto-Switch to 9:16 Vertical Ratio: Added intelligent dataset detection that automatically shifts chart exports to 9:16 vertical orientation when product comparisons exceed 8 items (user-customizable threshold), while retaining 16:9 horizontal for fewer items.",
      "3-in-1 Central Changelog Hub: Added interactive version switchers inside Settings allowing reviewers to explore BenchMate Unified, Benchmark OCR, and CapFrameX release histories in one place with keyword search and 1-click Markdown copying.",
      "Data & Import Folder Quick Launch: Added 1-click 'Open Data Folder' (Ctrl+O) and app-relative 'Open Import Folder' (Ctrl+I) to open local review data, OCR screenshots, or CapFrameX JSON captures directly in Windows File Explorer."
    ]
  },
  {
    version: "v1.0.0",
    date: "2026-09-25",
    title: "Initial Launch of BenchMate Analyzer (Unified Benchmark OCR & CapFrameX Desktop Suite)",
    isLatest: false,
    category: "Major",
    tags: [
      "BenchMate Suite Launch",
      "Dual Concurrent Engines",
      "Zero-Interference Caching",
      "Standalone Packaging",
      "PyInstaller Bundle",
      "Desktop GUI"
    ],
    highlights: [
      "Unified BenchMate Architecture: Successfully merged Benchmark OCR Analyzer and CapFrameX Analyzer into a single cohesive desktop application powered by an offline FastAPI backend and pywebview GUI.",
      "Concurrent Dual Workspaces: Both OCR and CapFrameX workspaces remain mounted simultaneously in DOM with 100% independent memory, caching, and storage keys (gp_benchmark_* and cx_benchmark_*).",
      "Standalone Single-Executable Distribution: Packaged offline self-contained Windows executable (BenchMate-Analyzer.exe) and zip distribution (BenchMate-Analyzer-v1.0.0-Windows.zip) running on port 8742.",
      "Branding Logo Parity: Bundled official high-resolution Gadget Pilipinas colored logo (12500x4500, aspect 2.7778) across both engines for synchronized chart exports.",
      "Dual-Monitor Pop-Out Window: Added pop-out support allowing reviewers to run OCR on one display and CapFrameX on a secondary display simultaneously."
    ]
  }
];

export const CAPFRAMEX_CHANGELOG: ReleaseItem[] = [
  {
    version: "v1.1.9",
    date: "2026-10-26",
    title: "Telemetry Upload Mode Auto-Detection, Folder Path Persistence & Export Naming Fix",
    isLatest: true,
    category: "Enhancement",
    tags: [
      "Upload Mode Auto-Detection",
      "Folder Path Persistence",
      "Export Naming Fix",
      "Laptop Telemetry Parity"
    ],
    highlights: [
      "Automatic Telemetry Session Detection: Ingestion pipeline now automatically detects laptop vs desktop hardware runs and populates game and hardware lists immediately upon upload.",
      "Folder Path Scan Persistence: Preserved original directory paths across scan requests so clicking 'Scan' re-scans active capture directories reliably.",
      "Export File Naming Correction: Fixed parameter alignment in buildChartFileName where single and batch ZIP exports prepended 'webp' into the filename instead of the user's custom review tag."
    ]
  },
  {
    version: "v1.1.6",
    date: "2026-10-17",
    title: "BrewedOps Telemetry Sidebar, Keyboard Search & Obsidian Dark Palette",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "BrewedOps Design System",
      "Geist & Geist Mono Fonts",
      "Keyboard Search (/)",
      "Segmented Filter Tabs",
      "Obsidian Dark Theme",
      "Subtle Telemetry Cards"
    ],
    highlights: [
      "BrewedOps Telemetry Sidebar Overhaul: Redesigned the game selection sidebar with deep obsidian styling (#0a0e17), delicate hairline borders, and subdued telemetry entry cards.",
      "Inline Keyboard Shortcut Search: Added instantaneous search focus triggered via '/' keycap pill, filtering games and custom telemetry runs in real time.",
      "Segmented Filter Chips: Upgraded filter navigation (All, Games, Custom) with clean segmented chips and subtle active states.",
      "Geist & Geist Mono Typography: Integrated tabular figures for run counts and model statistics, eliminating layout shift during telemetry queries."
    ]
  },
  {
    version: "v1.1.5",
    date: "2026-10-17",
    title: "Concurrent Multi-Threaded Ingestion Engine & Unified Modern Windows Folder Picker",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Concurrent Directory Scan",
      "ThreadPoolExecutor",
      "Asynchronous Multipart Uploads",
      "IFileOpenDialog",
      "Single-Click Cancel"
    ],
    highlights: [
      "Concurrent Directory Scanning: Refactored CapFrameX directory scanning with ThreadPoolExecutor, cutting file parse time by >40% across large capture datasets while maintaining exact deterministic run sequence.",
      "Asynchronous Multipart Uploads: Parallelized JSON decoding and run ingestion via asyncio.gather and non-blocking worker threads for large browser file selections.",
      "Unified Modern Folder Dialog: Standardized backend folder picker with native Windows IFileOpenDialog, guaranteeing identical modern Explorer UI and instant single-click cancellation across shortcuts and dialogs."
    ]
  },
  {
    version: "v1.1.4",
    date: "2026-10-08",
    title: "Offline Font Portability & Monochromatic Blue Highlight Parity",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Offline Fonts",
      "Monochromatic Blue",
      "Highlight Tint Fix",
      "Preference Migration"
    ],
    highlights: [
      "Offline Typography Consistency: Embedded Open Sans, Open Sans Condensed, and Inter fonts into the native runtime bundle, ensuring uniform rendering on secondary devices without internet access.",
      "Monochromatic Blue Highlight Default: Enabled useHighlightBarColor by default and aligned highlight gradients to Monochromatic Blue (#2563eb / #60a5fa), eliminating residual amber/yellow 1% Low highlights (#b45309).",
      "Automatic Settings Migration: Seamlessly converts existing user preferences from amber presets to Monochromatic Blue."
    ]
  },
  {
    version: "v1.1.3",
    date: "2026-09-30",
    title: "Export Engine Parity, Guarded Tab Export Handling & User Warning Feedback",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Export Delivery Fix",
      "Dynamic API Routing",
      "Guarded Tab Export",
      "Tri-Res ZIP Delivery",
      "All Games ZIP Delivery"
    ],
    highlights: [
      "Direct Export Delivery Reliability: Standardized single chart exports, Tri-Resolution ZIPs, and All Games ZIPs through dynamic API routing ensuring files always download to Windows Downloads.",
      "Dataset Guard Warning Toasts: Eliminated silent failures when exporting with unselected or empty datasets by displaying clear, actionable warning notifications.",
      "Enhanced Exception Catching: Added comprehensive error toasts to Tri-Res and All Games batch exporters to guarantee full user feedback.",
      "Vite Dev Server Compatibility: Full proxying support enabling full export capabilities during frontend development."
    ]
  },
  {
    version: "v1.1.2",
    date: "2026-09-28",
    title: "Direct Downloads Delivery, Tri-Res & All-Games ZIP Export Reliability & Title Margin Safety",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Direct Export Delivery",
      "Tri-Res ZIP Export",
      "Batch Games Export",
      "9:16 Title Wrapping",
      "Show in Explorer"
    ],
    highlights: [
      "Direct Downloads Delivery: Single chart exports, Tri-Resolution ZIP archives, and Batch All-Games ZIP archives now save directly to Windows Downloads with toast feedback and 1-click 'Show in Explorer'.",
      "WebView2 ZIP Download Fix: Resolved issue where clicking export or ZIP download buttons in WebView2 produced no file due to blocked blob URLs and premature revokeObjectURL calls.",
      "9:16 Vertical Safe Title Layout: Applied safe centered title width and multi-line wrapping to prevent titles from colliding with publication logos.",
      "Dynamic Legend and Grid Spacing: Synchronized dynamic top offsets for titles, legends, and chart grids based on line count."
    ]
  },
  {
    version: "v1.1.1",
    date: "2026-09-26",
    title: "Chart Scaling & Typography Overhaul, Heading Spacing Parity, Default Gadget Pilipinas Branding & Import Folder Access",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Chart Scaling Fix",
      "Typography Parity",
      "Heading Spacing",
      "Gadget Pilipinas Branding",
      "Settings Retention",
      "Import Folder Shortcut"
    ],
    highlights: [
      "Chart Text Scaling Fix: Eliminated text scaling disparity on charts with few products. Subheadings, axis labels, and bar metrics now scale proportionally across both horizontal (16:9) and vertical (9:16) orientations.",
      "Heading & Subheading Spacing Parity: Unified heading margins and spacing to match Benchmark OCR Analyzer's editorial presentation standards.",
      "Default Gadget Pilipinas Branding: Pre-configured the high-resolution Gadget Pilipinas colored ribbon logo as the active default publication mark with matching top-right offsets.",
      "Export Defaults & Setting Retention: Fixed persistence of aspect ratio, resolution (720p/1080p/4K), and image format selections across reloads.",
      "1-Click Import Folder Explorer: Added clickable folder icon on the capture path input and support for the global Ctrl+I shortcut to immediately open the CapFrameX JSON capture folder in Windows File Explorer."
    ]
  },
  {
    version: "v1.1.0",
    date: "2026-09-25",
    title: "Tri-Resolution Comparative Engine, Laptop Power Profiles, GPU Hierarchy Ranking, Merged Dual-Bars & Metadata Editor",
    isLatest: false,
    category: "Major",
    tags: [
      "Tri-Resolution Engine",
      "Laptop Power Profiles",
      "GPU Hierarchy Sorting",
      "Merged Dual-Bars",
      "Metadata Editor",
      "Game Profiles",
      "Notepad Integration"
    ],
    highlights: [
      "Tri-Resolution Comparison (1080p, 1440p, 4K): Automatic multi-resolution comparison tabs with GPU and CPU comparative grouping and instant resolution switching.",
      "Laptop Mode & Power Profile Benchmarking: Automated grouping by Laptop Name and Power Profile (Whisper / Balanced / Turbo / Custom) with multi-resolution comparative tables.",
      "GPU Hierarchy Ranking: Visual drag-and-drop / rank-ordered hierarchy sorting that groups benchmark bars strictly by GPU generation and performance tiers.",
      "Merged Dual-Bar Chart Mode: Combines 1% Low FPS and Average FPS into an elegant single composite bar per GPU, displaying both numbers with hybrid collision-free label placement.",
      "CapFrameX Run Table & Metadata Editor: In-app editor to inspect ingested JSON runs, rename misidentified GPUs or CPUs, and reassign game titles across batches.",
      "Game Profiles JSON Editor: Edit game titles, resolutions, presets, and review notes with 1-click 'Open in Notepad' and hot-reloading."
    ]
  },
  {
    version: "v1.0.0",
    date: "2026-09-24",
    title: "Standalone CapFrameX Analyzer Launch",
    isLatest: false,
    category: "MVP",
    tags: ["CapFrameX Ingestion", "JSON Parsing", "Frametimes", "ECharts Visualization"],
    highlights: [
      "Automatic JSON Capture Ingestion: Scans folders of CapFrameX JSON capture files and computes Average FPS, 1% Low FPS, and 0.1% Low FPS.",
      "Interactive Chart Customizer: Real-time customization of bar colors, Excel gradient presets, typography, and publication logos.",
      "Batch Image Export: High-resolution PNG and WebP exports formatted for publication reviews."
    ]
  }
];

export const OCR_CHANGELOG: ReleaseItem[] = [
  {
    version: "v2.17.8",
    date: "2026-10-26",
    title: "Smooth Review Progression, 1-Click Ignore, Drag-and-Drop Pill Ordering & Compact Profiles Auto-Save",
    isLatest: true,
    category: "Enhancement",
    tags: [
      "Smooth Review Progression",
      "1-Click Ignore Result",
      "Drag-and-Drop Pill Ordering",
      "Compact Profiles Auto-Save",
      "Live Chart Title Sync",
      "Accurate Export Checklist"
    ],
    highlights: [
      "OCR Review Smooth Progression: Eliminated full-page reload and scroll resets upon accepting or reparsing OCR benchmarks. The view updates silently and moves focus smoothly to the next item.",
      "1-Click Ignore & Restore: Added prominent 'Ignore Result' and 'Restore' buttons to quickly exclude unwanted runs from charts.",
      "Drag-and-Drop Pill Ordering: Added drag handles to 'INCLUDED CONFIGURATIONS' in Comparison Chart Builder to customize bar order on charts.",
      "Compact Benchmark Profiles with Live Auto-Save: Cut profile card height by >60% and added debounced auto-save with immediate real-time chart title sync.",
      "Batch Export Checklist Count Accuracy & Physical Presets: Selected counter matches valid active targets, and presets are physically saved to backend/data/export_presets.json with Explorer folder reveal."
    ]
  },  {
    version: "v2.17.7",
    date: "2026-10-17",
    title: "16:9 Single-Row Title Enforcement, 9:16 Adaptive Collision Wrapping & Canvas Scaling Stabilization",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "16:9 Single-Row Title",
      "9:16 Adaptive Wrap",
      "Canvas Scaling Fix",
      "Aspect Ratio Resizing",
      "Vertical Rhythm Parity"
    ],
    highlights: [
      "Strict 1-Row Title Constraint in 16:9 Landscape: Main benchmark titles across all OCR benchmark suites are strictly constrained to never wrap onto more than 1 row in 16:9 mode, dynamically downscaling and truncating text before the logo boundary.",
      "Adaptive Single/Double-Row Wrapping in 9:16 Vertical: In 9:16 vertical mode, benchmark titles remain centered on a single line as long as they do not collide with the publication logo. Titles wrap onto two rows ONLY if collision would occur, automatically re-balancing vertical spacing.",
      "Canvas Container Aspect Ratio Stabilization: Isolated the chart preview container with absolute inset positioning, keyed re-instantiation, and explicit ECharts .resize() triggers, preventing stale canvas dimensions on orientation changes."
    ]
  },
  {
    version: "v2.17.6",
    date: "2026-10-17",
    title: "Dynamic Vertical Rhythm, Graph Font Restoration, Collapsible Sidebar & Export Chip Parity",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Dynamic Vertical Rhythm",
      "Balanced Header Spacing",
      "Chart Font Restoration",
      "Collapsible Sidebar",
      "OCR Export Chip Bar",
      "Zero-Lag Tab Switching"
    ],
    highlights: [
      "Dynamic Vertical Rhythm & Balanced Header Spacing: Replaced static lookup magic numbers with mathematical vertical rhythm across all chart export and canvas preview modes, matching title-to-sub-header gap with sub-header-to-legend gap.",
      "Chart Typography Isolation: Restored original Open Sans Condensed, Open Sans, and Inter typography for all generated benchmark charts and live interactive previews, while keeping modern Geist typography strictly for the application UI shell and tools.",
      "Collapsible Sidebar: Added toggleable collapsible sidebar (w-64 <-> w-16 icon-only with native tooltips) and fixed active highlight pill alignment.",
      "OCR Export Chip Bar Parity: Replaced bulky 12-column sizing grid with the sleek horizontal segmented chip bar ([16:9 Wide | 9:16 Mobile], [720P | 1080P | 4K], [WEBP | PNG | JPG]).",
      "Zero-Lag Tab & Benchmark Switching: Decoupled active selections from redundant background data refetching, eliminating page lag and refresh flickers when toggling tabs or picking benchmarks."
    ]
  },

  {
    version: "v2.17.5",
    date: "2026-10-17",
    title: "BrewedOps Clean Navigation Hierarchy, Gliding Spring Pill & KPI Stat Overhaul",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "BrewedOps Design System",
      "Geist & Geist Mono Fonts",
      "Gliding Spring Pill",
      "3-Section Sidebar Grouping",
      "Obsidian Theme Palette",
      "KPI Dashboard Overhaul"
    ],
    highlights: [
      "Gliding Active Spring Pill: Implemented the BrewedOps gliding active pill (sidebar-nav-glide) with spring physics (cubic-bezier(0.22, 1, 0.36, 1)), replacing heavy per-item gradient boxes.",
      "Decluttered 3-Section Navigation: Restructured the 11-item sidebar into three focused micro-sections (Workflow, Data Explorer, Preferences) with uppercase 10px tracking and subtle version indicators.",
      "Bundled Offline Geist Typography: Integrated self-contained WOFF2 font assets for Geist and Geist Mono for high-precision tabular numbers and micro-labels.",
      "Minimalist Top Header & Dashboard: Upgraded the application Navbar with clean obsidian backgrounds (#0a0e17), hairline borders, and redesigned Dashboard KPI cards."
    ]
  },
  {
    version: "v2.17.4",
    date: "2026-10-17",
    title: "Native Modern Windows Folder Picker (IFileOpenDialog), Single-Click Cancel Fix & Concurrent Bounded OCR Pipeline",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "IFileOpenDialog",
      "Single-Click Cancel Fix",
      "Modern Explorer Dialog",
      "Concurrent RapidOCR",
      "Bounded ThreadPool",
      "Atomic SQLite Commits",
      "Monotonic Progress"
    ],
    highlights: [
      "Modern Windows Explorer Dialog: Replaced archaic Win32 treeview popup with native COM IFileOpenDialog, matching the CapFrameX modern Explorer folder picker with Quick Access and address bar.",
      "Single-Click Cancel Fix: Resolved the issue where clicking Cancel required 3 consecutive cancel clicks due to unhandled fallthrough across dialog tiers. Cancel events now immediately close the picker.",
      "Concurrent Bounded OCR Pipeline: Decoupled image preprocessing and RapidOCR ONNX inference from database transactions, running extractions in parallel across a bounded worker pool (up to 4 CPU workers) without freezing the pywebview desktop UI.",
      "Atomic SQLite Persistence: Bundled all parsed benchmark results into a single atomic transaction on the async session, completely eliminating 'OperationalError: database is locked'.",
      "Smooth Monotonic Progress Updates: Progress bar increments sequentially and smoothly in real-time as workers finish."
    ]
  },
  {
    version: "v2.17.3",
    date: "2026-10-08",
    title: "Offline Font Bundling & Monochromatic Blue Highlight Alignment",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Offline Fonts",
      "Open Sans Condensed",
      "Inter",
      "Monochromatic Blue",
      "Highlight Palette Alignment"
    ],
    highlights: [
      "Local Font Asset Bundling: TrueType fonts for Open Sans Condensed, Open Sans, and Inter are now completely self-contained within the application package, guaranteeing identical font display across all workstations.",
      "Monochromatic Blue Default: Made excel-blue the standard default palette for bar colors, highlight gradients, row background shading, and dividing lines, replacing legacy amber fallbacks.",
      "Preference Auto-Migration: Migrated legacy localStorage visual preferences from amber to Monochromatic Blue on app startup."
    ]
  },
  {
    version: "v2.17.2",
    date: "2026-09-30",
    title: "Batch Individual & ZIP Export Delivery Hardening & Explorer Integration",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "Batch Export Fix",
      "Dynamic API Routing",
      "Safe Write Fallback",
      "Explorer Integration"
    ],
    highlights: [
      "Dynamic Host Resolution for Exports: Single chart and batch exports reliably route to http://127.0.0.1:8742/api under dev servers and native builds alike.",
      "Batch Individual Export Directory Passing: The completion toast for batch individual exports now captures the target directory, enabling 1-click 'Show in Explorer'.",
      "Safe Write Fallback: Protects exports against Windows PermissionError and file locks with automatic timestamped file creation."
    ]
  },
  {
    version: "v2.17.1",
    date: "2026-09-28",
    title: "9:16 Long Title Word-Wrapping & Backend Direct Downloads Delivery",
    isLatest: false,
    category: "Enhancement",
    tags: [
      "9:16 Title Wrapping",
      "SSD Benchmark Layout",
      "Logo Collision Fix",
      "Direct Downloads",
      "Show in Explorer Toast"
    ],
    highlights: [
      "9:16 Vertical Title-to-Logo Collision Fix: Resolved text scaling overlap on long benchmark titles (such as 3DMark & PCMark Storage Benchmark suite) by introducing intelligent 3-line balanced word wrapping and safe centered title constraints.",
      "Dynamic Canvas Offsets: Automatically calculates titleTop, legendTop, and gridTop depending on line count so title, subtitle, legend, and bars maintain clean, proportional spacing without clipping.",
      "Direct Export Delivery & Toasts: Single chart image exports and batch ZIP archives now save directly to Windows Downloads with instant toast notifications and 1-click 'Show in Explorer' integration."
    ]
  },
  {
    version: "v2.17.0",
    date: "2026-09-11",
    title: "PCMark 10 Storage Disambiguation, Unified 3DMark & PCMark Storage Suite, Split Sub-Charts & Smart Metric Defaulting",
    isLatest: false,
    category: "Major",
    tags: [
      "Storage Benchmark Suite",
      "PCMark 10 Disambiguation",
      "3DMark Access Time",
      "Split Sub-Charts",
      "Review Confidence Sorting",
      "Alphabetical Dropdown",
      "Smart Metric Defaulting"
    ],
    highlights: [
      "PCMark 10 Storage Disambiguation: Solved classifier collision where PCMark 10 Quick System Drive and Data Drive screenshots were erroneously tagged as generic PCMark 10 (Systems). Priority disambiguation in filename and OCR header analysis now accurately routes screenshots to their respective storage parsers with 100% metric extraction.",
      "3DMark Storage Access Time & Score Parsing: Enhanced ThreeDMarkStorageParser to catch compact headers without spaces ('Averageaccesstime') and 'Your score' headers. Integrated spatial row alignment so Average Access Time (µs) and Score (pts) are consistently extracted across all hardware runs.",
      "Unified '3DMark and PCMark Storage Benchmark' Suite: Synthesized a consolidated storage dataset merging 3DMark Storage, PCMark 10 Quick System Drive, and PCMark 10 Data Drive into a unified cross-benchmark comparison, mirroring the architecture of Arithmetic Benchmarks.",
      "Clean Split Sub-Charts for Bandwidth & Access Time: Separated Score (pts), Bandwidth (MB/s), and Access Time (µs) into dedicated sub-chart views for both individual storage benchmarks and the unified storage suite, eliminating chart scale distortion between points, transfer rates, and response latency.",
      "OCR Review Needs-Review Confidence Sorting: Items in the 'Needs Review' tab are now sorted in ascending order of confidence by default, placing the lowest confidence screenshots at the very top for rapid reviewer auditing.",
      "Alphabetical Benchmark Assignment: Reassignment dropdowns in OCR Review now sort all available benchmark profiles alphabetically from A-Z by default for effortless navigation.",
      "Smart Metric Defaulting from Batch Export Checklist: When switching benchmarks in Comparison Charts, if the 'All metrics combined' view is unchecked in the export checklist, the view automatically defaults to the first checked metric/sub-group rather than reverting to all combined."
    ]
  },
  {
    version: "v2.16.0",
    date: "2026-09-11",
    title: "Methodical 4-Step Review Workflow, OCCT CPU vs. Storage Separation & Real-Time OCR Reparsing",
    isLatest: false,
    category: "Major",
    tags: [
      "Methodical Review Workflow",
      "OCCT CPU vs. Storage Separation",
      "Real-Time Reparse Engine",
      "Workflow Stepper Navigation",
      "Column-Anchored OCR",
      "Universal Parser Routing"
    ],
    highlights: [
      "Methodical 4-Step Review Workflow: Established a clean, guided review pipeline: New Project -> Import & Scan -> OCR Review -> Comparison Charts. Once import completes, the primary action directs users to inspect and verify all newly extracted data in OCR Review before visualizing charts.",
      "Dynamic Workflow Stepper & Summary Bar: Added responsive workflow breadcrumbs and a bottom floating review summary bar with real-time verification status counts (verified, unassigned, needs review) and a 1-click 'All Done Reviewing? Generate Comparison Charts' shortcut.",
      "OCCT CPU vs. Storage Separation: Resolved parser collision where OCCT CPU multi-thread and single-thread SSE/AVX screenshots were mistakenly identified as OCCT Storage with 0 metrics. OCCT CPU now reliably extracts all 4 metrics via column-anchored coordinate analysis.",
      "Instant OCR Review Reassignment & Reparsing: Fixed benchmark reassignment so switching benchmark profiles immediately recalculates scores through the target parser and refreshes metric values directly in the UI without requiring page reloads.",
      "Universal Parser Routing & Multi-Variant Support: Registered supported benchmark IDs across Cinebench (R26, 2024, R23, R20), CrystalDiskMark, AS SSD, Blackmagic, and 3DMark suites so reassigned screenshots always route to their specialized extractors."
    ]
  },
  {
    version: "v2.15.0",
    date: "2026-09-11",
    title: "Filename-Agnostic OCR Vision, No-Recompile Dynamic AI Benchmark Builder & Review Reassignment",
    isLatest: false,
    category: "Major",
    tags: [
      "Dynamic Benchmark Builder",
      "No-Recompile Architecture",
      "AI Vision Detection",
      "Filename-Agnostic OCR",
      "Hardware Auto-Detection"
    ],
    highlights: [
      "Filename-Agnostic Visual OCR Detection: Recognizes benchmark screenshots with 95–99% confidence directly from visual layout and text anchors, eliminating errors from generic Windows Snipping Tool timestamps.",
      "No-Recompile Dynamic Benchmark Builder: Users can create, register, and calibrate brand new benchmarks on the fly directly inside the app, saving to local JSON schemas.",
      "OCR Review Interactive Tagging & Reassignment: Unknown or misdetected screenshots in OCR Review can now be interactively reassigned to any benchmark via a dedicated dropdown with 1-click 'Apply & Reparse'.",
      "Hardware Subsystem Classification: Automatically classifies benchmark test categories (GPU, CPU, Motherboard, RAM, SSD, Laptop) and extracts detailed hardware specs."
    ]
  },
  {
    version: "v2.14.0",
    date: "2026-09-10",
    title: "Unified Arithmetic Benchmark, Combined 3DMark Suite, Default Brand Logo & Process Safeguards",
    isLatest: false,
    category: "Major",
    tags: [
      "Arithmetic Benchmark",
      "3DMark Suite",
      "Unrounded SuperPI",
      "Brand Logo Integration",
      "Process Recovery"
    ],
    highlights: [
      "Unified 'Arithmetic Benchmark' (SuperPI 32M + wPrime 1024M): Combined SuperPI 32M and wPrime 1024M into a single unified dual-bar comparison chart with unrounded seconds precision.",
      "Combined '3DMark Suite - Speedway and Steel Nomad': Merged 3DMark Speed Way and 3DMark Steel Nomad into a single dual-bar comparison chart displaying Graphics Test scores in FPS.",
      "Default Publication Logo Integration: Integrated high-resolution 'Full Logo Horizontal Colored' (12500x4500, aspect 2.7778) as the default publication logo positioned top-right on all benchmark charts."
    ]
  }
];
