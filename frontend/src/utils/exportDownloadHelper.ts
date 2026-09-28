import { useExportToastStore } from "../stores/exportToastStore";

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
    await fetch("/api/export/open-in-explorer", {
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

  // 1. Direct save via backend into Windows Downloads
  try {
    const resp = await fetch("/api/export/save-file", {
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
    }
  } catch (err) {
    console.warn("Backend save failed, relying on browser download fallback:", err);
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
    console.warn("Browser link.click fallback error:", browserErr);
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
