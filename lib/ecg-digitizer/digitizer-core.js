export const STANDARD_3X4_LEADS = [
  ["I", "aVR", "V1", "V4"],
  ["II", "aVL", "V2", "V5"],
  ["III", "aVF", "V3", "V6"],
];

export function toGrayscale(image) {
  const gray = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0, p = 0; i < image.data.length; i += 4, p += 1) {
    gray[p] = Math.round(image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114);
  }
  return { width: image.width, height: image.height, data: gray };
}

export function assessImageQuality(gray) {
  const count = gray.data.length;
  if (!count) return { status: "stop", score: 0, reasons: ["画像データがありません"], metrics: {} };
  let sum = 0, sum2 = 0, clipped = 0, edgeSum = 0, edgeSum2 = 0, edgeCount = 0;
  for (const value of gray.data) {
    sum += value; sum2 += value * value;
    if (value < 5 || value > 250) clipped += 1;
  }
  for (let y = 1; y < gray.height - 1; y += 2) for (let x = 1; x < gray.width - 1; x += 2) {
    const i = y * gray.width + x;
    const lap = 4 * gray.data[i] - gray.data[i - 1] - gray.data[i + 1] - gray.data[i - gray.width] - gray.data[i + gray.width];
    edgeSum += lap; edgeSum2 += lap * lap; edgeCount += 1;
  }
  const mean = sum / count;
  const contrast = Math.sqrt(Math.max(0, sum2 / count - mean * mean));
  const edgeMean = edgeCount ? edgeSum / edgeCount : 0;
  const sharpness = edgeCount ? Math.sqrt(Math.max(0, edgeSum2 / edgeCount - edgeMean * edgeMean)) : 0;
  const clippedRatio = clipped / count;
  const reasons = [];
  if (gray.width < 640 || gray.height < 360) reasons.push("解像度不足");
  if (contrast < 18) reasons.push("コントラスト不足");
  if (sharpness < 8) reasons.push("ぼけが強い可能性");
  if (clippedRatio > 0.72) reasons.push("白飛びまたは黒つぶれが多い");
  const stop = reasons.length >= 2 || gray.width < 400 || gray.height < 240;
  const status = stop ? "stop" : reasons.length ? "limited" : "pass";
  const score = Math.max(0, Math.min(100, Math.round(100 - reasons.length * 25 - clippedRatio * 20)));
  return { status, score, reasons, metrics: { mean, contrast, sharpness, clippedRatio } };
}

export function enhanceContrast(gray) {
  let min = 255, max = 0;
  const sorted = Uint8Array.from(gray.data).sort();
  min = sorted[Math.floor(sorted.length * 0.02)] ?? 0;
  max = sorted[Math.floor(sorted.length * 0.98)] ?? 255;
  const span = Math.max(1, max - min);
  return { width: gray.width, height: gray.height, data: Uint8ClampedArray.from(gray.data, v => Math.max(0, Math.min(255, Math.round((v - min) * 255 / span)))) };
}

