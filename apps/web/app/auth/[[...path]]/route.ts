export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { proxyBackendRequest } from "@/shared/server/backend-proxy";

const stateCookie = "gx_google_oauth_state";

function oauthFailure(request: Request) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL("/sign-in?oauth_error=1", request.url).toString(),
      "Set-Cookie": `${stateCookie}=; Path=/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isGoogleStart = url.pathname === "/auth/google";
  const isGoogleCallback = url.pathname === "/auth/google/callback";

  if (isGoogleCallback) {
    const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${stateCookie}=`))?.slice(stateCookie.length + 1);
    const returned = url.searchParams.get("state");
    if (!cookie || !returned || cookie.length !== returned.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(returned))) {
      return oauthFailure(request);
    }
  }

  const response = await proxyBackendRequest(request);
  if (isGoogleStart) {
    const location = response.headers.get("location");
    if (!location || response.status < 300 || response.status >= 400) return oauthFailure(request);
    const destination = new URL(location, request.url);
    if (destination.hostname !== "accounts.google.com") return oauthFailure(request);
    const state = randomBytes(32).toString("hex");
    destination.searchParams.set("state", state);
    return new Response(null, {
      status: 302,
      headers: {
        Location: destination.toString(),
        "Set-Cookie": `${stateCookie}=${state}; Path=/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=600${url.protocol === "https:" ? "; Secure" : ""}`,
      },
    });
  }
  if (isGoogleCallback) {
    if (response.status >= 400) return oauthFailure(request);
    response.headers.append("Set-Cookie", `${stateCookie}=; Path=/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=0`);
  } else if (url.pathname.endsWith("/callback") && response.status >= 400) return oauthFailure(request);
  return response;
}
export {
  proxyBackendRequest as HEAD,
  proxyBackendRequest as POST,
  proxyBackendRequest as PUT,
  proxyBackendRequest as PATCH,
  proxyBackendRequest as DELETE,
  proxyBackendRequest as OPTIONS,
} from "@/shared/server/backend-proxy";
