# Local ECG PoC resolution gates

These gates are provisional engineering safeguards for the browser-only PoC. They are not diagnostic or medical thresholds.

## Why the former 640 x 360 gate was replaced

The former gate applied one canvas-wide minimum to both supported layouts. At 640 px canvas width, a 3 x 4 cell is about 147 px wide, while a 6 x 2 cell is about 304 px wide. Therefore canvas width alone did not represent the sampling available to one lead and unnecessarily rejected usable 6 x 2 candidates.

## Stage requirements

| Stage | Minimum canvas | Minimum width per lead | Minimum height per lead | Reason |
| --- | --- | ---: | ---: | --- |
| Layout | 320 x 180 | - | - | Enough pixels for row-period projection |
| Segmentation | - | 90 px | 32 px | Keep 12 region bounds non-degenerate |
| Polyline | - | 120 px | 40 px | Column-wise trace coverage |
| Heart rate / RR | 640 px width | 220 px | 40 px | Multiple R-peak intervals in one lead |
| QRS candidate | 640 px width | 220 px | 48 px | Horizontal duration and vertical excursion sampling |
| ST direction | 640 px width | 220 px | 48 px | Post-QRS segment and baseline direction sampling |

If a later-stage gate is not met, that item remains indeterminate. It is not replaced by a normal value.

## Synthetic downscale verification

A deterministic 6 x 2 grid-and-waveform fixture is generated in memory at widths 1200, 1000, 800, 700, 640, 600, 572, 540, and 500 px with proportional height. At every tested size the fixture retained 12/12 extracted polylines and at least 55% trace continuity. Measurement gates remain open from 1200 through 640 px and intentionally keep heart rate, RR, QRS, and ST indeterminate below 640 px. A 572 x 372 real-image trial produced unstable ungated measurements, so synthetic success alone is not used to lower the measurement threshold.

This only verifies algorithm stability on the synthetic structure. It does not establish clinical accuracy or authorize automatic acceptance of real-image findings. Real images must still pass grid, paper, extraction-quality, and physician-review safeguards.
