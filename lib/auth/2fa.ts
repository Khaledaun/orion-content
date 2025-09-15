import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { env } from "@/lib/env/validation";

export interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  usedBackupCode?: string;
}

export class TwoFactorAuth {
  private static readonly APP_NAME = "Orion CMS";
  private static readonly BACKUP_CODES_COUNT = 10;
  private static readonly BACKUP_CODE_LENGTH = 8;

  /**
   * Generate a new 2FA secret and QR code
   */
  static async generateSecret(userEmail: string): Promise<TwoFactorSecret> {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: this.APP_NAME,
      length: 32,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32!,
      qrCodeUrl,
      manualEntryKey: secret.base32!,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(
    token: string,
    secret: string,
    window: number = 1,
  ): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: token.replace(/\s/g, ""), // Remove any spaces
      window, // Allow for time drift
    });
  }

  /**
   * Verify a token or backup code
   */
  static verifyTokenOrBackupCode(
    token: string,
    secret: string,
    backupCodes: string[],
  ): TwoFactorVerification {
    // First try TOTP verification
    if (this.verifyToken(token, secret)) {
      return { isValid: true };
    }

    // Then try backup codes
    const cleanToken = token.replace(/\s/g, "").toLowerCase();
    const matchingBackupCode = backupCodes.find(
      (code) => code.toLowerCase() === cleanToken,
    );

    if (matchingBackupCode) {
      return {
        isValid: true,
        usedBackupCode: matchingBackupCode,
      };
    }

    return { isValid: false };
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = crypto
        .randomBytes(this.BACKUP_CODE_LENGTH / 2)
        .toString("hex")
        .toUpperCase();

      // Format as XXXX-XXXX for readability
      const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
      codes.push(formattedCode);
    }

    return codes;
  }

  /**
   * Hash backup codes for secure storage
   */
  static hashBackupCodes(codes: string[]): string[] {
    return codes.map((code) =>
      crypto
        .createHmac("sha256", env.ENCRYPTION_KEY)
        .update(code.toLowerCase())
        .digest("hex"),
    );
  }

  /**
   * Verify a backup code against hashed codes
   */
  static verifyBackupCode(code: string, hashedCodes: string[]): boolean {
    const hashedInput = crypto
      .createHmac("sha256", env.ENCRYPTION_KEY)
      .update(code.toLowerCase().replace(/\s/g, ""))
      .digest("hex");

    return hashedCodes.some((hashedCode) =>
      crypto.timingSafeEqual(
        Buffer.from(hashedCode, "hex"),
        Buffer.from(hashedInput, "hex"),
      ),
    );
  }

  /**
   * Generate a time-based token for testing
   */
  static generateToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: "base32",
    });
  }

  /**
   * Get the current time step for TOTP
   */
  static getCurrentTimeStep(): number {
    return Math.floor(Date.now() / 1000 / 30);
  }

  /**
   * Check if 2FA setup is complete
   */
  static isSetupComplete(secret?: string, isEnabled?: boolean): boolean {
    return !!(secret && isEnabled);
  }

  /**
   * Generate recovery information
   */
  static generateRecoveryInfo(userEmail: string): {
    recoveryCode: string;
    hashedRecoveryCode: string;
    expiresAt: Date;
  } {
    const recoveryCode = crypto.randomBytes(16).toString("hex").toUpperCase();
    const hashedRecoveryCode = crypto
      .createHmac("sha256", env.ENCRYPTION_KEY)
      .update(recoveryCode)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return { recoveryCode, hashedRecoveryCode, expiresAt };
  }

  /**
   * Verify recovery code
   */
  static verifyRecoveryCode(code: string, hashedCode: string): boolean {
    const computedHash = crypto
      .createHmac("sha256", env.ENCRYPTION_KEY)
      .update(code.toUpperCase())
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hashedCode, "hex"),
      Buffer.from(computedHash, "hex"),
    );
  }

  /**
   * Format backup codes for display
   */
  static formatBackupCodesForDisplay(codes: string[]): string {
    return codes
      .map(
        (code, index) => `${(index + 1).toString().padStart(2, "0")}. ${code}`,
      )
      .join("\n");
  }

  /**
   * Validate TOTP setup parameters
   */
  static validateSetupParams(
    secret: string,
    token: string,
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (!secret || secret.length < 16) {
      return { isValid: false, error: "Invalid secret provided" };
    }

    if (!token || token.length !== 6 || !/^\d{6}$/.test(_token)) {
      return { isValid: false, error: "Token must be 6 digits" };
    }

    if (!this.verifyToken(token, secret)) {
      return { isValid: false, error: "Invalid token provided" };
    }

    return { isValid: true };
  }
}
