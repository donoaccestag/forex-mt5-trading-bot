# Library and Configuration Notes

## Canonical template library

The canonical template library does **not** live in this repository for modern development.

- The checked-in `library/` directory is legacy/backward-compatibility content for versions older than `0.2.0`.
- For `0.2.0+`, active template work belongs in the separate GitHub repository `boilerplates-library`.

When answering questions about supported kinds or current template behavior, prefer code under `cli/modules/` and runtime logic under `cli/core/` over legacy `library/` content.

## LibraryManager

`LibraryManager` loads configured libraries and discovers templates by kind.

Responsibilities:

- load library configuration
- resolve git and static library paths
- discover template directories containing `template.json`
- normalize template IDs from manifest slugs
- handle duplicate template IDs
- preserve library priority order

Git libraries are stored under:

```text
~/.config/boilerplates/libraries/{name}/
```

Git-based libraries use sparse checkout to avoid cloning unrelated repository content where possible.

## Library types

### Git libraries

Git libraries require:

- `name`
- `type: git`
- `url`
- `branch`
- `directory`

### Static libraries

Static libraries require:

- `name`
- `type: static`
- `path`

Static library paths may be absolute or relative to the config file location. Some config entries may include backward-compatible dummy `url`, `branch`, and `directory` fields.

## Priority and duplicate handling

Library priority is determined by config order. Earlier entries have higher priority.

Duplicate behavior:

- duplicate IDs within the same library raise a duplicate-template error
- duplicate IDs across libraries can be addressed with qualified IDs
- simple IDs resolve to the highest-priority library
- qualified IDs target a specific library, for example `alloy.default` or `alloy.local`

Example:

```bash
boilerplates compose show alloy
boilerplates compose show alloy.local
```

## Config location

User config is stored at:

```text
~/.config/boilerplates/config.yaml
```

Example library config:

```yaml
libraries:
  - name: default
    type: git
    url: https://github.com/user/templates.git
    branch: main
    directory: library
  - name: local
    type: static
    path: ~/my-templates
    url: ''
    branch: main
    directory: .
```

## Repository commands

Common library commands:

```bash
boilerplates repo list
boilerplates repo update
boilerplates repo add local --type static --path ~/my-templates
boilerplates repo remove local
```

Use `DisplayManager` for all output in repository/config code. Do not print directly.
