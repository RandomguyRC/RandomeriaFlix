import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

const pageCache = new Map<string, RenderedPage[]>();

export async function renderPDF(
  pdfUrl: string,
  maxWidth: number
): Promise<{ pages: RenderedPage[]; totalPages: number }> {
  const cacheKey = `${pdfUrl}_${maxWidth}`;
  if (pageCache.has(cacheKey)) {
    const cached = pageCache.get(cacheKey)!;
    return { pages: cached, totalPages: cached.length };
  }

  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const renderedPages: RenderedPage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1 });

    // Scale to fit maxWidth with high resolution for crisp text
    const baseScale = maxWidth / unscaledViewport.width;
    const scale = baseScale * 2.5; // Always render at 2.5x for sharp text
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport } as any).promise;

    const dataUrl = canvas.toDataURL("image/png");

    renderedPages.push({
      pageNumber: i,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  pageCache.set(cacheKey, renderedPages);
  return { pages: renderedPages, totalPages };
}

export function clearCache() {
  pageCache.clear();
}

// Clear cache on module load to pick up quality changes
pageCache.clear();
