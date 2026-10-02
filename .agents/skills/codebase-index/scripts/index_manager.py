#!/usr/bin/env python3
"""
index_manager.py - Universal Codebase Index Manager & Auditor.

Automates, audits, and scaffolds INDEX.md files across repository directories
to guarantee token-efficient, hallucination-free LLM navigation and zero-drift maintenance.
"""

import os
import sys
import re
import argparse
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional

# Directories and files ignored by default
IGNORED_DIRS = {
    ".git",
    "node_modules",
    ".astro",
    "dist",
    ".pnpm-store",
    ".wrangler",
    ".gemini",
    "__pycache__",
    ".idea",
    ".vscode",
    ".next",
    "build",
    "coverage",
    ".turbo",
    ".venv",
    "venv",
    "target",
    "bin",
    "obj",
    "design-assets",
    "exports"
}

IGNORED_FILES = {
    ".DS_Store",
    "Thumbs.db",
    "INDEX.md",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "poetry.lock",
    "Cargo.lock",
    ".gitignore",
    ".env",
    ".env.local",
    ".env.example"
}

# Recognized code/asset extensions
RECOGNIZED_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".astro", ".svelte", ".vue",
    ".css", ".scss", ".sass", ".less",
    ".json", ".jsonc", ".yaml", ".yml",
    ".md", ".mdx",
    ".sql", ".graphql", ".gql",
    ".py", ".sh", ".bash",
    ".go", ".rs", ".java", ".kt", ".rb", ".php",
    ".pen"
}

INDEX_FILENAME = "INDEX.md"

def is_ignored_dir(path: Path, root: Path, custom_ignored: Set[str] = None) -> bool:
    ignored = IGNORED_DIRS if custom_ignored is None else (IGNORED_DIRS | custom_ignored)
    rel = path.relative_to(root)
    for part in rel.parts:
        if part in ignored or (part.startswith(".") and part != "."):
            return True
    return False

def get_dir_files_and_subs(dir_path: Path) -> Tuple[List[Path], List[Path]]:
    """Returns non-ignored files and non-ignored subdirectories."""
    files = []
    subdirs = []
    try:
        for entry in dir_path.iterdir():
            if entry.name in IGNORED_DIRS or entry.name in IGNORED_FILES or entry.name.startswith("."):
                continue
            if entry.is_file():
                if entry.name != INDEX_FILENAME:
                    files.append(entry)
            elif entry.is_dir() and not entry.name.startswith("."):
                subdirs.append(entry)
    except PermissionError:
        pass
    return sorted(files, key=lambda p: p.name), sorted(subdirs, key=lambda p: p.name)

def extract_filename_from_cell(cell: str) -> Optional[str]:
    """Extracts clean filename from markdown link or backticked text."""
    m = re.search(r"\[`?([^`\]\(\)]+)`?\](?:\([^\)]+\))?", cell)
    if m:
        return m.group(1).strip()
    m = re.search(r"`([^`]+)`", cell)
    if m:
        return m.group(1).strip()
    cleaned = cell.strip()
    if cleaned and not cleaned.startswith("-") and not cleaned.startswith("*"):
        return cleaned
    return None

def parse_index_file(index_path: Path) -> Dict[str, Dict[str, str]]:
    """
    Parses an existing INDEX.md.
    Extracts the file manifest table rows: {filename: {role, exports, deps}}.
    """
    if not index_path.exists():
        return {}
    
    content = index_path.read_text(encoding="utf-8")
    entries = {}
    
    in_manifest = False
    for line in content.splitlines():
        line_clean = line.strip()
        if any(h in line for h in ["## Archivos", "## File Manifest", "## Manifiesto de Archivos", "## Componentes"]):
            in_manifest = True
            continue
        if in_manifest and line_clean.startswith("## "):
            in_manifest = False
            continue
        
        if in_manifest and line_clean.startswith("|"):
            if "---" in line_clean:
                continue
            cells = [c.strip() for c in line_clean.split("|")]
            if len(cells) >= 5:
                col1 = cells[1]
                fname = extract_filename_from_cell(col1)
                if not fname:
                    continue
                if fname.lower() in ("archivo", "file", "nombre"):
                    continue
                entries[fname] = {
                    "role": cells[2] if len(cells) > 2 else "",
                    "exports": cells[3] if len(cells) > 3 else "",
                    "deps": cells[4] if len(cells) > 4 else ""
                }
    return entries

def extract_metadata(index_path: Path) -> Dict[str, str]:
    """Extracts Responsibility and Layer from INDEX.md header if present."""
    res = {
        "responsibility": "TODO: Define core domain responsibility of this directory.",
        "layer": "TODO: (e.g. Domain | Application | Infrastructure | Presentation | Shared)"
    }
    if not index_path.exists():
        return res
    
    content = index_path.read_text(encoding="utf-8")
    resp_match = re.search(r"\*\*Responsabilidad\*\*:\s*([^\n]+)", content, re.IGNORECASE)
    if not resp_match:
        resp_match = re.search(r"\*\*Responsibility\*\*:\s*([^\n]+)", content, re.IGNORECASE)
    if resp_match:
        res["responsibility"] = resp_match.group(1).strip()
        
    layer_match = re.search(r"\*\*(?:Capa(?: Arquitectónica)?|(?:Architectural )?Layer)\*\*:\s*([^\n]+)", content, re.IGNORECASE)
    if layer_match:
        res["layer"] = layer_match.group(1).strip()
        
    return res

