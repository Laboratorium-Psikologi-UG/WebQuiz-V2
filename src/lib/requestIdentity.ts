const FORWARDED_FOR_HEADER = "x-forwarded-for";
const MAX_CLIENT_IP_LENGTH = 255;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

/**
 * Resolves the client IP address from an incoming request.
 *
 * Forwarded headers are ignored unless the deployment explicitly opts in via
 * `TRUST_PROXY === "true"` and provides a non-empty `TRUSTED_CLIENT_IP_HEADER`.
 * The named header is assumed to be overwritten by the trusted proxy. Returns
 * `null` when trust is disabled, the header is absent, or its value is empty,
 * malformed, or longer than 255 characters. No DNS or network validation is
 * performed.
 */
export function getClientIp(req: Request): string | null {
  if (process.env.TRUST_PROXY !== "true") {
    return null;
  }

  const configuredHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!configuredHeader || configuredHeader.trim() === "") {
    return null;
  }

  const headerName = configuredHeader.trim().toLowerCase();
  const rawValue = req.headers.get(headerName);
  if (rawValue === null) {
    return null;
  }

  const candidate =
    headerName === FORWARDED_FOR_HEADER
      ? firstNonEmptyEntry(rawValue)
      : rawValue.trim();

  if (candidate === null || candidate === "") {
    return null;
  }

  if (candidate.length > MAX_CLIENT_IP_LENGTH) {
    return null;
  }

  if (CONTROL_CHARACTER_PATTERN.test(candidate)) {
    return null;
  }

  return candidate;
}

function firstNonEmptyEntry(value: string): string | null {
  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (trimmed !== "") {
      return trimmed;
    }
  }
  return null;
}
