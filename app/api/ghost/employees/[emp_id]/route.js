import { proxyGhostRequest } from "@/lib/ghost-session";

export async function PUT(request, { params }) {
  const { emp_id } = await params;
  return proxyGhostRequest(request, `/ghost/employees/${emp_id}`, {
    method: "PUT",
    body: await request.text(),
  });
}