export function estimateSkew(gray, maxDegrees = 4) {
  const candidates = [];
  const step = Math.max(1, Math.floor(Math.min(gray.width, gray.height) / 500));
  for (let degree = -maxDegrees; degree <= maxDegrees; degree += 0.5) {
    const slope = Math.tan(degree * Math.PI / 180);
    const bins = new Float64Array(gray.height + Math.ceil(Math.abs(slope) * gray.width) + 2);
    for (let y = 0; y < gray.height; y += step) for (let x = 0; x < gray.width; x += step) {
      const darkness = 255 - gray.data[y * gray.width + x];
      if (darkness < 35) continue;
      const bin = Math.round(y - slope * x + Math.max(0, slope * gray.width));
      if (bin >= 0 && bin < bins.length) bins[bin] += darkness;
    }
    let score = 0;
    for (const value of bins) score += value * value;
    candidates.push({ degree, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] ?? { degree: 0, score: 0 };
  const second = candidates[1]?.score ?? best.score;
  return { angleDegrees: best.degree, confidence: best.score > 0 && best.score > second * 1.005 ? "medium" : "low" };
}

export function rotateGray(gray, angleDegrees, fill = 255) {
  if (!Number.isFinite(angleDegrees) || Math.abs(angleDegrees) < 0.01) return gray;
  const radians = angleDegrees * Math.PI / 180;
  const cosine = Math.cos(radians), sine = Math.sin(radians);
  const centerX = (gray.width - 1) / 2, centerY = (gray.height - 1) / 2;
  const data = new Uint8ClampedArray(gray.width * gray.height);
  data.fill(fill);
  for (let y = 0; y < gray.height; y += 1) for (let x = 0; x < gray.width; x += 1) {
    const dx = x - centerX, dy = y - centerY;
    const sourceX = Math.round(centerX + cosine * dx + sine * dy);
    const sourceY = Math.round(centerY - sine * dx + cosine * dy);
    if (sourceX >= 0 && sourceX < gray.width && sourceY >= 0 && sourceY < gray.height) {
      data[y * gray.width + x] = gray.data[sourceY * gray.width + sourceX];
    }
  }
  return { width: gray.width, height: gray.height, data };
}

export function estimatePaperQuad(gray) {
  const threshold = 245;
  const rowBounds = [];
  for (let y = 0; y < gray.height; y += 1) {
    let left = gray.width, right = -1;
    for (let x = 0; x < gray.width; x += 2) if (gray.data[y * gray.width + x] < threshold) { left = Math.min(left, x); right = Math.max(right, x); }
    if (right > left) rowBounds.push({ y, left, right });
  }
  if (rowBounds.length < gray.height * 0.4) return { status: "not_detected", corners: null };
  const top = rowBounds[Math.floor(rowBounds.length * 0.05)];
  const bottom = rowBounds[Math.floor(rowBounds.length * 0.95)];
  return { status: "candidate", corners: [{ x: top.left, y: top.y }, { x: top.right, y: top.y }, { x: bottom.right, y: bottom.y }, { x: bottom.left, y: bottom.y }] };
}

export function rectifyQuad(gray, corners) {
  if (!corners || corners.length !== 4) return gray;
  const [tl, tr, br, bl] = corners;
  const width = Math.max(1, Math.round((Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2));
  const height = Math.max(1, Math.round((Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2));
  const data = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    const v = height === 1 ? 0 : y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const u = width === 1 ? 0 : x / (width - 1);
      const topX = tl.x + (tr.x - tl.x) * u, topY = tl.y + (tr.y - tl.y) * u;
      const bottomX = bl.x + (br.x - bl.x) * u, bottomY = bl.y + (br.y - bl.y) * u;
      const sx = Math.max(0, Math.min(gray.width - 1, Math.round(topX + (bottomX - topX) * v)));
      const sy = Math.max(0, Math.min(gray.height - 1, Math.round(topY + (bottomY - topY) * v)));
      data[y * width + x] = gray.data[sy * gray.width + sx];
    }
  }
  return { width, height, data };
}

export function detectGrid(gray) {
  const darknessX = new Float64Array(gray.width), darknessY = new Float64Array(gray.height);
  for (let y = 0; y < gray.height; y += 2) for (let x = 0; x < gray.width; x += 2) {
    const d = Math.max(0, 220 - gray.data[y * gray.width + x]);
    darknessX[x] += d; darknessY[y] += d;
  }
  const period = values => {
    let bestLag = null, best = 0;
    const maxLag = Math.min(80, Math.floor(values.length / 8));
    for (let lag = 4; lag <= maxLag; lag += 1) {
      let score = 0;
      for (let i = 0; i + lag < values.length; i += 2) score += values[i] * values[i + lag];
      if (score > best) { best = score; bestLag = lag; }
    }
    return bestLag;
  };
  const xPeriod = period(darknessX), yPeriod = period(darknessY);
  return { detected: xPeriod != null && yPeriod != null, xPeriod, yPeriod, confidence: xPeriod && yPeriod ? "medium" : "low" };
}

export function segmentStandard3x4(width, height, marginRatio = 0.04) {
  const marginX = width * marginRatio, marginY = height * marginRatio;
  const usableWidth = width - 2 * marginX, usableHeight = height - 2 * marginY;
  return STANDARD_3X4_LEADS.flatMap((row, rowIndex) => row.map((lead, columnIndex) => ({
    lead,
    status: "template_candidate",
    bounds: { x: marginX + columnIndex * usableWidth / 4, y: marginY + rowIndex * usableHeight / 3, width: usableWidth / 4, height: usableHeight / 3 },
  })));
}

export function segmentStandard3x4WithLongII(width, height, mainBottomRatio, marginRatio = 0.04) {
  if (!Number.isFinite(mainBottomRatio) || mainBottomRatio < 0.58 || mainBottomRatio > 0.86) return [];
  const mainHeight = height * mainBottomRatio;
  return segmentStandard3x4(width, mainHeight, marginRatio);
}

const STANDARD_6X2_LEADS = [
  ["I", "V1"], ["II", "V2"], ["III", "V3"],
  ["aVR", "V4"], ["aVL", "V5"], ["aVF", "V6"],
];

export function segmentStandard6x2(width, height, marginRatio = 0.025) {
  const marginX = width * marginRatio, marginY = height * marginRatio;
  const usableWidth = width - 2 * marginX, usableHeight = height - 2 * marginY;
  return STANDARD_6X2_LEADS.flatMap((row, rowIndex) => row.map((lead, columnIndex) => ({
    lead,
    status: "template_candidate",
    bounds: { x: marginX + columnIndex * usableWidth / 2, y: marginY + rowIndex * usableHeight / 6, width: usableWidth / 2, height: usableHeight / 6 },
  })));
}

export function detectSupportedLayout(gray) {
  if (!gray?.width || !gray?.height || gray.width < 160 || gray.height < 120) return unknownLayout();
  const rowScores = [];
  for (let y = 0; y < gray.height; y += 1) {
    let dark = 0;
    for (let x = 0; x < gray.width; x += 2) if (gray.data[y * gray.width + x] < 90) dark += 1;
    rowScores.push(dark);
  }
  const threshold = Math.max(3, gray.width * 0.006), active = rowScores.map(value => value >= threshold);
  const minimumGap = Math.max(2, Math.round(gray.height * 0.018));
  let bands = 0, lastEnd = -minimumGap;
  for (let y = 0; y < active.length; y += 1) {
    if (!active[y]) continue;
    const start = y;
    while (y + 1 < active.length && active[y + 1]) y += 1;
    if (start - lastEnd >= minimumGap) bands += 1;
    lastEnd = y;
  }
  // The legacy band count is diagnostic only. Grid lines and tall QRS complexes can
  // join adjacent rows, so it must not be used as a default 3x4 fallback.
  const midpoint = Math.floor(gray.width / 2);
  const left = rowInkProfile(gray, 0, midpoint);
  const right = rowInkProfile(gray, midpoint, gray.width);
  const threeScores = [periodicityScore(left, 3), periodicityScore(right, 3)];
  const sixScores = [periodicityScore(left, 6), periodicityScore(right, 6)];
  const threeScore = average(threeScores), sixScore = average(sixScores);
  const minimumEvidence = 0.16, minimumSeparation = 0.12;
  const bothHalvesSupportSix = sixScores.every(score => score >= minimumEvidence);
  const bothHalvesSupportThree = threeScores.every(score => score >= minimumEvidence);
  const aspectRatio = gray.width / gray.height;
  const plausibleAspect = aspectRatio >= 0.9 && aspectRatio <= 5;
  if (plausibleAspect && bothHalvesSupportSix && sixScore - threeScore >= minimumSeparation) {
    return { layoutType: "six_by_two", confidence: sixScore - threeScore >= 0.3 ? "high" : "medium", bandCount: bands, threeScore, sixScore, aspectRatio, mainBottomRatio: null };
  }
  if (plausibleAspect && bothHalvesSupportThree && threeScore - sixScore >= minimumSeparation) {
    const longII = detectLongIIBoundary(gray);
    if (longII.detected) return { layoutType: "three_by_four_with_long_ii", confidence: longII.confidence, bandCount: bands, threeScore, sixScore, aspectRatio, mainBottomRatio: longII.mainBottomRatio };
    return { layoutType: "three_by_four", confidence: threeScore - sixScore >= 0.3 ? "high" : "medium", bandCount: bands, threeScore, sixScore, aspectRatio, mainBottomRatio: null };
  }
  return { layoutType: "unknown", confidence: "indeterminate", bandCount: bands, threeScore, sixScore, aspectRatio, mainBottomRatio: null };
}

function detectLongIIBoundary(gray) {
  const profile = Array.from(rowInkProfile(gray, 0, gray.width));
  const smooth = profile.map((_, index) => {
    const radius = Math.max(2, Math.round(gray.height * .006));
    return average(profile.slice(Math.max(0, index - radius), Math.min(profile.length, index + radius + 1)));
  });
  const searchStart = Math.round(gray.height * .58), searchEnd = Math.round(gray.height * .86);
  let boundary = searchStart, minimum = Infinity;
  for (let y = searchStart; y <= searchEnd; y += 1) if (smooth[y] < minimum) { minimum = smooth[y]; boundary = y; }
  const upper = average(smooth.slice(Math.max(0, boundary - Math.round(gray.height * .08)), boundary));
  const lower = average(smooth.slice(boundary + 1, Math.min(gray.height, boundary + Math.round(gray.height * .13))));
  const bottom = average(smooth.slice(Math.round(gray.height * .86)));
  const valleyRatio = minimum / Math.max(1, Math.min(upper, lower));
  const bottomEvidence = bottom >= average(smooth) * .45;
  const detected = valleyRatio <= .72 && bottomEvidence;
  return { detected, confidence: detected && valleyRatio <= .5 ? "high" : detected ? "medium" : "indeterminate", mainBottomRatio: detected ? boundary / gray.height : null };
}

function rowInkProfile(gray, startX, endX) {
  const profile = new Float64Array(gray.height);
  for (let y = 0; y < gray.height; y += 1) {
    let count = 0;
    for (let x = startX; x < endX; x += 2) if (gray.data[y * gray.width + x] < 70) count += 1;
    profile[y] = count;
  }
  return profile;
}

function periodicityScore(profile, rows) {
  const values = Array.from(profile), cap = percentileValue(values, 0.98);
  const clipped = values.map(value => Math.min(value, cap));
  const mean = average(clipped), centered = clipped.map(value => value - mean);
  const expectedLag = centered.length / rows;
  const fundamental = bestCorrelation(centered, expectedLag, 0.32);
  const halfPeriod = bestCorrelation(centered, fundamental.lag / 2, 0.12);
  return Math.max(0, fundamental.score - Math.max(0, halfPeriod.score));
}

function bestCorrelation(values, expectedLag, tolerance) {
  const start = Math.max(2, Math.floor(expectedLag * (1 - tolerance)));
  const end = Math.min(values.length - 2, Math.ceil(expectedLag * (1 + tolerance)));
  let best = -1, bestLag = start;
  for (let lag = start; lag <= end; lag += 1) {
    let dot = 0, leftNorm = 0, rightNorm = 0;
    for (let index = 0; index + lag < values.length; index += 1) {
      const left = values[index], right = values[index + lag];
      dot += left * right; leftNorm += left * left; rightNorm += right * right;
    }
    const correlation = dot / Math.max(1e-9, Math.sqrt(leftNorm * rightNorm));
    if (correlation > best) { best = correlation; bestLag = lag; }
  }
  return { score: best, lag: bestLag };
}

function percentileValue(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))];
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function unknownLayout() {
  return { layoutType: "unknown", confidence: "indeterminate", bandCount: 0, threeScore: 0, sixScore: 0, aspectRatio: 0, mainBottomRatio: null };
}

