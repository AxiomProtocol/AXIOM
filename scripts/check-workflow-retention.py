#!/usr/bin/env python3
"""Fail if any actions/upload-artifact step in .github/workflows is missing retention-days.

This guard prevents a regression where a developer adds a new artifact upload step
without specifying a retention period, which would silently fall back to the
repository default (typically 90 days) and bloat artifact storage.
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "PyYAML is required. Install with: pip install pyyaml\n"
    )
    sys.exit(2)

WORKFLOWS_DIR = Path(".github/workflows")
UPLOAD_ACTION_PREFIX = "actions/upload-artifact"


def step_uses_upload_artifact(step: dict) -> bool:
    uses = step.get("uses")
    if not isinstance(uses, str):
        return False
    return uses.split("@", 1)[0].strip() == UPLOAD_ACTION_PREFIX


def step_has_retention(step: dict) -> bool:
    with_block = step.get("with")
    if not isinstance(with_block, dict):
        return False
    return "retention-days" in with_block


def check_file(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        return [f"{path}: failed to parse YAML: {exc}"]

    if not isinstance(data, dict):
        return errors

    jobs = data.get("jobs")
    if not isinstance(jobs, dict):
        return errors

    for job_name, job in jobs.items():
        if not isinstance(job, dict):
            continue
        steps = job.get("steps")
        if not isinstance(steps, list):
            continue
        for index, step in enumerate(steps):
            if not isinstance(step, dict):
                continue
            if not step_uses_upload_artifact(step):
                continue
            if step_has_retention(step):
                continue
            label = step.get("name") or step.get("uses") or f"step #{index + 1}"
            errors.append(
                f"{path}: job '{job_name}' step '{label}' uses "
                f"{UPLOAD_ACTION_PREFIX} without 'retention-days' set"
            )
    return errors


def main() -> int:
    if not WORKFLOWS_DIR.is_dir():
        print(f"No workflows directory at {WORKFLOWS_DIR}; nothing to check.")
        return 0

    workflow_files = sorted(
        list(WORKFLOWS_DIR.glob("*.yml")) + list(WORKFLOWS_DIR.glob("*.yaml"))
    )
    if not workflow_files:
        print(f"No workflow files in {WORKFLOWS_DIR}; nothing to check.")
        return 0

    all_errors: list[str] = []
    for path in workflow_files:
        all_errors.extend(check_file(path))

    if all_errors:
        sys.stderr.write(
            "Artifact retention lint failed. Every actions/upload-artifact step "
            "must declare 'retention-days' under its 'with:' block.\n\n"
        )
        for err in all_errors:
            sys.stderr.write(f"  - {err}\n")
        sys.stderr.write(
            "\nFix: add 'retention-days: <N>' (e.g. 14) under the step's 'with:' block.\n"
        )
        return 1

    print(
        f"OK: all actions/upload-artifact steps in {len(workflow_files)} "
        f"workflow file(s) declare retention-days."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
