---
name: readme
description: Generates or updates comprehensive, production-ready README.md files for any project. Follows a strict 20-section structure with placeholders, formatting rules, and support for both creation and update modes.
---

# Claude Skill: README.md Generator & Updater

## Trigger

When the user asks to "generate a README", "update the README", "create documentation", or provides a codebase/project description and expects a `README.md` output.

## Role

Act as a **senior technical writer and open-source maintainer** with 10+ years of experience writing documentation for developer tools, SaaS products, and internal projects.

## Instructions

Analyze the provided codebase, file structure, or project description and produce a **comprehensive, production-ready `README.md`** file. Follow the structure below strictly. Omit a section ONLY if it is genuinely irrelevant (e.g., no API → skip API Reference).

---

## README Structure (in order)

### 1. Title & Badges

- Project name as H1.
- One-line description directly under the title.
- Badge row: build status, version/release, license, coverage, last commit, open issues (use shields.io format as placeholders the user can fill in).

```markdown
# Project Name

> One-line elevator pitch of the project.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
```

### 2. Table of Contents

- Auto-generated Markdown TOC linking to every H2 section.

### 3. Overview

- 2–4 paragraph explanation of:
  - **What** the project does.
  - **Why** it exists (problem it solves).
  - **Who** it's for (target audience).
- If applicable, include a screenshot, GIF, or architecture diagram placeholder.

### 4. Features

- Bulleted list of **key features**, each with a one-sentence explanation.
- Group features into logical categories if there are more than 8.

### 5. Tech Stack

- Table format: Technology | Role | Version
- Include all languages, frameworks, databases, infrastructure, and CI/CD tools detected or described by the user.

### 6. Prerequisites

- Exact software, tools, and minimum versions required before installation.
- OS-specific notes if relevant.

### 7. Installation

- Step-by-step numbered instructions.
- Separate paths for different environments (e.g., containerized, local, production) if applicable.
- Include **every command** — assume the reader is copying and pasting.
- End with a verification step ("You should see…").

### 8. Configuration

- Table of **all** environment variables: Variable | Description | Default | Required
- Example `.env` file as a fenced code block.
- Explain any non-obvious config values.

### 9. Usage

- How to start/run the project after installation.
- At least 2–3 practical examples with code blocks.
- CLI commands, API calls, or UI workflows — whatever applies.

### 10. Project Structure

- Directory tree (use `tree` style formatting) of the most important directories and files.
- Brief annotation for each directory explaining its purpose.
- Derive the tree from the user's actual project; do not invent directories.

### 11. API Reference (if applicable)

- Table or list of endpoints: Method | Endpoint | Description | Auth Required
- Link to full API docs (Swagger/Postman) if they exist.

### 12. Database Schema (if applicable)

- Key tables/models and their relationships described briefly.
- ER diagram placeholder or Mermaid diagram block.

### 13. Testing

- How to run the full test suite.
- How to run a specific test.
- Coverage reporting command.
- Types of tests included (unit, feature, integration, e2e).

### 14. Deployment

- Step-by-step deployment instructions for the primary target environment.
- CI/CD pipeline description if applicable.
- Post-deployment verification steps.

### 15. Troubleshooting / FAQ

- At least 3–5 common issues with solutions.
- Format: **Problem** → **Cause** → **Solution**.

### 16. Roadmap (optional)

- Upcoming features or known planned improvements as a checklist.

### 17. Contributing

- How to fork, branch, commit, and submit a PR.
- Code style rules and linting setup.
- Link to `CONTRIBUTING.md` if it exists.

### 18. License

- License type with link to `LICENSE` file.

### 19. Acknowledgements (optional)

- Credits to libraries, inspiration, contributors.

### 20. Contact / Support

- Maintainer name, email, or link to issue tracker.

---

## Formatting Rules

1. **Language**: Clear, concise, professional English. No filler words. No "simply", "just", or "easy".
2. **Code blocks**: Always specify the language for syntax highlighting.
3. **Consistency**: Use the same heading style, list style, and tense throughout.
4. **Links**: All internal references must be relative. All external links must be absolute.
5. **Line length**: Keep lines under 120 characters where possible for readability in terminals.
6. **Placeholders**: Use `<PLACEHOLDER_NAME>` format for anything the user must fill in. List all placeholders at the end in a comment block so the user can find/replace them.

## Update Mode

When updating an existing README:

1. Preserve the user's existing structure and tone.
2. Identify missing sections from the structure above and suggest additions.
3. Fix inconsistencies, broken links, outdated info.
4. Add any new features, config, or dependencies the user mentions.
5. Output the full updated file — never a partial diff.

## Output

- Return the result as a **single Markdown artifact** titled `README.md`.
- After the artifact, provide a short checklist of `<PLACEHOLDER>` values the user needs to fill in.
