/**
 * PTY output parser — virtual terminal renderer + interactive menu parser.
 *
 * Raw PTY data is designed for a cursor-addressable terminal emulator.
 * A simple regex-strip loses whitespace created by cursor-forward (\x1b[C])
 * and garbles text re-drawn via \r + \x1b[K.  This module emulates a minimal
 * screen buffer so we recover clean, readable text with proper spacing.
 */

/* ── 1. Virtual terminal → plain text ─────────────────────────── */

export function renderToText(raw, cols = 120) {
  const screen = [[]];
  let row = 0;
  let col = 0;
  let i = 0;

  const ensureRow = (r) => {
    while (r >= screen.length) screen.push([]);
  };

  const writeChar = (ch) => {
    ensureRow(row);
    while (screen[row].length <= col) screen[row].push(' ');
    screen[row][col] = ch;
    col++;
    if (col >= cols) { col = 0; row++; ensureRow(row); }
  };

  while (i < raw.length) {
    const ch = raw[i];
    const code = ch.charCodeAt(0);

    // ── Escape sequences ──
    if (ch === '\x1b' && i + 1 < raw.length) {
      const next = raw[i + 1];

      if (next === '[') {
        // CSI sequence
        i += 2;
        let params = '';
        while (i < raw.length) {
          const c = raw.charCodeAt(i);
          if (c >= 0x30 && c <= 0x3f) { params += raw[i]; i++; }
          else break;
        }
        while (i < raw.length) {
          const c = raw.charCodeAt(i);
          if (c >= 0x20 && c <= 0x2f) { i++; }
          else break;
        }
        const cmd = i < raw.length ? raw[i] : '';
        i++;

        // Private mode sequences (\x1b[?...)
        if (params.startsWith('?')) {
          const mode = parseInt(params.slice(1).split(';')[0], 10);
          // Enter alternate screen → treat as clear screen
          if ((mode === 1049 || mode === 47) && cmd === 'h') {
            screen.length = 0; screen.push([]);
            row = 0; col = 0;
          }
          continue;
        }
        if (params.startsWith('>') || params.startsWith('<')) continue;

        const nums = params.split(';').map(s => parseInt(s, 10) || 0);
        const n = nums[0] || 1;

        switch (cmd) {
          case 'A': row = Math.max(0, row - n); break;
          case 'B': row += n; ensureRow(row); break;
          case 'C': col += n; break;  // Cursor forward — creates spaces
          case 'D': col = Math.max(0, col - n); break;
          case 'G': col = Math.max(0, (nums[0] || 1) - 1); break;
          case 'H': case 'f':
            row = Math.max(0, (nums[0] || 1) - 1);
            col = Math.max(0, (nums[1] || 1) - 1);
            ensureRow(row);
            break;
          case 'J':
            if (nums[0] === 2 || nums[0] === 3) {
              screen.length = 0; screen.push([]);
              row = 0; col = 0;
            } else if (nums[0] === 0 || params === '') {
              ensureRow(row);
              screen[row].length = col;
              for (let r = row + 1; r < screen.length; r++) screen[r] = [];
            }
            break;
          case 'K':
            ensureRow(row);
            if (nums[0] === 0 || params === '') {
              screen[row].length = col;
            } else if (nums[0] === 1) {
              for (let c = 0; c <= col && c < screen[row].length; c++) screen[row][c] = ' ';
            } else if (nums[0] === 2) {
              screen[row] = [];
            }
            break;
        }
        continue;
      }

      if (next === ']') {
        i += 2;
        while (i < raw.length) {
          if (raw[i] === '\x07') { i++; break; }
          if (raw[i] === '\x1b' && i + 1 < raw.length && raw[i + 1] === '\\') { i += 2; break; }
          i++;
        }
        continue;
      }
      if (next === '(' || next === ')') { i += 3; continue; }
      i += 2;
      continue;
    }

    // ── Control characters ──
    if (ch === '\r') { col = 0; i++; continue; }
    if (ch === '\n') { row++; col = 0; ensureRow(row); i++; continue; }
    if (ch === '\b') { col = Math.max(0, col - 1); i++; continue; }
    if (ch === '\t') { col = Math.min((Math.floor(col / 8) + 1) * 8, cols - 1); i++; continue; }
    if (code < 32 || code === 127) { i++; continue; }

    // ── Printable character ──
    writeChar(ch);
    i++;
  }

  return screen
    .map(line => line.join('').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Backward-compat alias
export { renderToText as stripAnsi };

/* ── 2. Strip startup banner + echoed command ─────────────────── */

/**
 * Remove the CLI startup banner and the echoed slash command from the
 * rendered text.  Searches ALL lines (not just first 5) for the last
 * occurrence of the slash command, then returns everything after it.
 */
function stripBannerAndEcho(text, slashCmd) {
  if (!slashCmd) return text;

  const lines = text.split('\n');

  // Find the LAST line that contains the slash command.
  // This is the "echo" of our command at the prompt, e.g.  "› /mcp"
  let cmdLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(slashCmd)) {
      cmdLine = i;
    }
  }

  if (cmdLine >= 0) {
    return lines.slice(cmdLine + 1).join('\n').trim();
  }

  // Slash command not found yet — look for a prompt marker as a fallback
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (/^[›❯>]\s*$/.test(t) || /[›❯>]\s*$/.test(t)) {
      return lines.slice(i + 1).join('\n').trim();
    }
  }

  return text.trim();
}

