GitHub Copilot Instructions — Impress

These instructions define the project-wide baseline for work in this repository.
Branch- or subsystem-specific architecture belongs in `.github/instructions/*.instructions.md`.
When working in an area covered by one of those files, treat the matching
instruction file as the implementation-detail source of truth.

PROJECT CONTEXT
This repository is metarhia/impress, a high-performance server runtime using:

- worker_threads concurrency
- hot-reload and filesystem watch
- strict backward-compatibility requirements across the Metarhia ecosystem

GENERAL RULES

- Do not break existing public APIs or user-visible behavior without a clear reason.
- Preserve backward compatibility unless the change explicitly requires otherwise.
- Keep code, tests, and documentation in sync.
- Prefer minimal changes that preserve the current external behavior.
- Keep module boundaries intact; do not introduce unnecessary coupling.

FILE OWNERSHIP

- `.github/copilot-instructions.md` contains only repository-wide, branch-agnostic rules.
- `AGENTS.md` contains workflow/process rules for agents.
- `.github/instructions/*.instructions.md` contains branch- or subsystem-specific implementation details.

BRANCH-AWARE INSTRUCTION SELECTION

- Instruction files in `.github/instructions/` may include a `branch` field in their YAML frontmatter.
- A file with `branch: X` applies ONLY when the current Git branch is `X`.
- When multiple instruction files match an edited file's path, determine the current Git branch and follow ONLY the instruction file whose `branch` value matches. Ignore all non-matching branch-scoped files.
- Instruction files WITHOUT a `branch` field are general and apply to all branches.
- If no instruction file matches the current branch, do not invent constraints from non-matching files.

WORKING RULES FOR INSTRUCTION FILES

- Before changing files matched by an instruction file's `applyTo`, read that instruction file.
- Multiple instruction files may coexist for different modules, subsystems, or branches; keep each focused and scoped.
- If a branch-specific instruction file and the code diverge, update the instruction file to match the code in the current branch.

SYNCING BRANCH-SPECIFIC INSTRUCTIONS

- Branch-specific instruction files are stored on the `CopilotInstructions` branch and synced to feature branches as untracked files.
- They MUST NOT be committed on feature branches or included in pull requests.
- To sync, run: `.github/scripts/sync-instructions.ps1` (PowerShell) or the equivalent shell commands.
- First-time bootstrap (when the script is not yet present locally):
  `git fetch origin CopilotInstructions; git checkout origin/CopilotInstructions -- .github/instructions/ .github/scripts/; git reset HEAD -- .github/instructions/ .github/scripts/`

TESTING

- Validate changes with the existing test suite when behavior may be affected.
- Update or add tests when behavior, integration, or configuration semantics change.

FINAL RULE
This file defines only the baseline constraints for Impress. Do not place branch- or subsystem-specific architecture here; keep that in `.github/instructions/*.instructions.md`.
