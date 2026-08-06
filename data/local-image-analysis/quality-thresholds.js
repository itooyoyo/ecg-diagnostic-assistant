// All thresholds are provisional engineering values for deterministic image screening.
// They are not medical criteria and require validation with de-identified test images.
export const LOCAL_IMAGE_QUALITY_THRESHOLDS=Object.freeze({
  // Minimum decoded dimensions in pixels; intended to reject images too small for region review.
  minimumWidthPx:640,minimumHeightPx:360,
  // Standard deviation of 8-bit luminance; provisional low-contrast boundary.
  minimumContrastStdDev:18,
  // Laplacian standard deviation in 8-bit pixel units; provisional blur boundary.
  minimumLaplacianStdDev:8,
  // Fraction of pixels clipped near white or black; provisional exposure boundaries.
  maximumWhiteClipRatio:0.72,maximumBlackClipRatio:0.25,
  // Bright local tiles compared with the full image; provisional glare candidate boundary.
  glareTileMean:248,maximumGlareTileRatio:0.08,
  // Dark-pixel fraction close to image edges; provisional cropped-content boundary.
  maximumDarkEdgeRatio:0.08,
  // Absolute candidate angle in degrees; shown for review and never auto-applied.
  excessiveRotationDegrees:3,
  // Difference between upper/lower paper widths as a fraction; provisional perspective boundary.
  perspectiveWidthDifferenceRatio:0.12,
});
