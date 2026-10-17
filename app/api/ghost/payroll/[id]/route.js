import { proxyGhostRequest } from "@/lib/ghost-session";

export async function PUT(request, { params }) {
  const { id } = await params;
  return proxyGhostRequest(request, `/ghost/payroll/${id}`, {
    method: "PUT",
    body: await request.text(),
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  return proxyGhostRequest(request, `/ghost/payroll/${id}`, {
    method: "PATCH",
    body: await request.text(),
  });
}
