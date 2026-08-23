// app/api/login/route.js
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const secretPassword = process.env.SECRET_PASSWORD;

  // Fail closed. Without these checks an unset SECRET_PASSWORD makes both
  // sides undefined, so a body with no password field authenticates.
  if (!secretPassword || !process.env.JWT_SECRET) {
    console.error("SECRET_PASSWORD or JWT_SECRET is not set; refusing to log in");
    return NextResponse.json({ error: "Login is not configured" }, { status: 500 });
  }

  if (typeof password === "string" && password === secretPassword) {
    // Generate a simple token (for demo purposes)
    const token = jwt.sign({ authenticated: true }, process.env.JWT_SECRET!, {
      expiresIn: "1d",
    });

    // Set an HTTP-only cookie to store the token
    const response = NextResponse.json({ message: "Logged in" });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 1 day
    });

    // Set a non-HTTP-only token for client-side checks
    response.cookies.set("client-auth", "true", {
      httpOnly: false,
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  }

  return NextResponse.json({ message: "Invalid password" }, { status: 401 });
}
