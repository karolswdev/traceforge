# Publishing Traceforge

You can publish Traceforge to npmjs or to GitHub Packages. npmjs is the default. GitHub Packages requires a scoped name.

## npmjs.com (public)

1. Ensure `package.json` has:
   - `name: "traceforge"`
   - `publishConfig.access: "public"`
2. Create an npm token with publish rights and add it as `NPM_TOKEN` repo secret.
3. Tag a release: `git tag v0.1.0 && git push origin v0.1.0`.
4. GitHub Actions will run `.github/workflows/release.yml` and publish to npm.

Local publish:

```bash
npm ci && npm run build
npm publish --access public
```

## GitHub Packages (npm registry)

GitHub’s npm registry requires scoped package names that match the owner. For this repo, use `@karolswdev/traceforge`.

Options:

- Permanent: Change `package.json` name to `"@karolswdev/traceforge"` and publish to GitHub Packages (and optionally npm as unscoped using a separate build).
- Ephemeral (used by our release workflow): Temporarily scope the name during CI before publishing to GitHub Packages.

Setup:

1. Create a classic Personal Access Token with `packages:write` and add it as `GH_PACKAGES_PAT` repo secret.
2. Workflow publishes on tags via `.github/workflows/release.yml`. It uses:

```yaml
- uses: actions/setup-node@v4
  with:
    registry-url: https://npm.pkg.github.com
...
- run: npm pkg set name=@karolswdev/traceforge
- run: npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GH_PACKAGES_PAT }}
```

Local publish to GitHub Packages:

```bash
echo "//npm.pkg.github.com/:_authToken=YOUR_PAT" > ~/.npmrc
npm pkg set name=@karolswdev/traceforge
npm publish --registry https://npm.pkg.github.com
```

## Other registries

- GitLab Package Registry, Azure Artifacts, or self-hosted Verdaccio work similarly. Point your registry and auth in `.npmrc`, and ensure the scope (if required) matches the provider rules.

