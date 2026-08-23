import sharp from "sharp";
import exifReader from "exif-reader";

export type PhotoExif = {
  camera: string | null;
  lens: string | null;
  takenAt: Date | null;
  /** display-only settings; shape varies by camera, so it rides as JSON */
  settings: {
    aperture?: number;
    shutter?: string;
    iso?: number;
    focalLength?: number;
  } | null;
  /** what the EXIF suggests the medium is, when it suggests anything */
  mediumHint: "film" | "digital" | null;
};

const EMPTY: PhotoExif = {
  camera: null,
  lens: null,
  takenAt: null,
  settings: null,
  mediumHint: null,
};

// A scan's EXIF describes the scanner, not the camera. Seeing one of these is
// good evidence the photo is film — and a reason NOT to record it as the camera.
const SCANNER_MAKES = ["noritsu", "fujifilm frontier", "frontier", "epson", "plustek", "pakon", "flextight", "hasselblad x1", "imacon"];

function isScanner(text: string) {
  const lower = text.toLowerCase();
  return SCANNER_MAKES.some((scanner) => lower.includes(scanner));
}

/** 1/250 reads better than 0.004 */
function formatShutter(seconds?: number) {
  if (!seconds) return undefined;
  if (seconds >= 1) return `${Number(seconds.toFixed(1))}s`;
  return `1/${Math.round(1 / seconds)}`;
}

/**
 * Camera details out of a photo's EXIF. Returns empties rather than throwing:
 * plenty of the library has no EXIF at all (Lightroom exports can strip it),
 * and a missing block is normal, not an error.
 */
export async function readExif(original: Buffer): Promise<PhotoExif> {
  let parsed;
  try {
    const { exif } = await sharp(original).metadata();
    if (!exif) return EMPTY;
    parsed = exifReader(exif);
  } catch (error) {
    console.error("EXIF unreadable:", error);
    return EMPTY;
  }

  const make = parsed?.Image?.Make?.trim() ?? "";
  const model = parsed?.Image?.Model?.trim() ?? "";
  const device = [make, model].filter(Boolean).join(" ").trim();
  const scanner = device ? isScanner(device) : false;

  const settings = {
    aperture: parsed?.Photo?.FNumber,
    shutter: formatShutter(parsed?.Photo?.ExposureTime),
    iso: parsed?.Photo?.ISOSpeedRatings,
    focalLength: parsed?.Photo?.FocalLength,
  };
  const hasSettings = Object.values(settings).some((value) => value !== undefined);

  return {
    // a scanner is not the camera, so leave it to be typed in by hand
    camera: scanner || !device ? null : device,
    lens: parsed?.Photo?.LensModel?.trim() || null,
    takenAt: parsed?.Photo?.DateTimeOriginal ?? null,
    settings: hasSettings ? settings : null,
    mediumHint: scanner ? "film" : device ? "digital" : null,
  };
}
