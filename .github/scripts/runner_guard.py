"""Fail when a workflow job could run on a billed or unapproved runner.

This repository is public. GitHub's standard hosted runners are free here, but
larger runners (-N-cores, -arm, -gpu) and third-party runners such as
Blacksmith are billed, and self-hosted runners must never run untrusted PR
code. Self-hosted jobs are allowed only when listed in SELF_HOSTED_OK as
"<workflow file>:<job id>".

Fail-closed: runs-on must be literal labels or ${{ matrix.os }} over a literal
os list. Any other shape raises and is rejected, including other expressions,
expression-built matrices, runner groups and reusable workflows from other
repositories.

Actions storage is billed to the org even for public repositories, and the org
runs out of free storage early in the month. So the guard also rejects writes
to GitHub cache storage: actions/cache, a `cache:` input on setup-node or
setup-python, setup-uv without `enable-cache: false` (it caches by default on
GitHub-hosted runners), and setup-go without `cache: false`. Artifact uploads
must set retention-days of 3 or less; the Pages artifact is exempt because the
deploy needs it.
"""

import os
import pathlib
import sys

import yaml

FREE = {
    "ubuntu-latest", "ubuntu-24.04", "ubuntu-22.04",
    "windows-latest", "windows-2025", "windows-2022",
    "macos-latest", "macos-15", "macos-14",
}
UNPROVABLE = (KeyError, TypeError, ValueError, AttributeError)


def runner_labels(job: dict) -> set:
    """Every label the job can select; raises when that cannot be proven."""
    if "uses" in job:
        if not job["uses"].startswith("./"):
            raise ValueError("reusable workflow from another repository")
        return set()
    runs_on = job["runs-on"]
    if runs_on == "${{ matrix.os }}":
        matrix = job["strategy"]["matrix"]
        runs_on = matrix["os"] + [x["os"] for x in matrix.get("include", []) if "os" in x]
    labels = [runs_on] if isinstance(runs_on, str) else list(runs_on)
    if not labels or any("${{" in label for label in labels):
        raise ValueError(f"runs-on {runs_on!r} is not literal")
    return set(labels)


def storage_problems(key: str, job: dict) -> list:
    """Steps that would write GitHub Actions cache or long-lived artifacts."""
    found = []
    for index, step in enumerate(job.get("steps") or []):
        uses = str(step.get("uses", ""))
        name = uses.split("@", 1)[0]
        options = step.get("with") or {}
        where = f"{key}: step {index + 1} ({uses or step.get('name', 'run')})"
        if name in ("actions/cache", "actions/cache/save"):
            found.append(f"{where}: writes GitHub cache storage")
        elif name in ("actions/setup-node", "actions/setup-python") and options.get("cache"):
            found.append(f"{where}: cache: writes GitHub cache storage")
        elif name == "astral-sh/setup-uv" and str(options.get("enable-cache", "")).lower() != "false":
            found.append(f"{where}: needs enable-cache: false")
        elif name == "actions/setup-go" and str(options.get("cache", "")).lower() != "false":
            found.append(f"{where}: needs cache: false")
        elif name == "actions/upload-artifact":
            days = options.get("retention-days")
            if not isinstance(days, int) or days > 3:
                found.append(f"{where}: needs retention-days of 3 or less")
    return found


def problems(workflows: pathlib.Path, approved: set) -> list:
    found = []
    for workflow in sorted(workflows.glob("*.y*ml")):
        for job_id, job in (yaml.safe_load(workflow.read_text()).get("jobs") or {}).items():
            key = f"{workflow.name}:{job_id}"
            found.extend(storage_problems(key, job))
            try:
                labels = runner_labels(job)
            except UNPROVABLE as error:
                found.append(f"{key}: cannot prove the runner is free ({error!r})")
                continue
            if "self-hosted" in labels:
                labels = set() if key in approved else {"unapproved self-hosted"}
            if labels - FREE:
                found.append(f"{key}: may run on {sorted(labels - FREE)}")
    return found


if __name__ == "__main__":
    approved = set(filter(None, os.environ.get("SELF_HOSTED_OK", "").replace(" ", "").split(",")))
    found = problems(pathlib.Path(".github/workflows"), approved)
    print("\n".join(found) or "All jobs use free standard runners or approved self-hosted ones, and no job writes GitHub cache storage.")
    sys.exit(1 if found else 0)
