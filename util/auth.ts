import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET!;

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    console.error("Invalid token: ", error);
    return null;
  }
}
