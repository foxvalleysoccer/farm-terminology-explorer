# Farm Terminology Explorer

A static, web-based training game for conservation professionals learning common farm terminology.

## Review

The local review server can run with:

```powershell
$env:PATH='C:\Users\josh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
.\node_modules\.bin\next.CMD dev -p 3000
```

Open `http://localhost:3000`.

## Build

For a static export:

```powershell
$env:PATH='C:\Users\josh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
.\node_modules\.bin\next.CMD build
```

The GitHub Pages-ready static files are written to `out/`.

If deploying to a GitHub Pages project path, set the base path before building:

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/REPOSITORY_NAME'
.\node_modules\.bin\next.CMD build
```

## Notes

- Progress is saved locally in the learner's browser with `localStorage`.
- The game uses only static files and browser-side state.
- The storyboard mentions a Livestock Farm, but the supplied Word document does not provide livestock screens. The game shows that visit as content needed rather than inventing unsupported training content.
- Accessibility support includes keyboard-operable hotspots, list alternatives for scene hotspots, visible focus states, reduced-motion handling, transcript access, and non-drag alternatives.
