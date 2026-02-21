import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { User } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-dev-secret-please-set-in-env"
);
const COOKIE_NAME = "roi-auth";
const TOKEN_TTL = "30d";

// --- Password hashing ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- JWT ---

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// --- Cookie helpers ---

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  // secure: true only when the site is served over HTTPS.
  // On HTTP deployments (no TLS) this must be false, otherwise
  // the browser silently drops the cookie and auth breaks.
  const secure = process.env.COOKIE_SECURE === "true";
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// --- Get current user from server context ---

/** For use in Server Components and Route Handlers that use next/headers */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role as "USER" | "ADMIN",
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/** For use in Route Handlers where req is available */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role as "USER" | "ADMIN",
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/** Returns user or throws 401 response */
export async function requireAuth(req: NextRequest): Promise<User> {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Требуется авторизация" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/** Returns admin user or throws 403 response */
export async function requireAdmin(req: NextRequest): Promise<User> {
  const user = await requireAuth(req);
  if (user.role !== "ADMIN") {
    throw new Response(JSON.stringify({ error: "Доступ запрещён" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/** Checks if an email should be auto-promoted to ADMIN */
export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}
