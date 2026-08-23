/**
 * EXIF records gear by internal model code: "SONY ILCE-7M3", "NIKON
 * CORPORATION NIKON D750", "E 28-200mm F2.8-5.6 A071". These turn those into
 * what the gear is actually called.
 *
 * These run at DISPLAY time and never write to the database: the stored value
 * stays exactly what EXIF or a human put there, and a name typed by hand that
 * matches no code passes straight through unchanged. Add entries as bodies and
 * lenses appear.
 */

const CAMERAS: Record<string, string> = {
  // Sony's ILCE codes say nothing to anyone
  "ILCE-7M2": "Sony A7 II",
  "ILCE-7M3": "Sony A7 III",
  "ILCE-7M4": "Sony A7 IV",
  "ILCE-7RM3": "Sony A7R III",
  "ILCE-7RM4": "Sony A7R IV",
  "ILCE-7RM5": "Sony A7R V",
  "ILCE-7SM3": "Sony A7S III",
  "ILCE-7CM2": "Sony A7C II",
  "ILCE-6000": "Sony A6000",
  "ILCE-6400": "Sony A6400",
  "ILCE-6700": "Sony A6700",
  "ILCE-1": "Sony A1",
  "ILCE-9M2": "Sony A9 II",
  "ZV-E10": "Sony ZV-E10",
};

const LENSES: Record<string, string> = {
  // Tamron's E-mount zooms report as a bare product code
  A071: "Tamron 28-200mm f/2.8-5.6",
  A046: "Tamron 17-28mm f/2.8",
  A047: "Tamron 70-180mm f/2.8",
  A036: "Tamron 28-75mm f/2.8",
  A063: "Tamron 28-75mm f/2.8 G2",
};

const MAKE_NAMES: Record<string, string> = {
  SONY: "Sony",
  FUJIFILM: "Fujifilm",
  CANON: "Canon",
  NIKON: "Nikon",
  PANASONIC: "Panasonic",
  OLYMPUS: "Olympus",
  "OM DIGITAL SOLUTIONS": "OM System",
  RICOH: "Ricoh",
  LEICA: "Leica",
  PENTAX: "Pentax",
  APPLE: "Apple",
  GOOGLE: "Google",
};

function tidyMake(make: string) {
  const cleaned = make.replace(/\bCORPORATION\b/gi, "").trim();
  return MAKE_NAMES[cleaned.toUpperCase()] ?? cleaned;
}

/** "SONY" + "ILCE-7M3" -> "Sony A7 III" */
export function normalizeCamera(make?: string | null, model?: string | null) {
  const rawModel = (model ?? "").trim();
  const rawMake = (make ?? "").trim();
  if (!rawModel && !rawMake) return null;

  const upper = rawModel.toUpperCase();
  if (CAMERAS[upper]) return CAMERAS[upper];

  // the stored value is often "MAKE MODEL" in one string
  for (const [code, name] of Object.entries(CAMERAS)) {
    if (upper.includes(code)) return name;
  }

  const brand = tidyMake(rawMake);
  // Nikon and Canon repeat the brand inside the model
  const model_ = brand && rawModel.toUpperCase().startsWith(brand.toUpperCase())
    ? rawModel.slice(brand.length).trim()
    : rawModel;

  return [brand, model_].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || null;
}

/** "E 28-200mm F2.8-5.6 A071" -> "Tamron 28-200mm f/2.8-5.6" */
export function normalizeLens(lens?: string | null) {
  const raw = (lens ?? "").trim();
  if (!raw) return null;

  for (const [code, name] of Object.entries(LENSES)) {
    if (raw.toUpperCase().includes(code)) return name;
  }

  return (
    raw
      // F2.8 is how EXIF writes it; f/2.8 is how everyone else does
      .replace(/\bF(\d)/g, "f/$1")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}
