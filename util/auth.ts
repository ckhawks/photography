import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET!;

/**
 * Read one cookie by name. Splitting the header on "auth-token=" also matched
 * any cookie whose name merely ended in that, e.g. "client-auth-token".
 */
export function getCookie(req: Request, name: string) {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    console.error("Invalid token: ", error);
    return null;
  }
}
