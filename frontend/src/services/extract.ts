/**
 * Browser-side document text extraction.
 *
 * The server-side OCR stack (onnxruntime + opencv) is ~340 MB unzipped, which
 * cannot fit in a serverless function bundle. So extraction runs here instead,
 * in WebAssembly, and only the resulting text is posted to the backend — which
 * then applies exactly the same field-parsing and institution-matching rules as
 * the server-side path.
 *
 * Strategy mirrors the backend:
 *   PDF with a real text layer -> read it directly (exact, instant)
 *   Scanned PDF                -> render pages to canvas, then OCR
 *   Image                      -> OCR directly
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// A PDF with fewer than this many characters of embedded text is treated as a
// scan and sent to OCR. Matches MIN_TEXT_LAYER_CHARS on the backend.
const MIN_TEXT_LAYER_CHARS = 40;
const MAX_OCR_PAGES = 5;
const OCR_RENDER_SCALE = 2.0; // ~200 dpi equivalent, matching the backend

export interface ExtractionResult {
  text: string;
  method: 'PDF_TEXT_LAYER' | 'OCR_SCANNED_PDF' | 'OCR_IMAGE';
  engine: string;
  pages: number;
  confidence: number | null;
}

export type ProgressFn = (stage: string, pct?: number) => void;

const IMAGE_TYPES = /\.(png|jpe?g|webp|tiff?|bmp)$/i;

/** Lazily create a Tesseract worker so the WASM is only fetched when needed. */
async function withWorker<T>(onProgress: ProgressFn, fn: (worker: any) => Promise<T>): Promise<T> {
  const { createWorker } = await import('tesseract.js');
  onProgress('Loading OCR engine…');
  const worker = await createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        onProgress('Reading document…', Math.round((m.progress || 0) * 100));
      }
    },
  });
  try {
    return await fn(worker);
  } finally {
    await worker.terminate();
  }
}

async function ocrImage(source: Blob | string, onProgress: ProgressFn) {
  return withWorker(onProgress, async (worker) => {
    const { data } = await worker.recognize(source);
    return {
      text: (data.text || '').trim(),
      confidence: typeof data.confidence === 'number' ? data.confidence / 100 : null,
    };
  });
}

async function renderPageToCanvas(page: any): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a drawing context for the PDF page.');
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

export async function extractDocumentText(
  file: File,
  onProgress: ProgressFn = () => {},
): Promise<ExtractionResult> {
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

  if (isPdf) {
    onProgress('Opening PDF…');
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    // 1) Prefer a genuine text layer — exact, and far faster than OCR.
    let embedded = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      embedded += content.items.map((it: any) => it.str ?? '').join(' ') + '\n';
    }
    if (embedded.trim().length >= MIN_TEXT_LAYER_CHARS) {
      return {
        text: embedded.trim(),
        method: 'PDF_TEXT_LAYER',
        engine: 'pdf.js text layer',
        pages: pdf.numPages,
        confidence: 1.0,
      };
    }

    // 2) Scanned PDF — rasterise each page and OCR it.
    const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
    const texts: string[] = [];
    const confs: number[] = [];
    for (let i = 1; i <= pageCount; i++) {
      onProgress(`Scanning page ${i} of ${pageCount}…`);
      const page = await pdf.getPage(i);
      const canvas = await renderPageToCanvas(page);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Page render failed'))), 'image/png'),
      );
      const { text, confidence } = await ocrImage(blob, onProgress);
      if (text) texts.push(text);
      if (confidence != null) confs.push(confidence);
    }
    return {
      text: texts.join('\n'),
      method: 'OCR_SCANNED_PDF',
      engine: 'Tesseract (WebAssembly)',
      pages: pdf.numPages,
      confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null,
    };
  }

  if (!IMAGE_TYPES.test(file.name) && !file.type.startsWith('image/')) {
    throw new Error(`Unsupported file type for extraction: ${file.name}`);
  }

  const { text, confidence } = await ocrImage(file, onProgress);
  return {
    text,
    method: 'OCR_IMAGE',
    engine: 'Tesseract (WebAssembly)',
    pages: 1,
    confidence,
  };
}