export function extractPolyline(gray, region, options = {}) {
  const x0 = Math.max(0, Math.floor(region.x)), y0 = Math.max(0, Math.floor(region.y));
  const width = Math.max(1, Math.min(gray.width - x0, Math.floor(region.width)));
  const height = Math.max(1, Math.min(gray.height - y0, Math.floor(region.height)));
  const threshold = options.threshold ?? 105;
  const points = [];
  let previousY = Math.round(height / 2), detectedColumns = 0;
  for (let localX = 0; localX < width; localX += 1) {
    const candidates = [];
    for (let localY = 1; localY < height - 1; localY += 1) {
      const value = gray.data[(y0 + localY) * gray.width + x0 + localX];
      if (value <= threshold) candidates.push(localY);
    }
    if (!candidates.length) continue;
    candidates.sort((a, b) => Math.abs(a - previousY) - Math.abs(b - previousY));
    const chosen = candidates[0]; previousY = chosen; detectedColumns += 1;
    points.push({ x: x0 + localX, y: y0 + chosen });
  }
  const coverage = detectedColumns / width;
  if (coverage < 0.25) return { status: "indeterminate", baselineY: null, points: [], limitations: ["波形を連続して抽出できません"] };
  const ys = points.map(point => point.y).sort((a, b) => a - b);
  const baselineY = ys[Math.floor(ys.length / 2)] ?? null;
  return { status: "extracted", baselineY, points: simplifyPolyline(points, options.minPointDistance ?? 2), limitations: coverage < 0.6 ? ["抽出できない列が多くあります"] : [] };
}

