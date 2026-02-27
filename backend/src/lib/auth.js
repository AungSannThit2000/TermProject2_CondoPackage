import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment variables");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment variables");
  }
  return jwt.verify(token, JWT_SECRET);
}

export function requireAuth(request, allowedRoles = null) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized",
    };
  }

  try {
    const payload = verifyToken(token);
    if (Array.isArray(allowedRoles) && !allowedRoles.includes(payload.role)) {
      return {
        ok: false,
        status: 403,
        message: "Forbidden",
      };
    }
    return { ok: true, payload };
  } catch {
    return {
      ok: false,
      status: 401,
      message: "Invalid token",
    };
  }
}
