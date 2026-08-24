export function extractBearerToken(request: Request): string | null {
  let authHeader: string | null | undefined = null;

  if (request.headers) {
    if (typeof request.headers.get === "function") {
      authHeader =
        request.headers.get("authorization") ??
        request.headers.get("Authorization");
    } else if (typeof request.headers === "object") {
      const headers = request.headers as unknown as Record<
        string,
        string | undefined
      >;
      authHeader = headers["authorization"] ?? headers["Authorization"];
    }
  }

  if (!authHeader) {
    return null;
  }

  const trimmed = authHeader.trim();
  const match = trimmed.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}
