#!/usr/bin/env python3
"""
README Updater — CI script
Language and framework agnostic. Gathers project context via generic
discovery, calls the Anthropic API, and writes the updated README.
"""

import datetime
import os
import subprocess
import sys
from pathlib import Path

import anthropic

# ── Config ────────────────────────────────────────────────────────────────────
SKILL_PATH  = Path(".claude/skills/readme-updater/SKILL.md")
README_PATH = Path("README.md")
MODEL       = "claude-sonnet-4-6"
MAX_TOKENS  = 8096

# Directories to exclude from tree scan (language-agnostic)
EXCLUDE_DIRS = [
    ".git", "vendor", "node_modules", "__pycache__",
    "target", ".gradle", "dist", "build", ".cache",
    ".venv", "venv", ".tox", "coverage", ".nyc_output",
]

# Manifest files that reveal the stack — check all, use whichever exist
MANIFESTS = [
    "package.json", "composer.json", "Gemfile", "Gemfile.lock",
    "go.mod", "go.sum", "Cargo.toml", "pyproject.toml",
    "setup.py", "requirements.txt", "pom.xml", "build.gradle",
    "mix.exs", "pubspec.yaml", "*.csproj", "Package.swift",
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def run(cmd: str, fallback: str = "") -> str:
    try:
        return subprocess.check_output(
            cmd, shell=True, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except subprocess.CalledProcessError:
        return fallback


def read_file(path, fallback: str = "") -> str:
    try:
        return Path(path).read_text()
    except (FileNotFoundError, IsADirectoryError):
        return fallback


def section(title: str, content: str) -> str:
    """Wrap content in a labeled XML-like block for the prompt."""
    if not content or content == fallback_str(content):
        return ""
    return f"<{title}>\n{content}\n</{title}>\n"


def fallback_str(s: str) -> bool:
    return s in ("", "(not found)", "(none)")


# ── Context gathering ─────────────────────────────────────────────────────────
def gather_context() -> dict:
    print("[readme-updater] Gathering project context...")

    # Git history
    last_sha = run("git log -1 --format='%H' -- README.md")
    if last_sha:
        commits = run(
            f"git log {last_sha}..HEAD --no-merges --format='%H%n%s%n%b%n----'"
        )
        count = run(f"git log {last_sha}..HEAD --no-merges --oneline | wc -l").strip()
    else:
        commits = run("git log -30 --no-merges --format='%H%n%s%n%b%n----'")
        count   = "unknown (no prior README commit)"

    print(f"[readme-updater] Commits to analyse: {count}")

    # Detect which manifest files exist and read them
    found_manifests = {}
    for name in MANIFESTS:
        matches = list(Path(".").glob(name))
        for m in matches[:1]:  # first match only
            content = read_file(m)
            if content:
                found_manifests[str(m)] = content

    # Env variable discovery (generic patterns across languages)
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

    # Task runner / script discovery
    scripts = []
    makefile_targets = run("grep -E '^[a-zA-Z_-]+:' Makefile 2>/dev/null | head -20")
    if makefile_targets:
        scripts.append(f"Makefile targets:\n{makefile_targets}")

    for f in ["package.json", "composer.json"]:
        raw = read_file(f)
        if raw:
            s = run(
                f"cat {f} | python3 -c \""
                "import sys,json; d=json.load(sys.stdin); "
                "[print(k+': '+v) for k,v in d.get('scripts',{}).items()]\""
            )
            if s:
                scripts.append(f"{f} scripts:\n{s}")

    # Container / infra
    docker_compose = read_file("docker-compose.yml",
                        read_file("docker-compose.yaml", ""))
    dockerfile = run(
        "grep -E '^(FROM|EXPOSE|ENTRYPOINT|CMD|ENV)' Dockerfile 2>/dev/null",
        fallback=""
    )
    infra_files = run(
        "ls .github/workflows/ kubernetes/ helm/ terraform/ infra/ 2>/dev/null",
        fallback=""
    )

    # Directory tree
    exclude_args = " ".join(
        f"-not -path '*/{d}/*'" for d in EXCLUDE_DIRS
    )
    dir_tree = run(
        f"find . -maxdepth 2 {exclude_args} | sort | head -60"
    )

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


# ── Prompt builder ────────────────────────────────────────────────────────────
def build_user_message(ctx: dict) -> str:
    manifest_block = "\n".join(
        f"<manifest path='{path}'>\n{content}\n</manifest>"
        for path, content in ctx["manifests"].items()
    ) or "(no manifest files found)"

    return f"""
You are running in CI mode. Skip all confirmation prompts and apply all changes directly.

Here is the full project context:

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

Instructions:
1. Print the change report to stdout (visible in CI logs).
2. Then output the full updated README wrapped in <readme_output> tags:

<readme_output>
...full README content...
</readme_output>

Do not include anything after the closing </readme_output> tag.
""".strip()


# ── Response parsing ──────────────────────────────────────────────────────────
def extract_readme(text: str) -> str | None:
    start = text.find("<readme_output>")
    end   = text.find("</readme_output>")
    if start == -1 or end == -1:
        return None
    return text[start + len("<readme_output>"):end].strip()


# ── Git / PR helpers ──────────────────────────────────────────────────────────
def push_pr_branch(last_sha: str) -> None:
    ts        = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    branch    = f"readme-updater/{ts}"
    short_sha = last_sha[:7] if last_sha else "initial"

    run(f"git checkout -b {branch}")
    run("git add README.md")
    run(f'git commit -m "docs: update README to reflect changes since {short_sha}\n\nAuto-generated by readme-updater."')
    run(f"git push origin {branch}")
    print(f"[readme-updater] Branch pushed: {branch}")

    if run("which gh"):
        diff = run("git diff HEAD~1 README.md | head -100")
        body = f"Auto-generated by readme-updater.\n\n```diff\n{diff}\n```"
        result = run(
            f'gh pr create '
            f'--title "docs: update README ({datetime.date.today()})" '
            f'--body "{body}" '
            f'--base main --head {branch} --label documentation'
        )
        print(f"[readme-updater] PR: {result}")
    else:
        print("[readme-updater] gh CLI not found — open a PR manually.")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    # Load skill as system prompt, stripping YAML frontmatter
    raw = read_file(SKILL_PATH)
    if not raw:
        print(f"[readme-updater] ERROR: skill not found at {SKILL_PATH}", file=sys.stderr)
        sys.exit(1)

    if raw.startswith("---"):
        end = raw.find("---", 3)
        system = raw[end + 3:].strip()
    else:
        system = raw

    ctx = gather_context()

    print("[readme-updater] Calling Anthropic API...")
    client   = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": build_user_message(ctx)}],
    )

    text = response.content[0].text

    # Print the change report (everything before <readme_output>)
    report_end = text.find("<readme_output>")
    if report_end > 0:
        print("\n" + text[:report_end].strip() + "\n")

    new_readme = extract_readme(text)
    if not new_readme:
        print("[readme-updater] ERROR: no <readme_output> found in response.", file=sys.stderr)
        print(text, file=sys.stderr)
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