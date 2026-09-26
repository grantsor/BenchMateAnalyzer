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
    version: "v1.1.1",
    date: "2026-09-26",
    title: "App-Relative Import Folder Shortcut, Chart Scaling Alignment, Dedicated Standalone Changelogs & Version Synchronization",
    isLatest: true,
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
    version: "v1.1.1",
    date: "2026-09-26",
    title: "Chart Scaling & Typography Overhaul, Heading Spacing Parity, Default Gadget Pilipinas Branding & Import Folder Access",
    isLatest: true,
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
    version: "v2.17.0",
    date: "2026-09-11",
    title: "PCMark 10 Storage Disambiguation, Unified 3DMark & PCMark Storage Suite, Split Sub-Charts & Smart Metric Defaulting",
    isLatest: true,
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
