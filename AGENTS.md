## Rules

Within the repository,

- Never create or edit tests. You may run existing tests or write/run one-off tests in temporary directories.
- Never create or edit documentation.

## Commands

This project uses `vp` (vite-plus) for running package commands.

### Notes

- `vpr {command}`: Main entry to run repository scripts. Follows the following format: `vpr [package.json -> "name"]#[package.json -> "script.{name}"||vite.config.js -> "run.tasks.{name}"]`
  - `vp run --help` for more syntax help.
- `vpr -w {command}` will run scripts located in the workspace root from any child directory.
- `vpr -w pkg`: Build all wrenjs packages.

## Guidance

- Prefer `vite` / `vite-plus` native APIs.
- Check `${workspace_root}/node_modules/{package}` / `./node_modules/{package}` for up-to-date APIs and information on a package.
