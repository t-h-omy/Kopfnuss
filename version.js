// Kopfnuss - Version Configuration
// Update this version number when deploying new releases

/**
 * App version information
 * Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes
 * - MINOR: New features
 * - PATCH: Bug fixes
 */
export const VERSION = {
  major: 1,
  minor: 28,
  patch: 3,
  get string() {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  get cache() {
    return `kopfnuss-v${this.major}-${this.minor}-${this.patch}`;
  }
};

/**
 * Release date
 */
export const RELEASE_DATE = '2025-12-09';

/**
 * Build information
 */
export const BUILD_INFO = {
  version: VERSION.string,
  releaseDate: RELEASE_DATE,
  cacheName: VERSION.cache
};
