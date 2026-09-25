# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_dynamic_libs

datas = [
    ('backend/app', 'app'),
    ('backend/static', 'static'),
    ('backend/data', 'data'),
    ('CHANGELOG.md', '.'),
    ('backend/app/assets/Full Logo Horizontal Colored.png', '.'),
    ('backend/app/assets/default_logo.png', '.'),
    ('backend/app/assets/capframex-icon.png', '.'),
    ('backend/app/assets/capframex-logo.png', '.'),
    ('Stop-App.bat', '.'),
    ('Restart-App.bat', '.'),
    ('run_app.bat', '.'),
]

binaries = []
hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'sqlalchemy',
    'aiosqlite',
    'fastapi',
    'pydantic',
    'pydantic_core',
    'cv2',
    'numpy',
    'PIL',
    'yaml',
    'rapidocr_onnxruntime',
    'onnxruntime',
    'pyclipper',
    'shapely',
]

datas += collect_data_files('rapidocr_onnxruntime')
hiddenimports += collect_submodules('rapidocr_onnxruntime')

datas += collect_data_files('onnxruntime')
binaries += collect_dynamic_libs('onnxruntime')

datas += collect_data_files('cv2')
binaries += collect_dynamic_libs('cv2')

datas += collect_data_files('shapely')
hiddenimports += collect_submodules('shapely')
hiddenimports += collect_submodules('pyclipper')

# pywebview and Windows EdgeChromium runtime dependencies
hiddenimports += [
    'webview',
    'webview.platforms.winforms',
    'webview.platforms.edgechromium',
    'clr',
    'clr_loader',
    'pythonnet',
    'cffi',
    'proxy_tools',
]
datas += collect_data_files('webview')
hiddenimports += collect_submodules('webview.platforms.edgechromium')
hiddenimports += collect_submodules('webview.platforms.winforms')

datas += collect_data_files('clr_loader')
hiddenimports += collect_submodules('clr_loader')

datas += collect_data_files('pythonnet')
hiddenimports += collect_submodules('pythonnet')
binaries += collect_dynamic_libs('pythonnet')

a = Analysis(
    ['run_app.py'],
    pathex=['.', 'backend'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BenchMate-Analyzer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='BenchMate-Analyzer',
)
