# Open ECG Digitizer isolated PoC

This directory contains only the audit wrapper and reproducible dependency record. It does not import into Next.js or the ECG rule engine.

The following remain local and ignored by Git:

- `.local-models/open-ecg-digitizer/source`: official upstream checkout and weights
- `.oed-venv`: dedicated Python 3.12 environment
- `tools/open-ecg-digitizer-poc/input`: anonymized test images
- `tools/open-ecg-digitizer-poc/output`: signals, masks, overlays, plots, and JSON

Run from the repository root:

```powershell
$env:PYTHONUTF8='1'
$env:MPLBACKEND='Agg'
.\.oed-venv\Scripts\python.exe tools\open-ecg-digitizer-poc\run_poc.py `
  --source .local-models\open-ecg-digitizer\source `
  --image tools\open-ecg-digitizer-poc\input\ecg.png `
  --output tools\open-ecg-digitizer-poc\output\wrapper
```

The wrapper preserves missing samples as JSON `null` and does not perform diagnosis or call the 57-rule engine.