/** True if text is only decorative (horizontal rules, box-drawing, whitespace) */
function isDecorativeOnly(text) {
  if (!text) return true;
  // Remove box-drawing, rules, bullets, whitespace — if nothing left, it's decorative
  const stripped = text.replace(/[\s─━═\-—–=╭╮╰╯│┌┐└┘├┤┬┴┼║╔╗╚╝╠╣╦╩╬·•*✻›❯>]/g, '');
  return stripped.length === 0;
}

/* ── 3. Menu parser ────────────────────────────────────────────── */

function tryParseMenu(text) {
  const lines = text.split('\n');

  // Pattern: numbered options  "❯ 1. Label — Description" / "  2. Label"
  const numberedPat = /^\s*[❯>→↓↑●○•\s]*(\d+)\.\s+(.+)$/;
  const numbered = [];
  let firstIdx = -1;
  let lastIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(numberedPat);
    if (m) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
      numbered.push({ index: i, rawText: m[2].trim() });
    }
  }

  if (numbered.length >= 2) {
    return buildMenu(lines, numbered, firstIdx, lastIdx);
  }

  // Pattern: cursor-based list  "❯ Label" / "  Label" (at least 2 items, one with ❯)
  const cursorItems = [];
  let hasCursor = false;
  let cFirstIdx = -1;
  let cLastIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const cm = l.match(/^\s*([❯>→])\s+(.+)$/);
    if (cm) {
      hasCursor = true;
      if (cFirstIdx === -1) cFirstIdx = i;
      cLastIdx = i;
      cursorItems.push({ index: i, rawText: cm[2].trim() });
      continue;
    }
    // Unselected item: indented, on adjacent line to a cursor item
    if (cursorItems.length > 0) {
      const um = l.match(/^\s{2,}(\S.+)$/);
      if (um && um[1].trim().length < 100 && !isDecorativeOnly(um[1])) {
        cLastIdx = i;
        cursorItems.push({ index: i, rawText: um[1].trim() });
      }
    }
  }

  if (hasCursor && cursorItems.length >= 2) {
    return buildMenu(lines, cursorItems, cFirstIdx, cLastIdx);
  }

  return null;
}

function buildMenu(lines, optionLines, firstIdx, lastIdx) {
  // Title: non-decorative lines before first option
  const titleLines = lines.slice(0, firstIdx)
    .map(l => l.trim())
    .filter(l => l && !isDecorativeOnly(l));
  const title = titleLines[0] || '';
  const subtitle = titleLines.slice(1).join(' ').trim();

  // Footer: non-decorative lines after last option
  const footerLines = lines.slice(lastIdx + 1)
    .map(l => l.trim())
    .filter(l => l && !isDecorativeOnly(l));
  const footer = footerLines.join(' ');

  // Parse each option: "Label — Description" or "Label – Description" or plain "Label"
  const options = optionLines.map(opt => {
    const sep = opt.rawText.match(/^(.+?)\s*[–—]\s+(.+)$/);
    if (sep) return { label: sep[1].trim(), description: sep[2].trim() };
    return { label: opt.rawText, description: '' };
  });

  return { type: 'menu', title, subtitle, options, footer };
}

/* ── 4. Main entry ─────────────────────────────────────────────── */

export function parseOutput(text, slashCmd) {
  let clean = stripBannerAndEcho(text, slashCmd);
  clean = clean.replace(/\n{3,}/g, '\n\n').trim();

  if (!clean || isDecorativeOnly(clean)) {
    return { type: 'empty' };
  }

  const menu = tryParseMenu(clean);
  if (menu) return menu;

  return { type: 'text', content: clean };
}
