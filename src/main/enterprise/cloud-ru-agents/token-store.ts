/**
 * Encrypted token persistence using Electron's safeStorage API.
 * Tokens are encrypted at rest using the OS keychain (macOS Keychain,
 * Windows DPAPI, Linux libsecret).
 */

import { app, safeStorage } from "electron";
import * as fs from "fs";
import * as path from "path";
import type { TokenData, PkceFlowState } from "./types";

const TOKEN_FILENAME = "cloud-ru-auth.enc";
const PKCE_FILENAME = "cloud-ru-pkce.json";

export class TokenStore {
  private basePath: string;

  constructor(appDataPath?: string) {
    this.basePath = appDataPath ?? app.getPath("userData");
  }

  private get tokenPath(): string {
    return path.join(this.basePath, TOKEN_FILENAME);
  }

  private get pkcePath(): string {
    return path.join(this.basePath, PKCE_FILENAME);
  }

  /** Load persisted tokens (decrypted) */
  async load(): Promise<TokenData | null> {
    try {
      if (!fs.existsSync(this.tokenPath)) return null;
      const encrypted = fs.readFileSync(this.tokenPath);

      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(encrypted);
        return JSON.parse(decrypted);
      }
      // Fallback: if encryption not available, read as plain JSON
      return JSON.parse(encrypted.toString("utf-8"));
    } catch {
      return null;
    }
  }

  /** Persist tokens (encrypted via safeStorage) */
  async save(data: TokenData): Promise<void> {
    const json = JSON.stringify(data);

    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(json);
      fs.writeFileSync(this.tokenPath, encrypted);
    } else {
      // Fallback: plain JSON (less secure, but functional)
      fs.writeFileSync(this.tokenPath, json, "utf-8");
    }
  }

  /** Clear all stored tokens */
  async clear(): Promise<void> {
    try {
      if (fs.existsSync(this.tokenPath)) fs.unlinkSync(this.tokenPath);
      if (fs.existsSync(this.pkcePath)) fs.unlinkSync(this.pkcePath);
    } catch {
      // Ignore cleanup errors
    }
  }

  /** Save PKCE flow state during login (not encrypted — ephemeral) */
  async savePkceState(state: PkceFlowState): Promise<void> {
    fs.writeFileSync(this.pkcePath, JSON.stringify(state), "utf-8");
  }

  /** Load and clear PKCE flow state for callback */
  async loadPkceState(): Promise<PkceFlowState | null> {
    try {
      if (!fs.existsSync(this.pkcePath)) return null;
      const data = fs.readFileSync(this.pkcePath, "utf-8");
      // Clear after reading — PKCE state is single-use
      fs.unlinkSync(this.pkcePath);
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}