export function extractWaveformCenterline(gray, region, options = {}) {
  const x0 = Math.max(0, Math.floor(region.x)), y0 = Math.max(0, Math.floor(region.y));
  const width = Math.max(1, Math.min(gray.width - x0, Math.floor(region.width)));
  const height = Math.max(1, Math.min(gray.height - y0, Math.floor(region.height)));
  const threshold = options.threshold ?? adaptiveDarkThreshold(gray, x0, y0, width, height), gridX = Math.max(4, options.grid?.xPeriod ?? 10), gridY = Math.max(4, options.grid?.yPeriod ?? 10);
  const gridPhaseX = estimateGridPhase(gray, x0, y0, width, height, Math.round(gridX), "x"), gridPhaseY = estimateGridPhase(gray, x0, y0, width, height, Math.round(gridY), "y");
  const columns = Array.from({ length: width }, (_, localX) => waveformRuns(gray, x0 + localX, y0, height, threshold, gridX, gridY, gridPhaseX, gridPhaseY));
  suppressPeriodicVerticalGrid(columns, gridX, height);
  const start = detectTraceStart(columns, width, height, gridX), end = detectTraceEnd(columns, width, height, gridX);
  const points = [], candidatePoints = [], missingColumns = [], ambiguousColumns = [];
  let previousY = estimateTraceBaseline(columns.slice(start, end), height), previousSlope = 0;
  for (let localX = start; localX < end; localX += 1) {
    const candidates = columns[localX];
    for (const candidate of candidates) if (candidatePoints.length < 6000) candidatePoints.push({ x: x0 + localX, y: y0 + candidate.y });
    if (!candidates.length) { missingColumns.push(x0 + localX); continue; }
    if (candidates.length > 1) ambiguousColumns.push(x0 + localX);
    const nextCandidates = columns[Math.min(end - 1, localX + 1)];
    const chosen = [...candidates].sort((left, right) => centerlineScore(left, previousY, previousSlope, nextCandidates, localX, gridX, gridY) - centerlineScore(right, previousY, previousSlope, nextCandidates, localX, gridX, gridY))[0];
    const slope = chosen.y - previousY;
    const qrsLikeVertical = chosen.width >= gridY * 1.5 && chosen.darkness >= 100;
    const strongTransient = (chosen.darkness >= 180 || qrsLikeVertical) && nextCandidates.some(next => Math.abs(next.y - previousY) <= gridY * .8 || Math.abs(next.y - chosen.y) <= gridY * .8);
    if (Math.abs(slope) > gridY * .65 && !strongTransient) { missingColumns.push(x0 + localX); continue; }
    points.push({ x: x0 + localX, y: y0 + chosen.y });
    previousY = chosen.y; previousSlope = Math.abs(slope) > gridY * .35 ? slope : previousSlope * .35;
  }
  const totalColumns = Math.max(0, end - start), trackedColumns = points.length, coverage = trackedColumns / Math.max(1, totalColumns);
  const missingSegments = contiguousSegments(missingColumns), ambiguousSegments = contiguousSegments(ambiguousColumns);
  const audit = { sourceWidth: gray.width, sourceHeight: gray.height, roi: { x: x0 + start, y: y0, width: totalColumns, height }, totalColumns, trackedColumns, missingColumns: missingColumns.length, ambiguousColumns: ambiguousColumns.length, trackingCoverage: coverage, missingSegments, ambiguousSegments, candidatePoints, legacyPoints: [] };
  if (coverage < .25) return { status: "indeterminate", baselineY: null, points: [], limitations: ["波形を連続して抽出できません"], audit };
  const baselineY = percentileValue(points.map(point => point.y), .5);
  return { status: "extracted", baselineY, points, limitations: coverage < .6 ? ["抽出できない列が多くあります"] : [], audit };
}

