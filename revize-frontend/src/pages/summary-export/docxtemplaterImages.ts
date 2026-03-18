import api from "../../api/axios";

export type DefectPhotoMeta = {
  id: number;
  defect_uid?: string | null;
  caption?: string | null;
  original_name?: string | null;
};

export type DocxTemplateImageValue = {
  data: Uint8Array;
  width: number;
  height: number;
};

const MAX_SOURCE_LONG_EDGE = 1400;
const MAX_DOC_WIDTH = 220;
const MAX_DOC_HEIGHT = 165;

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Canvas export failed"));
    }, type, quality);
  });
}

function loadHtmlImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image decode failed"));
    };
    image.src = objectUrl;
  });
}

async function normalizeBlobToPng(blob: Blob): Promise<DocxTemplateImageValue> {
  const image = await loadHtmlImage(blob);
  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const shrinkRatio = Math.min(1, MAX_SOURCE_LONG_EDGE / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * shrinkRatio));
  const targetHeight = Math.max(1, Math.round(sourceHeight * shrinkRatio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is unavailable");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  const pngBlob = await canvasToBlob(canvas, "image/png");
  const displaySize = fitWithin(targetWidth, targetHeight, MAX_DOC_WIDTH, MAX_DOC_HEIGHT);

  return {
    data: new Uint8Array(await pngBlob.arrayBuffer()),
    width: displaySize.width,
    height: displaySize.height,
  };
}

export async function prepareDefectTemplateImages(
  revId: string | undefined,
  defectPhotos: DefectPhotoMeta[] = []
) {
  const images = new Map<number, DocxTemplateImageValue>();
  if (!revId || !defectPhotos.length) {
    return images;
  }

  const prepared = await Promise.all(
    defectPhotos.map(async (photo) => {
      try {
        const response = await api.get(`/revisions/${revId}/photos/${photo.id}/thumb`, {
          responseType: "blob",
        });
        const imageValue = await normalizeBlobToPng(response.data);
        return [photo.id, imageValue] as const;
      } catch (error) {
        console.warn("Nepodarilo se pripravit fotografii do Word sablony:", photo.id, error);
        return null;
      }
    })
  );

  for (const item of prepared) {
    if (!item) continue;
    images.set(item[0], item[1]);
  }

  return images;
}
