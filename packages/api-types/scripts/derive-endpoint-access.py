#!/usr/bin/env python3
"""Derive src/endpoint-access.js from the backend's route source.

    python3 scripts/derive-endpoint-access.py ../../civic-backend

Role gating lives in FastAPI ``Depends(require_role(...))`` declarations, which
OpenAPI does not carry — the generated ``schema.d.ts`` cannot tell you that
``POST /admin/admins`` is closed to ward admins. So this walks the route modules
with ``ast`` and reads the dependencies directly.

The `surfaces` column is derived by scanning the two apps for call sites, so it
answers "does anything actually use this route" rather than "should it".

Longer term the better home for this is the backend: attach ``x-roles`` to each
operation in ``custom_openapi()`` and this script disappears. Until then, rerun
it whenever backend route dependencies change.
"""

from __future__ import annotations

import ast
import json
import os
import re
import sys

ADMIN_ROLES = ["admin", "district_admin", "taluka_admin", "ward_admin"]
ALL_ROLES = ["citizen", "worker"] + ADMIN_ROLES

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND = os.path.dirname(os.path.dirname(PKG))


def parse_routes(backend: str) -> list[dict]:
    """Walk app/routes/*.py and pull out (method, path, dependencies)."""
    routes_dir = os.path.join(backend, "app", "routes")
    if not os.path.isdir(routes_dir):
        sys.exit(f"not a backend checkout: {backend} (no app/routes)")

    found = []
    for fn in sorted(os.listdir(routes_dir)):
        if not fn.endswith(".py") or fn == "__init__.py":
            continue
        tree = ast.parse(open(os.path.join(routes_dir, fn)).read())

        prefix = ""
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign) and any(
                getattr(t, "id", None) == "router" for t in node.targets
            ):
                if isinstance(node.value, ast.Call):
                    for kw in node.value.keywords:
                        if kw.arg == "prefix":
                            prefix = ast.literal_eval(kw.value)

        for node in tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in node.decorator_list:
                if not isinstance(dec, ast.Call):
                    continue
                f = dec.func
                if not (
                    isinstance(f, ast.Attribute)
                    and isinstance(f.value, ast.Name)
                    and f.value.id == "router"
                ):
                    continue
                method = f.attr.upper()
                if method not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                    continue

                deps = []
                args = node.args.args + node.args.kwonlyargs
                defaults = (
                    [None] * (len(node.args.args) - len(node.args.defaults))
                    + list(node.args.defaults)
                    + list(node.args.kw_defaults)
                )
                for a, d in zip(args, defaults):
                    src = ast.unparse(d) if d is not None else ""
                    if "Depends(" in src:
                        m = re.search(r"Depends\(([^)]*)\)", src)
                        dep = m.group(1) if m else src
                        if dep not in ("get_db", ""):
                            deps.append(dep)

                found.append(
                    {
                        "method": method,
                        "path": prefix + ast.literal_eval(dec.args[0]),
                        "deps": deps,
                        "router": fn[:-3],
                    }
                )
    return found


def roles_for(deps: list[str]) -> list[str] | None:
    if not deps:
        return None  # unauthenticated
    out: set[str] = set()
    for dep in deps:
        if dep == "require_any_admin":
            out |= set(ADMIN_ROLES)
        elif dep.startswith("require_role"):
            out |= set(re.findall(r"'([a-z_]+)'", dep))
        else:  # get_current_user and anything custom: assume all roles
            out |= set(ALL_ROLES)
    return [r for r in ALL_ROLES if r in out]


def collect_calls(app_dir: str) -> set[tuple[str, str]]:
    """Every (METHOD, path) an app calls, with template params normalised."""
    pat = re.compile(
        r"""\b(?:api|axios)?\.?(get|post|put|patch|delete)\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")"""
    )
    pat2 = re.compile(
        r"""\bapi(Get|Post|Put|Patch|Delete)\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")"""
    )
    fetch = re.compile(r"""fetch\s*\(\s*`\$\{[^}]*\}([^`?]*)""")

    calls: set[tuple[str, str]] = set()
    for dirpath, _, files in os.walk(app_dir):
        if "node_modules" in dirpath or "__tests__" in dirpath:
            continue
        for f in files:
            if not f.endswith((".js", ".jsx")) or "example" in f:
                continue
            src = open(os.path.join(dirpath, f), errors="ignore").read()
            for m in list(pat.finditer(src)) + list(pat2.finditer(src)):
                url = m.group(2)[1:-1]
                if url.startswith("/") and not url.startswith("//"):
                    calls.add(
                        (m.group(1).upper(), re.sub(r"\$\{[^}]*\}", "{}", url.split("?")[0]))
                    )
            for m in fetch.finditer(src):
                calls.add(("POST", m.group(1)))
    return calls


def main() -> None:
    backend = sys.argv[1] if len(sys.argv) > 1 else os.path.join(FRONTEND, "..", "civic-backend")
    routes = parse_routes(backend)

    # Two endpoints are declared on the app object in main.py rather than on a
    # router, so the AST walk above does not see them.
    routes += [
        {"method": "GET", "path": "/", "deps": [], "router": "main"},
        {"method": "GET", "path": "/health/pool", "deps": [], "router": "main"},
    ]

    admin_calls = collect_calls(os.path.join(FRONTEND, "admin"))
    mobile_calls = collect_calls(os.path.join(FRONTEND, "mobile"))

    def key(method: str, path: str) -> tuple[str, str]:
        return (method, re.sub(r"\{[^}]*\}", "{}", path))

    entries = {}
    for r in sorted(routes, key=lambda r: (r["path"], r["method"])):
        k = key(r["method"], r["path"])
        surfaces = []
        if k in admin_calls:
            surfaces.append("admin")
        if k in mobile_calls:
            surfaces.append("mobile")
        entries[f'{r["method"]} {r["path"]}'] = {
            "roles": roles_for(r["deps"]),
            "surfaces": surfaces,
            "router": r["router"],
        }

    body = "\n".join(
        [
            "/**",
            " * Endpoint access manifest — GENERATED. Do not hand-edit.",
            " * Refresh with:",
            " *   python3 scripts/derive-endpoint-access.py ../../civic-backend",
            " *",
            " * `roles`    the roles the backend accepts. `null` means unauthenticated.",
            " *            Route-level only: several admin routes additionally narrow",
            " *            results by jurisdiction via `apply_admin_scope`, so a",
            " *            `ward_admin` who is listed here can still receive 403 or an",
            " *            empty page for anything outside their ward.",
            " * `surfaces` which app currently calls it. `[]` means neither — either a",
            " *            backend-only concern (health, setup) or an unwired feature.",
            " */",
            "",
            f"export const ADMIN_ROLES = {json.dumps(ADMIN_ROLES)};",
            f"export const ALL_ROLES = {json.dumps(ALL_ROLES)};",
            "",
            f"export const ENDPOINT_ACCESS = {json.dumps(entries, indent=2)};",
            "",
        ]
    )
    out = os.path.join(PKG, "src", "endpoint-access.js")
    open(out, "w").write(body)

    public = sum(1 for e in entries.values() if e["roles"] is None)
    admin_only = sum(
        1
        for e in entries.values()
        if e["roles"] and set(e["roles"]) <= set(ADMIN_ROLES)
    )
    unwired = sum(1 for e in entries.values() if not e["surfaces"])
    print(
        f"{out}: {len(entries)} endpoints "
        f"({public} public, {admin_only} admin-only, {unwired} called by neither app)"
    )


if __name__ == "__main__":
    main()