function waveformRuns(gray, x, y0, height, threshold, gridX, gridY, gridPhaseX, gridPhaseY) {
  const dark = [];
  for (let localY = 1; localY < height - 1; localY += 1) {
    const value = gray.data[(y0 + localY) * gray.width + x], onGrid = nearGridPhase(x, gridX, gridPhaseX) || nearGridPhase(y0 + localY, gridY, gridPhaseY);
    if (value <= threshold && !(onGrid && value > 140)) dark.push(localY);
  }
  if (!dark.length) return [];
  const runs = []; let start = dark[0], last = dark[0];
  for (const y of dark.slice(1)) {
    if (y <= last + 1) { last = y; continue; }
    runs.push(centerRun(gray, x, y0, start, last, gridY)); start = y; last = y;
  }
  runs.push(centerRun(gray, x, y0, start, last, gridY));
  return runs;
}

function estimateGridPhase(gray, x0, y0, width, height, period, axis) {
  if (!Number.isFinite(period) || period < 4) return null;
  const bins = new Float64Array(period), counts = new Uint32Array(period);
  for (let y = y0; y < y0 + height; y += 2) for (let x = x0; x < x0 + width; x += 2) {
    const value = gray.data[y * gray.width + x]; if (value < 140 || value > 230) continue;
    const coordinate = axis === "x" ? x : y, residue = ((coordinate % period) + period) % period;
    bins[residue] += 255 - value; counts[residue] += 1;
  }
  let best = 0, phase = 0; for (let index = 0; index < period; index += 1) { const score = bins[index] / Math.max(1, counts[index]); if (score > best) { best = score; phase = index; } }
  return phase;
}

