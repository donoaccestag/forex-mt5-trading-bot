# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Project name: Boilerplates CLI

A Python CLI for managing infrastructure boilerplates, template libraries, template rendering, and validation. Built with Typer and Jinja2.

## Scope and precedence

- This file applies to the repository tree rooted at the directory containing this `AGENTS.md` file.
- More deeply nested `AGENTS.md` files may add or override instructions for their subtrees.
- Before GitHub-facing work such as issues, branches, PRs, merges, tags, or releases, read this file and the relevant docs listed below.
- For release-related work, always read `RELEASE.md` first.

## Repository map

- Source: `cli/` - main CLI application and core runtime code.
- Tests: `tests/` - automated tests, fixtures, and test utilities.
- Contribution guide: `CONTRIBUTING.md` - setup, validation, GitHub workflow, and command overview.
- Docs: `docs/` - developer documentation and architecture notes.
- Release process: `RELEASE.md` - release PR, version, changelog, tag, and publish workflow.
- Scripts: `scripts/` - installer and helper scripts.
- GitHub automation: `.github/` - workflows, issue/PR templates, and repository scripts.
- Legacy library: `library/` - backward-compatibility template content for versions older than `0.2.0`; not the canonical modern template library.

## Documentation

Project documentation lives in `docs/`.

Agents should read the relevant docs before making changes and update docs when behavior, configuration, or workflows change.

### Documentation map

- `docs/architecture.md` - repository layout, module system, and core runtime components
- `docs/templates.md` - template format, variables, rendering, and validation behavior
- `docs/libraries.md` - library configuration and canonical external template library guidance
- `docs/display.md` - DisplayManager and CLI output rules

## Validation

Default checks before finishing code changes:

```bash
ruff check --fix .
ruff format .
python3 -m pytest
```

See `CONTRIBUTING.md` for setup and workflow details.

## Project conventions

- Follow existing project structure, naming, and patterns before introducing new ones.
- Keep changes focused on the requested task; avoid unrelated refactors or broad rewrites.
- When adding or changing behavior, update relevant docs and tests where practical.
- Do not commit secrets, tokens, private keys, or environment-specific credentials.
- Use custom exceptions from `cli/core/exceptions.py` for user-facing errors where applicable.
- Use `DisplayManager` for user-facing command output; never print directly from command, module, config, repository, validation, or template-rendering code. See `docs/display.md`.
- Do not treat `library/` as the canonical source for current template work. For `0.2.0+`, active templates live in the separate `boilerplates-library` repository. See `docs/libraries.md`.
- When answering which template kinds are supported, prefer registered modules in `cli/modules/` over legacy library contents.
