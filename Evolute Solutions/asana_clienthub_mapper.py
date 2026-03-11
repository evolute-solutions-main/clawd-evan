#!/usr/bin/env python3
"""Map clients in client-entities.json to Asana Client Hub 3.0 task GIDs.

- Reads ASANA_PAT from /Users/max/clawd/.secrets.env
- Pulls tasks from Client Hub project
- Matches by normalized name (very simple heuristic)
- Writes back asana.clientHubTaskGid
- Produces a report of matched/unmatched/ambiguous

This is intended as a one-time bootstrap + re-runnable verifier.
"""

import json
import os
import re
import sys
import time
from urllib.parse import urlencode
import subprocess

ROOT = "/Users/max/clawd"
SECRETS = os.path.join(ROOT, ".secrets.env")
DB = os.path.join(ROOT, "Evolute Solutions", "client-entities.json")
PROJECT_GID = os.environ.get("ASANA_CLIENT_HUB_PROJECT_GID", "1213220062504456")


def read_pat() -> str:
    if not os.path.exists(SECRETS):
        raise SystemExit(f"Missing secrets file: {SECRETS}")
    for line in open(SECRETS, "r", encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("ASANA_PAT="):
            pat = line.split("=", 1)[1].strip()
            if not pat:
                raise SystemExit("ASANA_PAT is empty in .secrets.env")
            return pat
    raise SystemExit("ASANA_PAT not found in .secrets.env")


STOPWORDS = {
    "llc","inc","co","company",
    "construction","remodeling","remodel","builders","builder","build",
    "services","solutions","design","home","homes",
}

def norm(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"\(.*?\)", " ", s)  # drop parentheticals
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def tokens(s: str) -> set[str]:
    t = [x for x in norm(s).split() if x and x not in STOPWORDS]
    return set(t)

def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    uni = len(a | b)
    return inter / uni


def asana_get(pat: str, path: str, params: dict | None = None) -> dict:
    """Use curl instead of urllib because local Python SSL trust store may be misconfigured."""
    base = "https://app.asana.com/api/1.0"
    url = base + path
    if params:
        url += "?" + urlencode(params)
    proc = subprocess.run(
        [
            "curl",
            "-sS",
            "-H",
            f"Authorization: Bearer {pat}",
            url,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(proc.stdout)


def fetch_project_tasks(pat: str, project_gid: str) -> list[dict]:
    tasks = []
    offset = None
    while True:
        params = {"limit": 100, "opt_fields": "name,gid"}
        if offset:
            params["offset"] = offset
        obj = asana_get(pat, f"/projects/{project_gid}/tasks", params)
        tasks.extend(obj.get("data", []))
        nxt = obj.get("next_page")
        if not nxt or not nxt.get("offset"):
            break
        offset = nxt["offset"]
        time.sleep(0.2)
    return tasks


def main():
    pat = read_pat()
    with open(DB, "r", encoding="utf-8") as f:
        db = json.load(f)

    tasks = fetch_project_tasks(pat, PROJECT_GID)
    task_by_norm: dict[str, list[dict]] = {}
    task_tokens: dict[str, set[str]] = {}
    for t in tasks:
        n = norm(t.get("name", ""))
        task_by_norm.setdefault(n, []).append(t)
        task_tokens[t["gid"]] = tokens(t.get("name", ""))

    matched = []
    ambiguous = []
    unmatched = []

    for c in db.get("clients", []):
        name = c.get("businessName", "")
        key = norm(name)
        candidates = task_by_norm.get(key, [])
        if len(candidates) == 1:
            gid = candidates[0]["gid"]
            c.setdefault("asana", {})
            c["asana"]["clientHubTaskGid"] = gid
            matched.append((c["id"], name, gid))
        elif len(candidates) > 1:
            ambiguous.append((c["id"], name, [x["gid"] for x in candidates], [x["name"] for x in candidates]))
        else:
            # fallback: (1) compact substring match, then (2) token similarity
            def compact(s: str) -> str:
                return re.sub(r"[^a-z0-9]+", "", norm(s))

            ccomp = compact(name)
            compact_hits = []
            if ccomp:
                for t in tasks:
                    tcomp = compact(t.get("name", ""))
                    if ccomp in tcomp or tcomp in ccomp:
                        compact_hits.append(t)
            if len(compact_hits) == 1:
                gid = compact_hits[0]["gid"]
                c.setdefault("asana", {})
                c["asana"]["clientHubTaskGid"] = gid
                matched.append((c["id"], name, gid))
            elif len(compact_hits) > 1:
                ambiguous.append((c["id"], name, [x["gid"] for x in compact_hits], [x["name"] for x in compact_hits]))
            else:
                ctoks = tokens(name)
                scored = []
                for t in tasks:
                    score = jaccard(ctoks, task_tokens[t["gid"]])
                    if score > 0:
                        scored.append((score, t))
                scored.sort(key=lambda x: x[0], reverse=True)
                if scored and scored[0][0] >= 0.45:
                    best_score, best = scored[0]
                    second = scored[1][0] if len(scored) > 1 else 0
                    if best_score - second >= 0.15:
                        gid = best["gid"]
                        c.setdefault("asana", {})
                        c["asana"]["clientHubTaskGid"] = gid
                        matched.append((c["id"], name, gid))
                    else:
                        ambiguous.append((c["id"], name, [x[1]["gid"] for x in scored[:5]], [x[1]["name"] for x in scored[:5]]))
                else:
                    unmatched.append((c["id"], name))

    # write back
    with open(DB, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)
        f.write("\n")

    print(f"Client Hub project tasks fetched: {len(tasks)}")
    print(f"Matched: {len(matched)} | Ambiguous: {len(ambiguous)} | Unmatched: {len(unmatched)}")
    if ambiguous:
        print("\nAMBIGUOUS:")
        for cid, name, gids, names in ambiguous:
            print(f"- {cid} ({name}) -> {list(zip(gids, names))}")
    if unmatched:
        print("\nUNMATCHED:")
        for cid, name in unmatched:
            print(f"- {cid} ({name})")


if __name__ == "__main__":
    main()