function nearGridPhase(coordinate, period, phase) {
  if (phase == null) return false; const residue = ((coordinate % period) + period) % period, distance = Math.min(Math.abs(residue - phase), period - Math.abs(residue - phase)); return distance <= 1;
}

function adaptiveDarkThreshold(gray, x0, y0, width, height) {
  const values = [];
  for (let y = y0; y < y0 + height; y += 2) for (let x = x0; x < x0 + width; x += 2) values.push(gray.data[y * gray.width + x]);
  return Math.max(110, Math.min(205, percentileValue(values, .10)));
}

function centerRun(gray, x, y0, start, end, gridY) {
  const values = []; for (let y = start; y <= end; y += 1) values.push({ y, darkness: 255 - gray.data[(y0 + y) * gray.width + x] });
  const weight = values.reduce((sum, item) => sum + item.darkness, 0), y = weight ? values.reduce((sum, item) => sum + item.y * item.darkness, 0) / weight : (start + end) / 2;
  return { y, width: end - start + 1, darkness: weight / values.length, gridLike: end - start + 1 <= 2 && Math.abs(y / gridY - Math.round(y / gridY)) < .12 };
}

function suppressPeriodicVerticalGrid(columns, gridX, height) {
  const period = Math.max(4, Math.round(gridX)), tallColumns = [];
  for (let x = 0; x < columns.length; x += 1) if (columns[x].some(candidate => candidate.width >= height * .55)) tallColumns.push(x);
  if (tallColumns.length < 6) return;
  const bins = new Array(period).fill(0); for (const x of tallColumns) bins[x % period] += 1;
  const phase = bins.indexOf(Math.max(...bins));
  for (const x of tallColumns) { const distance = Math.min(Math.abs(x % period - phase), period - Math.abs(x % period - phase)); if (distance <= 1) columns[x] = []; }
}

