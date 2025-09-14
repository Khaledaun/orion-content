import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { env } from "@/lib/env/validation";

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
};

export class PasswordManager {
  private static readonly SALT_ROUNDS = 12;
  private static readonly RESET_TOKEN_EXPIRY = 3600000; // 1 hour in ms

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcryptjs.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Validate password against policy
   */
  static validatePassword(
    password: string,
    policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(
        `Password must be at least ${policy.minLength} characters long`,
      );
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (
      policy.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    // Check for common weak patterns
    if (/^(.)\1+$/.test(password)) {
      errors.push("Password cannot be all the same character");
    }

    if (
      /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
        password,
      )
    ) {
      errors.push("Password cannot contain sequential characters");
    }

    const commonPasswords = [
      "password",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password123",
      "admin",
      "letmein",
      "welcome",
      "monkey",
    ];

    if (
      commonPasswords.some((common) => password.toLowerCase().includes(common))
    ) {
      errors.push("Password cannot contain common words or patterns");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure password reset token
   */
  static generateResetToken(): {
    token: string;
    hashedToken: string;
    expiresAt: Date;
  } {
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHmac("sha256", env.ENCRYPTION_KEY)
      .update(token)
      .digest("hex");

    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

    return { token, hashedToken, expiresAt };
  }

  /**
   * Verify a password reset token
   */
  static verifyResetToken(token: string, hashedToken: string): boolean {
    const computedHash = crypto
      .createHmac("sha256", env.ENCRYPTION_KEY)
      .update(token)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hashedToken, "hex"),
      Buffer.from(computedHash, "hex"),
    );
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = uppercase + lowercase + numbers + symbols;

    let password = "";

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Check if password needs to be changed based on age
   */
  static isPasswordExpired(
    lastChanged: Date,
    policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  ): boolean {
    const daysSinceChange =
      (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange > policy.maxAge;
  }

  /**
   * Calculate password strength score (0-100)
   */
  static calculatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 8) score += 20;
    else feedback.push("Use at least 8 characters");

    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    else feedback.push("Add lowercase letters");

    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push("Add uppercase letters");

    if (/\d/.test(password)) score += 10;
    else feedback.push("Add numbers");

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    else feedback.push("Add special characters");

    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push("Avoid repeated characters");
    }

    if (/^(.{1,2})\1+$/.test(password)) {
      score -= 20;
      feedback.push("Avoid repeated patterns");
    }

    // Bonus for mixed case and numbers
    if (
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    ) {
      score += 15;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      feedback: feedback.slice(0, 3), // Limit feedback to top 3 items
    };
  }
}
