# Display and Output Rules

## Critical rule

User-facing command output should go through `DisplayManager` or one of the display classes under `cli/core/display/`.

Do not:

- call `console.print()` from command, module, config, repository, validation, or template-rendering code
- import `Console` from `rich.console` for general command output outside display classes or `cli/__main__.py`
- use direct emojis or icons in feature code
- bypass display helpers for status, errors, warnings, tables, or template output

Do:

- use `module_instance.display` in module/command code
- use `DisplayManager()` when standalone core command code needs output
- add or adjust display helpers in `cli/core/display/` when new output patterns are needed
- add shortcode/icon mappings in the display/icon layer

## Rationale

Centralized display handling keeps CLI output consistent and makes it easier to manage:

- formatting standards
- quiet/verbose behavior
- stderr/stdout routing
- icon and Nerd Font usage
- table rendering
- error/warning/success styles

## Display architecture

`DisplayManager` acts as a facade over focused display components.

Current responsibilities include:

- variable rendering and variable tables
- template metadata and file-tree rendering
- status, error, warning, success, and info messages
- data/status/config tables
- markdown/description rendering

External code should call facade methods on `DisplayManager`. Internally, the facade delegates to specialized display classes.

Example:

```python
display = DisplayManager()
display.success("Template generated")
display.error("Validation failed", details="Missing variable")
```

If a needed display method does not exist, add one to the display layer instead of printing directly from feature code.

Prompt/input internals under `cli/core/input/` may use Rich prompt primitives directly when implementing interactive input behavior. Keep regular command output in the display layer.
