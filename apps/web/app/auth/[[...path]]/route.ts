export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export {
  proxyBackendRequest as GET,
  proxyBackendRequest as HEAD,
  proxyBackendRequest as POST,
  proxyBackendRequest as PUT,
  proxyBackendRequest as PATCH,
  proxyBackendRequest as DELETE,
  proxyBackendRequest as OPTIONS,
} from "@/shared/server/backend-proxy";
