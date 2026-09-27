# Nimi development packages

These complete npm archives preserve the package combination already accepted
by this App. They are tracked so root `pnpm install --frozen-lockfile` also works
in a fresh checkout without copying files from a developer's ignored workspace.

The declarations remain in `package.json`; `pnpm-workspace.yaml` selects these
archives, and `pnpm-lock.yaml` records their integrity. Provenance and SHA-256
digests are in [README.nimi.md](../../README.nimi.md#exact-local-package-combination).
Package licenses and notices are retained inside each unmodified archive.

These development packages are not a public Nimi release. Public-release
preflight still requires registry resolutions. The current cohort includes the
macOS ARM64 native carrier; it does not establish Windows native acceptance.
