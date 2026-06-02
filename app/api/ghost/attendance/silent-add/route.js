import { proxyGhostRequest } from "@/lib/ghost-session";

export async function POST(request) {
  const body = await request.text();
  return proxyGhostRequest(request, "/ghost/attendance/silent-add", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