function estimateTraceBaseline(columns, height) {
  const bins = new Float64Array(height);
  for (const candidates of columns) for (const candidate of candidates) {
    if (candidate.width > Math.max(4, height * .12)) continue;
    const y = Math.max(0, Math.min(height - 1, Math.round(candidate.y)));
    bins[y] += Math.max(1, candidate.darkness - 100) / Math.max(1, candidate.width);
  }
  let bestY = Math.round(height / 2), best = 0;
  for (let y = 0; y < bins.length; y += 1) { const score = bins[y] + (bins[y - 1] ?? 0) * .5 + (bins[y + 1] ?? 0) * .5; if (score > best) { best = score; bestY = y; } }
  return bestY;
}

function centerlineScore(candidate, previousY, previousSlope, nextCandidates, localX, gridX, gridY) {
  const predicted = previousY + Math.max(-gridY * .35, Math.min(gridY * .35, previousSlope)), delta = Math.abs(candidate.y - predicted);
  const nextDistance = nextCandidates.length ? Math.min(...nextCandidates.map(next => Math.abs(next.y - candidate.y))) : gridY;
  const steepSupport = delta > gridY && candidate.darkness >= 140 && nextDistance <= Math.max(gridY * 1.5, delta * .7);
  const continuity = steepSupport ? Math.sqrt(delta) : delta;
  const gridPenalty = candidate.gridLike ? 5 : 0, widthPenalty = candidate.width > gridY * 1.8 ? 2 : 0, darknessReward = Math.min(8, candidate.darkness / 24);
  const periodicPenalty = candidate.gridLike && localX % gridX <= 1 ? 2 : 0;
  return continuity + nextDistance * .2 + gridPenalty + periodicPenalty + widthPenalty - darknessReward;
}

function detectTraceStart(columns, width, height, gridX) {
  const searchEnd = Math.min(width - 1, Math.round(width * .18)); let lastArtifact = -1;
  for (let x = 0; x <= searchEnd; x += 1) {
    const tall = columns[x].some(candidate => candidate.width >= height * .35);
    const dense = columns[x].length >= Math.max(4, Math.round(height / Math.max(4, gridX)));
    if (tall || dense) lastArtifact = x;
  }
  return Math.min(width - 1, Math.max(0, lastArtifact + Math.round(gridX * 1.2)));
}

function detectTraceEnd(columns, width, height, gridX) {
  let firstArtifact = width;
  for (let x = Math.max(0, Math.round(width * .9)); x < width; x += 1) if (columns[x].some(candidate => candidate.width >= height * .5)) { firstArtifact = x; break; }
  return Math.max(1, firstArtifact - Math.round(gridX * .5));
}

function contiguousSegments(columns) {
  if (!columns.length) return [];
  const segments = []; let start = columns[0], end = columns[0];
  for (const value of columns.slice(1)) { if (value === end + 1) end = value; else { segments.push({ startX: start, endX: end, length: end - start + 1 }); start = value; end = value; } }
  segments.push({ startX: start, endX: end, length: end - start + 1 }); return segments;
}

export function simplifyPolyline(points, minDistance = 2) {
  if (points.length < 3) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const last = result[result.length - 1], current = points[i];
    if (Math.hypot(current.x - last.x, current.y - last.y) >= minDistance) result.push(current);
  }
  result.push(points[points.length - 1]);
  return result;
}
