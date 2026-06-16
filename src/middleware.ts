import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const encoder = new TextEncoder();
const secretKey = encoder.encode(JWT_SECRET);

const ROUTE_PERMISSIONS: Record<
  string,
  { methods: string[]; allowedRoles: string[] }[]
> = {
  // Product Routes
  "/api/product": [{ methods: ["POST"], allowedRoles: ["ADMIN"] }],
  "/api/product/:id": [{ methods: ["PUT", "DELETE"], allowedRoles: ["ADMIN"] }],
  // Review Routes
  "/api/product/:id/review": [{ methods: ["POST"], allowedRoles: ["USER"] }],
  "/api/admin/review": [{ methods: ["GET"], allowedRoles: ["ADMIN"] }],
  "/api/admin/review/:id": [{ methods: ["PATCH"], allowedRoles: ["ADMIN"] }],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  let matchingRule = null;

  for (const pattern in ROUTE_PERMISSIONS) {
    const regexPattern = pattern.replace(":id", "[^/]+");
    if (new RegExp(`^${regexPattern}$`).test(pathname)) {
      matchingRule = ROUTE_PERMISSIONS[pattern].find((rule) =>
        rule.methods.includes(method),
      );
      if (matchingRule) break;
    }
  }

  if (!matchingRule) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED: Access token required." },
      { status: 401 },
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const userRole = payload.role as string;

    if (!matchingRule.allowedRoles.includes(userRole)) {
      return NextResponse.json(
        {
          error: `You do not have permission to perform this action. Required: [${matchingRule.allowedRoles.join(", ")}]`,
        },
        { status: 403 },
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload.userId));
    requestHeaders.set("x-user-role", userRole);
    requestHeaders.set("x-user-name", String(payload.name));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "UNAUTHORIZED: Invalid or expired token." },
      { status: 401 },
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
