import { useExportToastStore } from "../stores/exportToastStore";

/**
 * Dynamically resolves the API base URL.
 */
export const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    if (window.location.protocol === "file:" || (window.location.port && window.location.port !== "8742")) {
      return "http://127.0.0.1:8742/api";
    }
  }
  return "/api";
};

/**
 * Converts a Blob to a base64 Data URL string.
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Requests the backend to open Windows File Explorer focused on the given file or directory.
 */
export async function openFileInExplorer(filePath?: string, directory?: string): Promise<void> {
  try {
    const apiBase = getApiBase();
    await fetch(`${apiBase}/export/open-in-explorer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath, directory: directory })
    });
  } catch (err) {
    console.warn("Failed to open Explorer:", err);
  }
}

/**
 * Constructs the standard default ZIP file name:
 * <laptop name> - <Benchmark OCR | CapframeX Analyzer> - <aspect ratio> <resolution> <format>.zip
 *
 * Example:
 * MSI Cyborg A15 MAX Review - Benchmark OCR - 16x9 1080p png.zip
 */
export function buildZipExportFileName(
  appName: "Benchmark OCR" | "CapframeX Analyzer",
  productName: string | undefined,
  exportConfig: { aspectRatio: string; resolution: string; format: string },
  exportPhrase?: string
): string {
  const rawProduct = (productName || "").trim();
  const rawPhrase = (exportPhrase || "").trim();

  let fullProduct = rawProduct;
  if (rawPhrase && !fullProduct.toLowerCase().includes(rawPhrase.toLowerCase())) {
    fullProduct = fullProduct ? `${fullProduct} ${rawPhrase}` : rawPhrase;
  }
  if (!fullProduct) {
    fullProduct = "Benchmark Results";
  }

  const cleanProduct = fullProduct.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  const cleanAspect = exportConfig.aspectRatio.replace(":", "x");
  const cleanRes = exportConfig.resolution;
  const cleanFormat = exportConfig.format.toLowerCase();

  return `${cleanProduct} - ${appName} - ${cleanAspect} ${cleanRes} ${cleanFormat}.zip`;
}

/**
 * Dedicated ZIP file export delivery:
 * 1. Prompts the user FIRST with a native Save File Dialog so they choose WHERE to save the ZIP.
 * 2. Writes the file directly to the user's chosen location.
 * 3. Does NOT save to Downloads automatically beforehand.
 * 4. Does NOT pop open Windows File Explorer.
 * 5. Cancels cleanly if the user dismisses the dialog.
 */
export async function deliverExportZip(
  zipFileName: string,
  blob: Blob,
  options?: { notify?: boolean }
): Promise<{ success: boolean; filePath?: string }> {
  // 1. Try modern browser / WebView2 File System Access API
  if (typeof window !== "undefined" && typeof (window as any).showSaveFilePicker === "function") {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: zipFileName,
        types: [
          {
            description: "ZIP Archive",
            accept: { "application/zip": [".zip"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      if (options?.notify !== false) {
        useExportToastStore.getState().showToast({
          type: "success",
          title: "ZIP Archive Saved",
          message: `${handle.name || zipFileName} saved successfully.`
        });
      }
      return { success: true, filePath: handle.name || zipFileName };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { success: false };
      }
      console.warn("showSaveFilePicker failed, trying backend native save dialog:", err);
    }
  }

  // 2. Fallback to backend native Windows Save File Dialog
  try {
    const apiBase = getApiBase();
    const dataUrl = await blobToDataUrl(blob);
    const resp = await fetch(`${apiBase}/export/save-dialog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: zipFileName,
        data_url: dataUrl
      })
    });
    if (resp.ok) {
      const result = await resp.json();
      if (result.success && result.file_path) {
        if (options?.notify !== false) {
          useExportToastStore.getState().showToast({
            type: "success",
            title: "ZIP Archive Saved",
            message: `${result.filename || zipFileName} saved successfully.`,
            filePath: result.file_path,
            directory: result.directory
          });
        }
        return { success: true, filePath: result.file_path };
      } else if (result.cancelled) {
        return { success: false };
      }
    }
  } catch (err) {
    console.warn("Backend save-dialog failed, falling back to direct download:", err);
  }

  // 3. Fallback: single browser download link click (no Explorer window)
  try {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 2000);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

/**
 * Universal file export delivery for individual images and non-zipped batch exports:
 * 1. Saves directly to Windows Downloads folder via backend.
 * 2. Does NOT pop open Explorer or duplicate browser save dialogs.
 * 3. Shows toast notification.
 */
export async function deliverExportFile(
  filename: string,
  dataUrlOrBlob: string | Blob,
  options?: {
    openInExplorer?: boolean;
    notify?: boolean;
    customToastMessage?: string;
  }
): Promise<{ success: boolean; filePath?: string; directory?: string }> {
  let dataUrl = "";
  if (typeof dataUrlOrBlob === "string") {
    dataUrl = dataUrlOrBlob;
  } else {
    dataUrl = await blobToDataUrl(dataUrlOrBlob);
  }

  let savedFilePath: string | undefined;
  let savedDirectory: string | undefined;
  let backendSuccess = false;
  const apiBase = getApiBase();

  // 1. Direct save via backend into Windows Downloads (open_in_explorer = false to prevent explorer popups)
  try {
    const resp = await fetch(`${apiBase}/export/save-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: filename,
        data_url: dataUrl,
        open_in_explorer: false
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) {
        backendSuccess = true;
        savedFilePath = data.file_path;
        savedDirectory = data.directory;
      }
    }
  } catch (err) {
    console.warn("[Export] Backend save failed, relying on browser download fallback:", err);
  }

  // 2. Browser link fallback ONLY if backend did not write the file
  if (!backendSuccess) {
    try {
      const link = document.createElement("a");
      if (typeof dataUrlOrBlob === "string") {
        link.href = dataUrlOrBlob;
      } else {
        link.href = URL.createObjectURL(dataUrlOrBlob);
      }
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        if (typeof dataUrlOrBlob !== "string") {
          URL.revokeObjectURL(link.href);
        }
      }, 2000);
    } catch (browserErr) {
      console.warn("[Export] Browser link fallback error:", browserErr);
    }
  }

  // 3. User feedback toast notification
  if (options?.notify !== false) {
    const showToast = useExportToastStore.getState().showToast;
    if (backendSuccess && savedFilePath) {
      showToast({
        type: "success",
        title: "Export Saved to Downloads",
        message: options?.customToastMessage || `${filename} saved successfully.`,
        filePath: savedFilePath,
        directory: savedDirectory
      });
    } else {
      showToast({
        type: "info",
        title: "Chart Export Downloaded",
        message: `${filename} download initiated.`,
        filePath: savedFilePath,
        directory: savedDirectory
      });
    }
  }

  return {
    success: backendSuccess,
    filePath: savedFilePath,
    directory: savedDirectory
  };
}