def infer_file_hints(file_path: Path) -> Dict[str, str]:
    """Guesses initial role and exports based on file naming patterns."""
    name = file_path.name
    ext = file_path.suffix
    
    role = "Module / Utility"
    exports = "-"
    deps = "-"
    
    if ext == ".astro":
        if "layout" in str(file_path).lower():
            role = "Astro Structural Layout"
        elif "pages" in str(file_path).lower():
            role = "Page / Navigation Route"
        else:
            role = "Astro UI Component"
        exports = "Astro Template"
    elif ext in (".ts", ".js", ".mjs"):
        if "action" in name.lower():
            role = "Server Action / Use Case"
            exports = name.split(".")[0]
        elif "schema" in name.lower():
            role = "Database Schema / Models"
            exports = "Schema, Types"
        elif "client" in name.lower() or "db" in name.lower():
            role = "Client Factory / Database Provider"
        elif "util" in name.lower() or "helper" in name.lower():
            role = "Pure Utilities"
        elif "test" in name.lower() or "spec" in name.lower():
            role = "Test Suite"
        else:
            role = "TypeScript / JavaScript Module"
    elif ext == ".py":
        if "test" in name.lower():
            role = "Pytest Suite"
        elif name == "__init__.py":
            role = "Package Root / Exports"
        else:
            role = "Python Module"
    elif ext == ".sql":
        role = "SQL Migration / Script"
    elif ext in (".css", ".scss", ".sass"):
        role = "Styles & Visual Tokens"
    elif ext in (".json", ".jsonc", ".yaml", ".yml"):
        role = "Configuration File"
    elif ext in (".md", ".mdx"):
        role = "Documentation"

    return {"role": role, "exports": exports, "deps": deps}

def scaffold_index(dir_path: Path, root: Path, force_overwrite: bool = False) -> str:
    """Creates or updates INDEX.md for a directory, preserving existing descriptions."""
    index_path = dir_path / INDEX_FILENAME
    existing_entries = parse_index_file(index_path)
    existing_meta = extract_metadata(index_path)
    
    files, subdirs = get_dir_files_and_subs(dir_path)
    rel_dir = dir_path.relative_to(root)
    display_title = str(rel_dir) if str(rel_dir) != "." else "/"

    lines = []
    lines.append(f"# Index: `{display_title}`\n")
    lines.append(f"**Responsibility**: {existing_meta['responsibility']}")
    lines.append(f"**Architectural Layer**: {existing_meta['layer']}\n")

    if subdirs:
        lines.append("## Subdirectories & Child Modules\n")
        lines.append("| Subdirectory | Responsibility | Index |")
        lines.append("| :--- | :--- | :--- |")
        for s in subdirs:
            s_index = s / INDEX_FILENAME
            idx_link = f"[INDEX.md](./{s.name}/INDEX.md)" if s_index.exists() else "*(No index)*"
            sub_meta = extract_metadata(s_index)
            sub_resp = sub_meta["responsibility"] if s_index.exists() else f"Directory `{s.name}`"
            lines.append(f"| [`{s.name}/`](./{s.name}/) | {sub_resp} | {idx_link} |")
        lines.append("")

    lines.append("## File Manifest\n")
    lines.append("| File | Role / Pattern | Public Exports / API | Key Dependencies |")
    lines.append("| :--- | :--- | :--- | :--- |")

    if not files:
        lines.append("| *(None)* | - | - | - |")
    else:
        for f in files:
            fname = f.name
            if fname in existing_entries:
                entry = existing_entries[fname]
                lines.append(f"| [`{fname}`](./{fname}) | {entry['role']} | {entry['exports']} | {entry['deps']} |")
            else:
                hints = infer_file_hints(f)
                lines.append(f"| [`{fname}`](./{fname}) | {hints['role']} | {hints['exports']} | {hints['deps']} |")
    
    lines.append("\n## Invariants & Directory Rules\n")
    lines.append("- All additions, deletions, or public API modifications must be reflected in this index.")
    lines.append("- Maintain strict boundary encapsulation and domain layer separation.\n")
    lines.append("<!-- Reconciled by codebase-index -->")

    content = "\n".join(lines) + "\n"
    index_path.write_text(content, encoding="utf-8")
    return content

