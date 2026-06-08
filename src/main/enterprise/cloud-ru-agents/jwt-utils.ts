/**
 * JWT decode utilities for extracting project_id from cloud.ru access tokens.
 * No signature verification — we trust the IAM issuer.
 */

/** Decode JWT payload without signature verification */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = parts[1];
  const decoded = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(decoded);
}

/** Extract project_id from cloud.ru JWT claims */
export function extractProjectId(token: string): string | null {
  try {
    const payload = decodeJwtPayload(token);
    // cloud.ru embeds project ID under various claim names
    const candidates = [
      "project_id",
      "cloud_project_id",
      "projectId",
      "tenant_id",
      "https://cloud.ru/project_id",
    ];
    for (const key of candidates) {
      if (typeof payload[key] === "string" && payload[key]) {
        return payload[key] as string;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract display name from JWT claims */
export function extractDisplayName(token: string): string | null {
  try {
    const payload = decodeJwtPayload(token);
    const candidates = ["preferred_username", "name", "email", "sub"];
    for (const key of candidates) {
      if (typeof payload[key] === "string" && payload[key]) {
        return payload[key] as string;
      }
    }
    return null;
  } catch {
    return null;
  }
}
