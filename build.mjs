#!/usr/bin/env node
/**
 * Build a distributable zip of the JobTread skill.
 *
 * Output:
 *   dist/jobtread-skill.zip        — the skill, flat (SKILL.md at root)
 *   dist/jobtread-skill.zip.sha256 — SHA-256 checksum
 *
 * The zip contains everything a chat app needs to load the skill:
 *   SKILL.md, README.md, api-guide.md, .env.example, .gitignore,
 *   package.json, references/, workflows/, scripts/
 *
 * It excludes: node_modules/, package-lock.json, test/, tsconfig.json,
 * vitest.config.ts, dist/, .git/, .env, build.mjs, and this script.
 *
 * Usage:
 *   node build.mjs              # build with default name
 *   node build.mjs --name=foo   # build as dist/foo.zip
 *   node build.mjs --clean      # only clean dist/, don't build
 *
 * Requires the `zip` command (preinstalled on macOS and most Linux distros).
 */
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname);
const DIST = join(ROOT, 'dist');

// --- Parse args ---
const args = process.argv.slice(2);
const nameArg = args.find(a => a.startsWith('--name='));
const cleanOnly = args.includes('--clean');
const ZIP_NAME = nameArg ? nameArg.slice(7) : 'jobtread-skill';

// --- Files / dirs to include at the zip root ---
const INCLUDE_FILES = [
    'SKILL.md',
    'README.md',
    'api-guide.md',
    '.env.example',
    '.gitignore',
    'package.json',
];
const INCLUDE_DIRS = ['references', 'workflows', 'scripts'];

// --- Excluded patterns (within included dirs) ---
const EXCLUDE_NAMES = new Set([
    'node_modules',
    '.git',
    'dist',
    'test',
    '.env',
    'package-lock.json',
    'tsconfig.json',
    'vitest.config.ts',
    'build.mjs',
    '.DS_Store',
    '__pycache__',
]);

function log(msg) {
    process.stdout.write(msg + '\n');
}

function humanSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// --- Clean ---
function clean() {
    if (existsSync(DIST)) {
        rmSync(DIST, { recursive: true, force: true });
    }
    mkdirSync(DIST, { recursive: true });
}

// --- Stage files into a temp directory (flat — SKILL.md at root) ---
function stage() {
    const STAGE = join(DIST, '.stage');
    rmSync(STAGE, { recursive: true, force: true });
    mkdirSync(STAGE, { recursive: true });

    let fileCount = 0;

    for (const file of INCLUDE_FILES) {
        const src = join(ROOT, file);
        if (!existsSync(src)) {
            log(`  WARN: ${file} not found, skipping`);
            continue;
        }
        cpSync(src, join(STAGE, file));
        fileCount++;
    }

    for (const dir of INCLUDE_DIRS) {
        const src = join(ROOT, dir);
        if (!existsSync(src)) {
            log(`  WARN: ${dir}/ not found, skipping`);
            continue;
        }
        // Copy the dir, then prune excluded files from the staged copy.
        const dest = join(STAGE, dir);
        cpSync(src, dest, { recursive: true });
        pruneExcluded(dest);
        fileCount += countFiles(dest);
    }

    log(`  Staged ${fileCount} files`);
    return STAGE;
}

function pruneExcluded(dirPath) {
    for (const entry of readdirSync(dirPath)) {
        const full = join(dirPath, entry);
        if (EXCLUDE_NAMES.has(entry) || entry.startsWith('.DS_Store')) {
            rmSync(full, { recursive: true, force: true });
            continue;
        }
        if (statSync(full).isDirectory()) {
            pruneExcluded(full);
        }
    }
}

function countFiles(dirPath) {
    let n = 0;
    for (const entry of readdirSync(dirPath)) {
        const full = join(dirPath, entry);
        if (statSync(full).isDirectory()) {
            n += countFiles(full);
        } else {
            n++;
        }
    }
    return n;
}

// --- Zip the staged directory (flat — contents at zip root) ---
function zip(STAGE) {
    const zipPath = join(DIST, `${ZIP_NAME}.zip`);
    // Use `zip -r` from inside the stage dir so paths are relative (flat at zip root).
    // -X excludes extra file attributes (e.g. .DS_Store junk).
    // -q quiets the per-file output.
    execSync(`zip -r -q -X "${zipPath}" .`, { cwd: STAGE, stdio: 'pipe' });

    // Clean up the stage dir.
    rmSync(STAGE, { recursive: true, force: true });

    const size = statSync(zipPath).size;
    log(`  Created ${ZIP_NAME}.zip (${humanSize(size)})`);
    return zipPath;
}

// --- Generate SHA-256 checksum ---
function checksum(zipPath) {
    const data = readFileSync(zipPath);
    const hash = createHash('sha256').update(data).digest('hex');
    const checksumPath = zipPath + '.sha256';
    // Write "<hash>  <basename>" format (standard shasum format)
    const basename = zipPath.split('/').pop();
    writeFileSync(checksumPath, `${hash}  ${basename}\n`);
    log(`  Checksum ${basename}.sha256 (${hash.slice(0, 16)}…)`);
    return checksumPath;
}

// --- Verify the zip contents (list them) ---
function verify(zipPath) {
    log('\nZip contents:');
    let listing;
    try {
        listing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
    } catch {
        // unzip not available — try `zipinfo` as a fallback.
        try {
            listing = execSync(`zipinfo "${zipPath}"`, { encoding: 'utf8' });
        } catch {
            log('  (could not list zip contents — unzip/zipinfo not available)');
            return;
        }
    }
    // Print just the file lines (skip header/footer), trimmed.
    const lines = listing.split('\n').filter(l => {
        const t = l.trim();
        if (!t) return false;
        if (t.startsWith('Archive:')) return false;
        if (t.startsWith('Length')) return false;
        if (t.includes('---')) return false;
        if (t.match(/^\d+\s+files?$/)) return false;
        if (t.match(/^\d+\s+file$/)) return false;
        return true;
    });
    for (const l of lines) {
        log('  ' + l.trim());
    }
}

// --- Main ---
function main() {
    log(`\nBuilding ${ZIP_NAME}.zip …\n`);
    clean();
    if (cleanOnly) {
        log('  Cleaned dist/ (--clean specified, skipping build)');
        return;
    }
    const STAGE = stage();
    const zipPath = zip(STAGE);
    checksum(zipPath);
    verify(zipPath);
    log(`\nDone. Output in dist/:`);
    for (const f of readdirSync(DIST)) {
        const full = join(DIST, f);
        if (statSync(full).isFile()) {
            log(`  dist/${f}  (${humanSize(statSync(full).size)})`);
        }
    }
    log('');
}

main();
