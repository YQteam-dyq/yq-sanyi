import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const skipDirs = new Set(['node_modules', '.git', 'dist']);
const codeExts = new Set(['.ts', '.js', '.mjs', '.cjs', '.html', '.css']);
const violations = [];

function isRootResidual(name) {
  return (
    name === 'GETTING-STARTED.md' ||
    name === 'PROJECT-SUMMARY.md' ||
    name === 'build.js' ||
    name === 'final-test.html' ||
    /^debug-.*\.mjs$/.test(name) ||
    /^test-.*\.mjs$/.test(name) ||
    /^test-.*\.cjs$/.test(name)
  );
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) {
      continue;
    }
    const file = join(dir, name);
    const st = statSync(file);
    if (st.isDirectory()) {
      walk(file, out);
    } else {
      out.push(file);
    }
  }
}

function maskStrings(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += quote;
      i++;
      while (i < n) {
        const c = text[i];
        if (c === '\\') {
          out += c;
          if (i + 1 < n) {
            out += text[i + 1];
          }
          i += 2;
          continue;
        }
        out += c === '\n' ? '\n' : ' ';
        if (c === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function tokenHits(masked, cssOnly) {
  const hits = [];
  let i = 0;
  const n = masked.length;
  while (i < n) {
    if (!cssOnly && masked.startsWith('//', i)) {
      hits.push({ index: i, kind: 'line comment //' });
      const nl = masked.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
      continue;
    }
    if (masked.startsWith('/*', i)) {
      hits.push({ index: i, kind: 'block comment /*' });
      const end = masked.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (masked.startsWith('<!--', i)) {
      hits.push({ index: i, kind: 'html comment <!--' });
      const end = masked.indexOf('-->', i + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    i++;
  }
  return hits;
}

function locate(text, index) {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: index - lineStart + 1 };
}

function extractFences(md) {
  const fences = [];
  const lines = md.split('\n');
  let i = 0;
  while (i < lines.length) {
    const match = /^```(\w*)/.exec(lines[i]);
    if (match) {
      const lang = match[1];
      const lineOffset = i + 1;
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++;
      }
      fences.push({ lang, text: buf.join('\n'), lineOffset });
      continue;
    }
    i++;
  }
  return fences;
}

function fenceScanType(lang) {
  if (lang === 'js' || lang === 'ts' || lang === 'mjs' || lang === 'javascript' || lang === 'typescript') {
    return 'js';
  }
  if (lang === 'html') {
    return 'html';
  }
  if (lang === 'css') {
    return 'css';
  }
  return null;
}

function addViolation(rel, absLine, column, kind) {
  violations.push(rel + ':' + absLine + ':' + column + ' contains ' + kind);
}

const files = [];
walk(root, files);
for (const file of files) {
  const rel = relative(root, file);
  if (!rel.includes('/') && isRootResidual(rel)) {
    continue;
  }
  const ext = extname(file);
  const text = readFileSync(file, 'utf8');
  if (ext === '.md') {
    for (const fence of extractFences(text)) {
      const scanType = fenceScanType(fence.lang);
      if (!scanType) {
        continue;
      }
      const masked = maskStrings(fence.text);
      for (const hit of tokenHits(masked, scanType === 'css')) {
        const loc = locate(fence.text, hit.index);
        addViolation(rel, fence.lineOffset + loc.line - 1, loc.column, hit.kind + ' in ' + fence.lang + ' code fence');
      }
    }
    continue;
  }
  if (!codeExts.has(ext)) {
    continue;
  }
  const masked = maskStrings(text);
  for (const hit of tokenHits(masked, ext === '.css')) {
    const loc = locate(text, hit.index);
    addViolation(rel, loc.line, loc.column, hit.kind);
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.log('check-no-comments: ' + violation);
  }
  process.exit(1);
}
console.log('check-no-comments: ok - source, examples and docs code fences contain no comments');
