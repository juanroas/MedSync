import type { NextRequest } from "next/server";

// File downloads (PDF, CSV, prontuário attachments) come through here instead of the /api rewrite. The rewrite proxy
// of `next start` destroys the browser connection as soon as the API finishes answering, which cuts larger bodies
// while they are still being sent (content-length mismatch, "Failed to fetch"). Here the body is streamed with fetch.
// Only these API paths are forwarded; the session cookie goes along and the API decides access, as always.
const ALLOWED_PATHS = [
  /^reports\/appointments\/(pdf|csv)$/,
  /^me\/data-access-report$/,
  /^privacy\/data-access-report$/,
  /^appointments\/[0-9a-f-]{36}\/attendance-declaration$/,
  /^prescriptions\/[0-9a-f-]{36}\/pdf$/,
  /^appointments\/[0-9a-f-]{36}\/clinical-record\/attachments\/[0-9a-f-]{36}\/download$/,
];

const apiTarget = (process.env.API_PROXY_TARGET ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: Context) {
  return forward(request, (await context.params).path);
}

async function forward(request: NextRequest, segments: string[]) {
  const path = segments.join("/");
  if (!ALLOWED_PATHS.some((rule) => rule.test(path))) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  for (const name of ["cookie", "content-type", "accept", "user-agent", "x-forwarded-for"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const upstream = await fetch(`${apiTarget}/${path}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body: request.method === "POST" ? await request.text() : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers({ "cache-control": "no-store" });
  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
