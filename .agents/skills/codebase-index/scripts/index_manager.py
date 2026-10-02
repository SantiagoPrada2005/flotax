#!/usr/bin/env python3
"""
index_manager.py - Deterministic Codebase Index Manager & Auditor.

Manages, audits, and scaffolds INDEX.md files across repository directories
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
    ".gitignore",
    ".env"
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
    ".pen"
}

INDEX_FILENAME = "INDEX.md"

def is_ignored_dir(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    for part in rel.parts:
        if part in IGNORED_DIRS or (part.startswith(".") and part != "."):
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
    # Pattern 1: [`file.ts`](...) or [file.ts](...)
    m = re.search(r"\[`?([^`\]\(\)]+)`?\](?:\([^\)]+\))?", cell)
    if m:
        return m.group(1).strip()
    # Pattern 2: `file.ts`
    m = re.search(r"`([^`]+)`", cell)
    if m:
        return m.group(1).strip()
    # Pattern 3: raw filename
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
            # skip table dividers
            if "---" in line_clean:
                continue
            cells = [c.strip() for c in line_clean.split("|")]
            # Format: '' | col1 | col2 | col3 | col4 | ''
            if len(cells) >= 5:
                col1 = cells[1]
                fname = extract_filename_from_cell(col1)
                if not fname:
                    continue
                # filter out table header
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
        "responsibility": "TODO: Definir la responsabilidad arquitectónica principal de este directorio.",
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
        
    layer_match = re.search(r"\*\*Capa(?: Arquitectónica)?\*\*:\s*([^\n]+)", content, re.IGNORECASE)
    if not layer_match:
        layer_match = re.search(r"\*\*Layer\*\*:\s*([^\n]+)", content, re.IGNORECASE)
    if layer_match:
        res["layer"] = layer_match.group(1).strip()
        
    return res

def infer_file_hints(file_path: Path) -> Dict[str, str]:
    """Guesses initial role and exports based on file naming patterns."""
    name = file_path.name
    ext = file_path.suffix
    
    role = "Módulo de soporte"
    exports = "-"
    deps = "-"
    
    if ext == ".astro":
        if "layout" in str(file_path).lower():
            role = "Layout estructural Astro"
        elif "pages" in str(file_path).lower():
            role = "Página / Ruta de navegación"
        else:
            role = "Componente UI Astro"
        exports = "Template Astro"
    elif ext in (".ts", ".js"):
        if "action" in name.lower():
            role = "Server Action / Caso de Uso"
            exports = name.split(".")[0]
        elif "schema" in name.lower():
            role = "Definición de Esquema / Drizzle"
            exports = "Tablas, Tipos Drizzle"
        elif "client" in name.lower() or "db" in name.lower():
            role = "Cliente de base de datos / Factory"
        elif "util" in name.lower() or "helper" in name.lower():
            role = "Utilidades puras"
        elif "test" in name.lower() or "spec" in name.lower():
            role = "Suite de pruebas"
        else:
            role = "Módulo TypeScript"
    elif ext == ".sql":
        role = "Migración / Script SQL"
    elif ext == ".css":
        role = "Estilos y diseño visual"
    elif ext in (".json", ".jsonc"):
        role = "Configuración declarativa"
    elif ext in (".md", ".mdx"):
        role = "Documentación"

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
    lines.append(f"# Índice: `{display_title}`\n")
    lines.append(f"**Responsabilidad**: {existing_meta['responsibility']}")
    lines.append(f"**Capa Arquitectónica**: {existing_meta['layer']}\n")

    # Subdirectories section
    if subdirs:
        lines.append("## Subdirectorios y Módulos Hijos\n")
        lines.append("| Subdirectorio | Responsabilidad | Índice |")
        lines.append("| :--- | :--- | :--- |")
        for s in subdirs:
            s_index = s / INDEX_FILENAME
            idx_link = f"[INDEX.md](./{s.name}/INDEX.md)" if s_index.exists() else "*(Sin índice)*"
            sub_meta = extract_metadata(s_index)
            sub_resp = sub_meta["responsibility"] if s_index.exists() else f"Directorio `{s.name}`"
            lines.append(f"| [`{s.name}/`](./{s.name}/) | {sub_resp} | {idx_link} |")
        lines.append("")

    # Files section
    lines.append("## Manifiesto de Archivos\n")
    lines.append("| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |")
    lines.append("| :--- | :--- | :--- | :--- |")

    if not files:
        lines.append("| *(Ninguno)* | - | - | - |")
    else:
        for f in files:
            fname = f.name
            if fname in existing_entries:
                entry = existing_entries[fname]
                lines.append(f"| [`{fname}`](./{fname}) | {entry['role']} | {entry['exports']} | {entry['deps']} |")
            else:
                hints = infer_file_hints(f)
                lines.append(f"| [`{fname}`](./{fname}) | {hints['role']} | {hints['exports']} | {hints['deps']} |")
    
    lines.append("\n## Invariantes y Reglas del Directorio\n")
    lines.append("- Todas las modificaciones a archivos de esta carpeta deben reflejarse en este índice.")
    lines.append("- Mantener exports estrictamente tipados y respetar los límites de la capa arquitectónica.\n")
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
    
    # Priority directories that MUST have an INDEX.md if they exist
    mandatory_roots = ["src", "src/actions", "src/db", "src/lib", "src/pages", "src/layouts", "docs", "design"]

    # Gather all directories to check
    checked_dirs: Set[Path] = set()

    for m in mandatory_roots:
        p = root / m
        if p.exists() and p.is_dir():
            checked_dirs.add(p)

    # Walk repository
    for dirpath, dirnames, filenames in os.walk(root):
        dpath = Path(dirpath)
        if is_ignored_dir(dpath, root):
            dirnames.clear()
            continue

        # Filter out ignored dirs in-place to prevent traversal
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]

        files, subdirs = get_dir_files_and_subs(dpath)
        
        # Rule: Any dir with >= 3 code/doc files or subdirs warrants an index
        if len(files) >= 3 or dpath == root:
            checked_dirs.add(dpath)
        elif (dpath / INDEX_FILENAME).exists():
            checked_dirs.add(dpath)

    # Now verify each checked directory
    for dpath in sorted(checked_dirs):
        rel = dpath.relative_to(root)
        index_file = dpath / INDEX_FILENAME

        if not index_file.exists():
            issues.append(f"[FALTA ÍNDICE] Directorio `{rel}/` no tiene `{INDEX_FILENAME}`.")
            continue

        existing_entries = parse_index_file(index_file)
        disk_files, _ = get_dir_files_and_subs(dpath)
        disk_file_names = {f.name for f in disk_files}
        indexed_file_names = set(existing_entries.keys())

        # Check for unindexed files on disk
        unindexed = disk_file_names - indexed_file_names
        for u in sorted(unindexed):
            issues.append(f"[DESINCRONIZADO] Archivo `{rel}/{u}` no está registrado en `{rel}/{INDEX_FILENAME}`.")

        # Check for orphan files in index
        orphans = indexed_file_names - disk_file_names
        for o in sorted(orphans):
            issues.append(f"[ARCHIVO HUÉRFANO] Entrada `{o}` en `{rel}/{INDEX_FILENAME}` ya no existe en disco.")

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
    parser = argparse.ArgumentParser(description="Gestor y Auditor de Índices INDEX.md")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Audit command
    audit_parser = subparsers.add_parser("audit", help="Auditar consistencia de índices en el proyecto")
    audit_parser.add_argument("--root", default=".", help="Ruta raíz del proyecto")

    # Scaffold command
    scaffold_parser = subparsers.add_parser("scaffold", help="Crear o actualizar INDEX.md en una carpeta")
    scaffold_parser.add_argument("path", help="Ruta del directorio a indexar")
    scaffold_parser.add_argument("--root", default=".", help="Ruta raíz del proyecto")

    # Sync-all command
    sync_parser = subparsers.add_parser("sync-all", help="Sincronizar todos los INDEX.md existentes sin perder descripciones")
    sync_parser.add_argument("--root", default=".", help="Ruta raíz del proyecto")

    # Tree command
    tree_parser = subparsers.add_parser("tree", help="Mostrar mapa arquitectónico de índices")
    tree_parser.add_argument("--root", default=".", help="Ruta raíz del proyecto")

    args = parser.parse_args()
    root = Path(args.root).resolve()

    if args.command == "audit":
        success, issues = audit_project(root)
        if success:
            print("✅ Auditoría exitosa: Todos los directorios requeridos tienen INDEX.md y están 100% sincronizados.")
            sys.exit(0)
        else:
            print(f"❌ Se encontraron {len(issues)} discrepancia(s) en los índices:")
            for issue in issues:
                print(f"  - {issue}")
            print("\nAcción requerida: Ejecuta `python .agents/skills/codebase-index/scripts/index_manager.py scaffold <dir>` para corregir.")
            sys.exit(1)

    elif args.command == "scaffold":
        target = Path(args.path).resolve()
        if not target.exists() or not target.is_dir():
            print(f"Error: La ruta `{args.path}` no es un directorio válido.")
            sys.exit(1)
        scaffold_index(target, root)
        rel = target.relative_to(root)
        print(f"✅ INDEX.md generado/actualizado exitosamente en `{rel}/INDEX.md`.")

    elif args.command == "sync-all":
        indices = list_indices(root)
        print(f"Sincronizando {len(indices)} índices...")
        for rel_path, _, _ in indices:
            d = root / rel_path
            scaffold_index(d, root)
            print(f"  - Sincronizado `{rel_path}/INDEX.md`")
        print("✅ Sincronización completa.")

    elif args.command == "tree":
        indices = list_indices(root)
        print("🗺️  Mapa Arquitectónico de Índices:\n")
        for rel_path, resp, layer in indices:
            display = "/" if str(rel_path) == "." else f"/{rel_path}"
            print(f"📁 {display}")
            print(f"   ├─ Capa: {layer}")
            print(f"   └─ Propósito: {resp}\n")

if __name__ == "__main__":
    main()
