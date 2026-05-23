import { proxyGhostRequest } from "@/lib/ghost-session";

export async function GET(request) {
  return proxyGhostRequest(request, "/ghost/leave/all");
}
