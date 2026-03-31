# Development Guidelines

## Project Scope

- Treat `C:\Codex\Hyeri-Books` as the only project root.
- Treat `C:\Codex\Hyeri-Books\.shrimp-data` as the only valid shrimp task manager data directory.
- Keep all shrimp task manager state inside `.shrimp-data`.
- Do not infer missing modules, folders, or architecture. Re-scan the repository before adding new rules.

## Current File Map

### Root Files

- Reference `1.xls` before proposing any spreadsheet-related change.
- Do not modify, rename, move, or delete `1.xls` unless the user explicitly requests it.
- Create new project documents in the root only when they are directly requested or required for task execution.

### Data Directory

- Use `.shrimp-data` only for shrimp task manager internal data.
- Do not store user-facing deliverables inside `.shrimp-data`.
- Do not manually reorganize `.shrimp-data` contents unless the user explicitly asks for migration or cleanup.

## Implementation Rules

### File Creation

- Create `shrimp-rules.md` in the project root when initializing project rules.
- Place new operational notes in root-level Markdown files unless the user specifies a different location.
- Add new directories only when task output cannot fit the current flat structure.

### File Modification

- Check the repository recursively before editing rules.
- Update `shrimp-rules.md` whenever the project gains new source folders, build files, or workflow files.
- When adding automation or scripts, document the exact file paths that must be touched together.

## AI Decision Rules

### Priority Order

- Follow explicit user path instructions first.
- Follow existing on-disk structure second.
- Minimize file creation when the repository is still sparse.

### Do

- Do use `C:\Codex\Hyeri-Books\.shrimp-data` as the shrimp data location in all future task-manager work.
- Do re-scan the repository before extending standards.
- Do keep instructions imperative and project-specific when updating this file.

### Do Not

- Do not add generic coding conventions unrelated to this repository.
- Do not describe project functionality at length.
- Do not invent multi-file coordination rules before those files exist.
- Do not place arbitrary artifacts inside `.shrimp-data`.

## Change Triggers

- Update this file immediately after new top-level files or folders are added.
- Add coordination rules only after real paired files or workflows are confirmed in the repository.