def audit_project(root: Path, target_dirs: Optional[List[str]] = None) -> Tuple[bool, List[str]]:
    """
    Audits the codebase for:
    1. Missing INDEX.md in architectural contexts or folders with >= 3 files.
    2. Orphaned files listed in INDEX.md that don't exist on disk.
    3. Files on disk not registered in INDEX.md.
    """
    issues = []
    
    # Priority directory names commonly representing architectural domains
    candidate_roots = ["src", "app", "lib", "core", "pkg", "docs", "design", "api"]

    checked_dirs: Set[Path] = set()

    for c in candidate_roots:
        p = root / c
        if p.exists() and p.is_dir():
            checked_dirs.add(p)

    for dirpath, dirnames, filenames in os.walk(root):
        dpath = Path(dirpath)
        if is_ignored_dir(dpath, root):
            dirnames.clear()
            continue

        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]

        files, subdirs = get_dir_files_and_subs(dpath)
        
        if len(files) >= 3 or dpath == root:
            checked_dirs.add(dpath)
        elif (dpath / INDEX_FILENAME).exists():
            checked_dirs.add(dpath)

    for dpath in sorted(checked_dirs):
        rel = dpath.relative_to(root)
        index_file = dpath / INDEX_FILENAME

        if not index_file.exists():
            issues.append(f"[MISSING INDEX] Directory `{rel}/` has no `{INDEX_FILENAME}`.")
            continue

        existing_entries = parse_index_file(index_file)
        disk_files, _ = get_dir_files_and_subs(dpath)
        disk_file_names = {f.name for f in disk_files}
        indexed_file_names = set(existing_entries.keys())

        unindexed = disk_file_names - indexed_file_names
        for u in sorted(unindexed):
            issues.append(f"[DESYNCHRONIZED] File `{rel}/{u}` is not registered in `{rel}/{INDEX_FILENAME}`.")

        orphans = indexed_file_names - disk_file_names
        for o in sorted(orphans):
            issues.append(f"[ORPHAN ENTRY] Entry `{o}` in `{rel}/{INDEX_FILENAME}` does not exist on disk.")

    success = len(issues) == 0
    return success, issues

def list_indices(root: Path) -> List[Tuple[Path, str, str]]:
    """Lists all INDEX.md files with their responsibilities and layers."""
    results = []
    for dirpath, dirnames, filenames in os.walk(root):
        dpath = Path(dirpath)
        if is_ignored_dir(dpath, root):
            dirnames.clear()
            continue
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]

        idx = dpath / INDEX_FILENAME
        if idx.exists():
            meta = extract_metadata(idx)
            results.append((dpath.relative_to(root), meta["responsibility"], meta["layer"]))
    return sorted(results, key=lambda x: str(x[0]))

def main():
    parser = argparse.ArgumentParser(description="Universal Codebase Index Manager & Auditor")
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser("audit", help="Audit index parity and completeness across repository")
    audit_parser.add_argument("--root", default=".", help="Root repository directory")

    scaffold_parser = subparsers.add_parser("scaffold", help="Generate or reconcile INDEX.md in a directory")
    scaffold_parser.add_argument("path", help="Directory path to index")
    scaffold_parser.add_argument("--root", default=".", help="Root repository directory")

    sync_parser = subparsers.add_parser("sync-all", help="Re-sync all existing INDEX.md files in repository")
    sync_parser.add_argument("--root", default=".", help="Root repository directory")

    tree_parser = subparsers.add_parser("tree", help="Display architectural sitemap of all indexed modules")
    tree_parser.add_argument("--root", default=".", help="Root repository directory")

    args = parser.parse_args()
    root = Path(args.root).resolve()

    if args.command == "audit":
        success, issues = audit_project(root)
        if success:
            print("✅ Audit successful: All required directories have INDEX.md and are 100% in sync.")
            sys.exit(0)
        else:
            print(f"❌ Found {len(issues)} index discrepanc{'ies' if len(issues) > 1 else 'y'}:")
            for issue in issues:
                print(f"  - {issue}")
            print("\nAction required: Run `python scripts/index_manager.py scaffold <dir>` to reconcile.")
            sys.exit(1)

    elif args.command == "scaffold":
        target = Path(args.path).resolve()
        if not target.exists() or not target.is_dir():
            print(f"Error: Path `{args.path}` is not a valid directory.")
            sys.exit(1)
        scaffold_index(target, root)
        rel = target.relative_to(root)
        print(f"✅ INDEX.md created/updated successfully at `{rel}/INDEX.md`.")

    elif args.command == "sync-all":
        indices = list_indices(root)
        print(f"Syncing {len(indices)} index files...")
        for rel_path, _, _ in indices:
            d = root / rel_path
            scaffold_index(d, root)
            print(f"  - Synced `{rel_path}/INDEX.md`")
        print("✅ Sync complete.")

    elif args.command == "tree":
        indices = list_indices(root)
        print("🗺️  Architectural Index Map:\n")
        for rel_path, resp, layer in indices:
            display = "/" if str(rel_path) == "." else f"/{rel_path}"
            print(f"📁 {display}")
            print(f"   ├─ Layer: {layer}")
            print(f"   └─ Purpose: {resp}\n")

if __name__ == "__main__":
    main()
