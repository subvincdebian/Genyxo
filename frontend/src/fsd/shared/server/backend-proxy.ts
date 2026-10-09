const hopByHopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function forwardedHeaders(original: Headers): Headers {
  const headers = new Headers(original);
  for (const name of original.get("connection")?.split(",") || []) {
    if (name.trim()) headers.delete(name.trim());
  }
  for (const name of hopByHopHeaders) headers.delete(name);
  return headers;
}

/** Same-origin HTTP bridge; BACKEND_URL is read at runtime, never in the browser. */
export async function proxyBackendRequest(request: Request): Promise<Response> {
  try {
    const incoming = new URL(request.url);
    const target = new URL(process.env.BACKEND_URL || "http://127.0.0.1:3000");
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
      throw new Error("Invalid backend origin");
    }
    const path = incoming.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
    // Assign pathname rather than resolving a user-controlled //host URL.
    target.pathname = target.pathname.replace(/\/$/, "") + path;
    target.search = incoming.search;
    target.hash = "";
    const headers = forwardedHeaders(request.headers);
    headers.delete("host");
    headers.delete("content-length");
    headers.set("x-forwarded-host", incoming.host);

    const options: RequestInit & { duplex: "half" } = {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      duplex: "half",
      signal: request.signal,
      redirect: "manual",
      cache: "no-store",
    };
    const upstream = await fetch(target, options);
    const responseHeaders = forwardedHeaders(upstream.headers);
    // fetch decodes compressed upstream responses, including streamed ones.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    // Never expose provider codes, credentials, request URLs or internal hosts.
    return Response.json({ message: "Backend unavailable" }, { status: 502 });
  }
}
