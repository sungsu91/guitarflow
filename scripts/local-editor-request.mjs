// Source-writing development endpoints accept only same-origin JSON on loopback.
// A local socket alone is insufficient: a remote page can POST to localhost.
export function isTrustedLocalEditorRequest(request) {
  const address = request.socket?.remoteAddress || "";
  if (!(address === "127.0.0.1" || address === "::1" || /^::ffff:127\./.test(address))) return false;
  const headers = request.headers || {};
  if (!/^application\/json(?:\s*;|$)/i.test(headers["content-type"] || "")) return false;
  if (headers["sec-fetch-site"] && !["same-origin", "none"].includes(headers["sec-fetch-site"])) return false;
  try {
    const protocol = request.socket?.encrypted ? "https:" : "http:";
    const expected = new URL(`${protocol}//${headers.host}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(expected.hostname)) return false;
    return !headers.origin || new URL(headers.origin).origin === expected.origin;
  } catch {
    return false;
  }
}
