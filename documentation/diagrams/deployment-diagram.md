# Build and release deployment

```mermaid
flowchart LR
  PR["Pull request / feature push"] --> CI["Ubuntu: types + unit tests + build + browser UI"]
  TAG["Version tag v*"] --> MATRIX["GitHub Actions OS matrix"]
  MATRIX --> WIN["Windows NSIS"]
  MATRIX --> MAC["macOS DMG + ZIP"]
  MATRIX --> LINUX["Linux AppImage"]
  WIN --> DRAFT["Draft GitHub release + update metadata"]
  MAC --> DRAFT
  LINUX --> DRAFT
  DRAFT --> REVIEW["Manual native testing and release review"]
  REVIEW --> PUBLISH["Maintainer publishes release"]
  PUBLISH --> CLIENT["Packaged app checks GitHub feed"]
```

The default workflow builds unsigned artifacts. Certificates, notarization, and trusted Windows signing are not configured. No release is automatically published from the draft.
