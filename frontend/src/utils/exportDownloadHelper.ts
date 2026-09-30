import { useExportToastStore } from "../stores/exportToastStore";

/**
 * Dynamically resolves the API base URL.
 * When running in development (e.g., Vite on port 5173/3000) or any non-backend port,
 * it targets the backend at http://127.0.0.1:8742/api.
 * In production desktop runtime (port 8742), it uses /api.
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
 * Universal file export delivery:
 * 1. Sends to backend to save directly into Windows Downloads folder + internal archive.
 * 2. Triggers browser download fallback (with delayed revocation).
 * 3. Shows toast notification with 1-click "Open in Explorer" button.
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

  // 1. Direct save via backend into Windows Downloads
  try {
    const resp = await fetch(`${apiBase}/export/save-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: filename,
        data_url: dataUrl,
        open_in_explorer: options?.openInExplorer ?? false
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) {
        backendSuccess = true;
        savedFilePath = data.file_path;
        savedDirectory = data.directory;
      }
    } else {
      const errDetail = await resp.text().catch(() => "");
      console.warn(`[Export] Backend save-file returned HTTP ${resp.status}:`, errDetail);
    }
  } catch (err) {
    console.warn("[Export] Backend save failed, relying on browser download fallback:", err);
  }

  // 2. Standard browser download fallback
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
    }, 2000); // 2000ms delay ensures asynchronous browser download engine starts
  } catch (browserErr) {
    console.warn("[Export] Browser link.click fallback error:", browserErr);
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
    } else if (backendSuccess) {
      showToast({
        type: "success",
        title: "Export Saved",
        message: options?.customToastMessage || `${filename} saved successfully.`
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
