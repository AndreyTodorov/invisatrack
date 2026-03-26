#!/usr/bin/env python3
"""
README Updater — CI script
Language and framework agnostic. Uses two focused API calls:
  1. Analyse context → produce change report
  2. Apply changes   → produce updated README
"""

import datetime
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print(
        "[readme-updater] ERROR: anthropic package not installed.\n"
        "Run: pip install anthropic",
        file=sys.stderr,
    )
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
SKILL_PATH  = Path(".claude/skills/readme-updater/SKILL.md")
README_PATH = Path("README.md")
MODEL       = os.getenv("README_UPDATER_MODEL", "claude-sonnet-4-5")
MAX_TOKENS  = 16000
MAX_RETRIES   = 5
RETRY_BACKOFF = 60

EXCLUDE_DIRS = [
    ".git", "vendor", "node_modules", "__pycache__",
    "target", ".gradle", "dist", "build", ".cache",
    ".venv", "venv", ".tox", "coverage", ".nyc_output",
]

MANIFESTS = [
    "package.json", "composer.json", "Gemfile", "Gemfile.lock",
    "go.mod", "go.sum", "Cargo.toml", "pyproject.toml",
    "setup.py", "requirements.txt", "pom.xml", "build.gradle",
    "mix.exs", "pubspec.yaml", "*.csproj", "Package.swift",
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def run(cmd: str, fallback: str = "") -> str:
    """Run a command, return stdout. Swallow errors — safe for optional discovery."""
    try:
        return subprocess.check_output(
            cmd, shell=True, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except subprocess.CalledProcessError:
        return fallback


def shell(cmd: str, label: str) -> str:
    """Run a command, print full output, raise on failure. Use for git/gh steps."""
    print(f"[readme-updater] $ {cmd}")
    result = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout.rstrip())
    if result.returncode != 0:
        print(f"[readme-updater] ERROR in '{label}':", file=sys.stderr)
        print(result.stderr.rstrip(), file=sys.stderr)
        raise RuntimeError(f"{label} failed with exit code {result.returncode}")
    return result.stdout.strip()


def read_file(path, fallback: str = "") -> str:
    try:
        return Path(path).read_text()
    except (FileNotFoundError, IsADirectoryError):
        return fallback


def api_call(client, **kwargs) -> str:
    """Call the Anthropic API with exponential backoff on 429s."""
    wait = RETRY_BACKOFF
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.messages.create(**kwargs)
            return response.content[0].text.strip()
        except anthropic.RateLimitError:
            if attempt == MAX_RETRIES:
                print(f"[readme-updater] ERROR: rate limit hit after {MAX_RETRIES} retries.", file=sys.stderr)
                raise
            print(f"[readme-updater] Rate limit. Waiting {wait}s (retry {attempt}/{MAX_RETRIES - 1})...")
            time.sleep(wait)
            wait *= 2
        except anthropic.APIError as e:
            print(f"[readme-updater] API error: {e}", file=sys.stderr)
            raise


# ── Context gathering ─────────────────────────────────────────────────────────
def gather_context() -> dict:
    print(f"[readme-updater] Model: {MODEL}")
    print("[readme-updater] Gathering project context...")

    last_sha = run("git log -1 --format='%H' -- README.md")
    if last_sha:
        commits = run(f"git log {last_sha}..HEAD --no-merges --format='%H%n%s%n%b%n----'")
        count   = run(f"git log {last_sha}..HEAD --no-merges --oneline | wc -l").strip()
    else:
        commits = run("git log -30 --no-merges --format='%H%n%s%n%b%n----'")
        count   = "unknown (no prior README commit)"

    print(f"[readme-updater] Commits to analyse: {count}")

    found_manifests = {}
    for name in MANIFESTS:
        for m in list(Path(".").glob(name))[:1]:
            content = read_file(m)
            if content:
                found_manifests[str(m)] = content

    env_keys = run(
        r"grep -rh "
        r"-e 'os\.environ' -e 'process\.env\.' -e 'ENV\[' "
        r"-e 'getenv(' -e 'env(' -e 'System\.getenv' "
        r"--include='*.py' --include='*.js' --include='*.ts' "
        r"--include='*.rb' --include='*.go' --include='*.php' "
        r"--include='*.java' --include='*.kt' --include='*.ex' "
        r". 2>/dev/null "
        r"| grep -oP '[A-Z][A-Z0-9_]{2,}' | sort -u | head -60",
        fallback="(could not extract)"
    )

    env_examples = run(
        "find . -maxdepth 2 -name '.env*' "
        "| grep -iE 'example|sample|template' | head -3 "
        "| xargs cat 2>/dev/null",
        fallback="(none found)"
    )

    scripts = []
    makefile_targets = run("grep -E '^[a-zA-Z_-]+:' Makefile 2>/dev/null | head -20")
    if makefile_targets:
        scripts.append(f"Makefile targets:\n{makefile_targets}")

    for f in ["package.json", "composer.json"]:
        if read_file(f):
            s = run(
                f"cat {f} | python3 -c \""
                "import sys,json; d=json.load(sys.stdin); "
                "[print(k+': '+v) for k,v in d.get('scripts',{}).items()]\""
            )
            if s:
                scripts.append(f"{f} scripts:\n{s}")

    docker_compose = read_file("docker-compose.yml", read_file("docker-compose.yaml", ""))
    dockerfile     = run("grep -E '^(FROM|EXPOSE|ENTRYPOINT|CMD|ENV)' Dockerfile 2>/dev/null")
    infra_files    = run("ls .github/workflows/ kubernetes/ helm/ terraform/ infra/ 2>/dev/null")

    exclude_args = " ".join(f"-not -path '*/{d}/*'" for d in EXCLUDE_DIRS)
    dir_tree     = run(f"find . -maxdepth 2 {exclude_args} | sort | head -60")

    return {
        "readme":         read_file(README_PATH, "(README.md not found)"),
        "last_sha":       last_sha,
        "commits":        commits or "(no commits since last README update)",
        "manifests":      found_manifests,
        "env_keys":       env_keys,
        "env_examples":   env_examples,
        "scripts":        "\n\n".join(scripts) if scripts else "(none found)",
        "docker_compose": docker_compose,
        "dockerfile":     dockerfile,
        "infra_files":    infra_files,
        "dir_tree":       dir_tree,
    }


# ── Shared context block ──────────────────────────────────────────────────────
def build_context_block(ctx: dict) -> str:
    manifest_block = "\n".join(
        f"<manifest path='{p}'>\n{c}\n</manifest>"
        for p, c in ctx["manifests"].items()
    ) or "(no manifest files found)"

    return f"""
<readme>
{ctx['readme']}
</readme>

<last_readme_commit_sha>{ctx['last_sha']}</last_readme_commit_sha>

<commits_since_last_readme_update>
{ctx['commits']}
</commits_since_last_readme_update>

<dependency_manifests>
{manifest_block}
</dependency_manifests>

<env_vars_referenced_in_source>
{ctx['env_keys']}
</env_vars_referenced_in_source>

<env_example_files>
{ctx['env_examples']}
</env_example_files>

<task_runner_scripts>
{ctx['scripts']}
</task_runner_scripts>

<docker_compose>
{ctx['docker_compose'] or '(not found)'}
</docker_compose>

<dockerfile_key_lines>
{ctx['dockerfile'] or '(not found)'}
</dockerfile_key_lines>

<infra_files>
{ctx['infra_files'] or '(none found)'}
</infra_files>

<directory_structure>
{ctx['dir_tree']}
</directory_structure>
""".strip()


# ── Call 1: change report ─────────────────────────────────────────────────────
def call_analyse(client, system: str, ctx: dict) -> str:
    print("[readme-updater] Call 1/2 — analysing changes...")
    prompt = f"""
Analyse the project context below and produce ONLY a change report.
Do NOT write any README content yet.

{build_context_block(ctx)}

Output format:

## README Change Report

### ✅ Still accurate
- <sections that need no changes>

### ⚠️ Needs update
| Section | Current content | What changed | Recommended update |
|---------|----------------|--------------|-------------------|

### ➕ Missing (not documented yet)
- <new features, commands, env vars present in code but absent from README>

### 🗑️ Stale (no longer applies)
- <sections referencing removed files, commands, or behaviour>

### 📦 Dependency changes
- Added / Removed / Upgraded: ...

If the README needs no changes, output only: "README is up-to-date. No changes needed."
""".strip()

    return api_call(client, model=MODEL, max_tokens=2000, system=system,
                    messages=[{"role": "user", "content": prompt}])


# ── Call 2: write updated README ──────────────────────────────────────────────
def call_write(client, system: str, ctx: dict, report: str) -> str:
    print("[readme-updater] Call 2/2 — writing updated README...")
    prompt = f"""
You have already analysed the project and produced this change report:

<change_report>
{report}
</change_report>

Now apply every change listed in the report to the README below.

Rules:
- Preserve the original section order and headings.
- Do not fabricate anything not found in the report or context.
- Match the existing tone and formatting style exactly.
- Update version badges only when a version change was confirmed.
- Never add or remove screenshots.
- If a Changelog section exists, prepend new entries; never rewrite history.

Current README:
<readme>
{ctx['readme']}
</readme>

Output ONLY the complete updated README.md content.
No preamble, no explanation, no code fences — just the raw markdown.
""".strip()

    return api_call(client, model=MODEL, max_tokens=MAX_TOKENS, system=system,
                    messages=[{"role": "user", "content": prompt}])


# ── Git / PR helpers ──────────────────────────────────────────────────────────
def push_pr_branch(last_sha: str) -> None:
    ts        = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    branch    = f"readme-updater/{ts}"
    short_sha = last_sha[:7] if last_sha else "initial"

    shell(f"git checkout -b {branch}", "git checkout")
    shell("git add README.md", "git add")

    # Write commit message to a temp file to avoid shell quoting issues
    commit_msg = f"docs: update README to reflect changes since {short_sha}\n\nAuto-generated by readme-updater."
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write(commit_msg)
        msg_file = f.name

    shell(f"git commit -F {msg_file}", "git commit")
    shell(f"git push origin {branch}", "git push")
    print(f"[readme-updater] Branch pushed: {branch}")

    # Write PR body to a temp file to avoid shell quoting / newline issues
    diff = run("git diff HEAD~1 README.md | head -100")
    pr_body = f"Auto-generated by readme-updater.\n\n```diff\n{diff}\n```"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(pr_body)
        body_file = f.name

    gh_available = run("which gh")
    if gh_available:
        try:
            result = shell(
                f'gh pr create '
                f'--title "docs: update README ({datetime.date.today()})" '
                f'--body-file {body_file} '
                f'--base main '
                f'--head {branch}',
                "gh pr create"
            )
            print(f"[readme-updater] PR created: {result}")
        except RuntimeError:
            print(f"[readme-updater] PR creation failed — branch {branch} is ready, open a PR manually.")
    else:
        print(f"[readme-updater] gh CLI not found — open a PR manually from branch: {branch}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    raw = read_file(SKILL_PATH)
    if not raw:
        print(f"[readme-updater] ERROR: skill not found at {SKILL_PATH}", file=sys.stderr)
        sys.exit(1)

    system = raw[raw.find("---", 3) + 3:].strip() if raw.startswith("---") else raw

    ctx    = gather_context()
    client = anthropic.Anthropic()

    report = call_analyse(client, system, ctx)
    print("\n" + report + "\n")

    if "no changes needed" in report.lower():
        print("[readme-updater] README is already up-to-date. Nothing to do.")
        sys.exit(0)

    new_readme = call_write(client, system, ctx, report)

    if not new_readme:
        print("[readme-updater] ERROR: empty response from write call.", file=sys.stderr)
        sys.exit(1)

    if new_readme.strip() == read_file(README_PATH).strip():
        print("[readme-updater] README is already up-to-date. Nothing to do.")
        sys.exit(0)

    README_PATH.write_text(new_readme)
    print("[readme-updater] README.md written.")

    if os.getenv("CI"):
        push_pr_branch(ctx["last_sha"])
    else:
        print("[readme-updater] Local run — review with: git diff README.md")


if __name__ == "__main__":
    main()