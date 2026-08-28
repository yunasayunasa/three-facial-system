# Expression asset bundle

This directory stores the exact v16 binary PNG expression assets as base64 text chunks because the connected GitHub writer used for the initial import writes UTF-8 files only.

Run:

```bash
npm run hydrate-assets
```

The script reconstructs the original PNG files under `assets/expressions/`. `npm install` also runs this automatically through the `prepare` script.
