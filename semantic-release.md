# Semantic Release with Protected Main Branch

This project uses [semantic-release](https://semantic-release.gitbook.io/) to automate versioning and changelogs. Because `main` is protected by a ruleset that requires pull requests, semantic-release uses a **GitHub App** token to bypass the rules — this keeps humans (including admins) subject to the PR requirement while allowing only CI to push directly.

---

## How it works

1. A PR is merged into `main`
2. The `Release` workflow triggers
3. The workflow generates a short-lived token using a GitHub App
4. semantic-release uses that token to push a release commit and tag back to `main`

---

## Setup

### Step 1 — Create a GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Fill in the form:
   - **GitHub App name**: anything, e.g. `invisatrack-releaser`
   - **Homepage URL**: `https://github.com/AndreyTodorov/invisatrack`
   - **Webhook**: uncheck **Active** (not needed)
3. Set **Repository permissions**:
   - **Contents**: Read and write
   - **Pull requests**: Read and write
4. Under **Where can this GitHub App be installed?**: select **Only on this account**
5. Click **Create GitHub App**
6. Note the **App ID** shown at the top of the app settings page

### Step 2 — Generate a private key

1. On the app settings page, scroll to **Private keys**
2. Click **Generate a private key**
3. A `.pem` file downloads — keep it safe

### Step 3 — Install the app on the repository

1. On the app settings page, click **Install App** in the left sidebar
2. Click **Install** next to your account
3. Select **Only select repositories** → choose `invisatrack`
4. Click **Install**

### Step 4 — Add the app as a bypass actor in the ruleset

1. Go to **repo → Settings → Rules → Rulesets → Protect main**
2. Under **Bypass list**, click **Add bypass**
3. Search for your app by name and select it
4. Set bypass mode to **Always**
5. Save the ruleset

### Step 5 — Add secrets to the repository

1. Go to **repo → Settings → Secrets and variables → Actions → New repository secret**
2. Add two secrets:

   | Name | Value |
   |------|-------|
   | `APP_ID` | The numeric App ID from Step 1 |
   | `APP_PRIVATE_KEY` | The full contents of the `.pem` file from Step 2 |

   For `APP_PRIVATE_KEY`, paste the entire file contents including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines.

### Step 6 — Workflow (already configured)

The release workflow at `.github/workflows/release.yml` already uses the app token:

```yaml
- name: Generate app token
  id: app-token
  uses: actions/create-github-app-token@v1
  with:
    app-id: ${{ secrets.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}

- name: Release
  env:
    GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
  run: npx semantic-release
```

No changes needed here.

---

## Verification

After merging a PR with a conventional commit (e.g. `feat: ...` or `fix: ...`), the Release workflow should:

- Run without permission errors
- Create a new GitHub release with a version tag
- Push a `chore(release): x.x.x` commit to `main`

Check the workflow run logs under **Actions → Release** for details.

---

## Troubleshooting

**`HttpError: Resource not accessible by integration`**
The app is not installed on the repo or the bypass actor was not added to the ruleset.

**`Error: secretOrPrivateKey must have a value`**
The `APP_PRIVATE_KEY` secret is missing or malformed. Make sure the full PEM contents are pasted, including header/footer lines.

**Release commit triggers another release run**
Normal — semantic-release ignores its own release commits (`chore(release): ...`) by default.
