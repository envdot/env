import React, { useState, useMemo } from 'react';

/**
 * Map tool names to display categories matching Claude Code style:
 *   list_directory, run_command → "Bash"
 *   read_file → "Read"
 *   write_file → "Write" (with diff viewer on expand)
 */

function getToolResultSummary(tr) {
  const name = tr.name;
  const input = tr.input || {};
  const result = tr.result || {};
  const rawOutput = result.content || result.stdout || result.listing || result.message || result.error || '';

  switch (name) {
    case 'read_file': {
      const lineCount = typeof rawOutput === 'string' ? rawOutput.split('\n').length : 0;
      return {
        label: 'Read',
        detail: input.path || '',
        output: lineCount > 0 ? `Read ${lineCount} lines` : null,
        type: 'read',
      };
    }
    case 'write_file': {
      const contentStr = input.content || '';
      const writeLineCount = typeof contentStr === 'string' ? contentStr.split('\n').length : 0;
      return {
        label: 'Edit',
        detail: input.path || '',
        output: result.success
          ? `Wrote ${writeLineCount} line${writeLineCount !== 1 ? 's' : ''}`
          : (result.error || 'Failed'),
        type: 'write',
        writeContent: contentStr,
        writePath: input.path || '',
        previousContent: result.previousContent || null,
      };
    }
    case 'list_directory': {
      const listing = rawOutput;
      return {
        label: 'Bash',
        detail: `ls ${input.path || '.'}`,
        output: listing || null,
        type: 'bash',
      };
    }
    case 'run_command': {
      const output = rawOutput;
      const lines = typeof output === 'string' ? output.split('\n').filter(l => l.trim()) : [];
      const truncated = lines.length > 4;
      const preview = truncated ? lines.slice(0, 4).join('\n') : lines.join('\n');
      return {
        label: 'Bash',
        detail: input.command || '',
        output: preview || null,
        truncated,
        totalLines: lines.length,
        type: 'bash',
      };
    }
    case 'file_exists': {
      return {
        label: 'Bash',
        detail: `test -e ${input.path || ''}`,
        output: result.exists ? 'Exists' : 'Not found',
        type: 'bash',
      };
    }
    case 'create_directory': {
      return {
        label: 'Bash',
        detail: `mkdir ${input.path || ''}`,
        output: result.success ? 'Created' : (result.error || 'Failed'),
        type: 'bash',
      };
    }
    case 'delete_file': {
      return {
        label: 'Bash',
        detail: `rm ${input.path || ''}`,
        output: result.success ? 'Deleted' : (result.error || 'Failed'),
        type: 'bash',
      };
    }
    case 'get_file_info': {
      return {
        label: 'Read',
        detail: input.path || '',
        output: result.size ? `${(result.size / 1024).toFixed(1)} KB` : null,
        type: 'read',
      };
    }
    case 'grep':
    case 'Grep': {
      const matchCount = result.matchCount || 0;
      const patternDisplay = input.pattern ? `"${input.pattern}"` : '';
      return {
        label: 'Grep',
        detail: patternDisplay,
        output: matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : (rawOutput ? rawOutput.substring(0, 100) : null),
        type: 'search',
        matches: result.matches || [],
      };
    }
    case 'glob':
    case 'Glob': {
      const fileCount = result.fileCount || 0;
      return {
        label: 'Glob',
        detail: input.pattern || '',
        output: fileCount > 0 ? `${fileCount} file${fileCount !== 1 ? 's' : ''}` : (rawOutput ? rawOutput.substring(0, 100) : null),
        type: 'find',
        files: result.files || [],
      };
    }
    case 'task':
    case 'Task': {
      const description = input.description || input.prompt || '';
      const shortDesc = description.length > 40 ? description.slice(0, 40) + '...' : description;
      return {
        label: 'Task',
        detail: shortDesc,
        output: result.status === 'complete' ? 'Completed' : (result.status || 'Pending'),
        type: 'task',
        taskId: result.taskId,
        taskResult: result,
      };
    }
    // Claude CLI tool names
    case 'Read': {
      const rl = typeof rawOutput === 'string' ? rawOutput.split('\n').length : 0;
      return { label: 'Read', detail: input.file_path || '', output: rl > 0 ? `Read ${rl} lines` : null, type: 'read' };
    }
    case 'Write':
      return { label: 'Write', detail: input.file_path || '', output: result.success !== false ? 'Written' : (rawOutput || 'Failed'), type: 'write' };
    case 'Edit':
      return { label: 'Edit', detail: input.file_path || '', output: result.success !== false ? 'Edited' : (rawOutput || 'Failed'), type: 'write' };
    case 'Bash': {
      const bo = typeof rawOutput === 'string' ? rawOutput.split('\n').filter(l => l.trim()) : [];
      return { label: 'Bash', detail: input.command || '', output: bo.length > 0 ? bo.slice(0, 4).join('\n') : null, type: 'bash' };
    }
    case 'WebFetch':
      return { label: 'WebFetch', detail: input.url || '', output: rawOutput ? rawOutput.substring(0, 100) : null, type: 'web' };
    case 'WebSearch':
      return { label: 'WebSearch', detail: input.query || '', output: rawOutput ? rawOutput.substring(0, 100) : null, type: 'web' };
    case 'TodoWrite':
      return { label: 'TodoWrite', detail: '', output: 'Updated', type: 'task' };
    case 'NotebookEdit':
      return { label: 'NotebookEdit', detail: input.notebook_path || '', output: rawOutput ? rawOutput.substring(0, 100) : null, type: 'write' };
    default: {
      return {
        label: name,
        detail: Object.values(input).filter(v => typeof v === 'string')[0] || '',
        output: rawOutput ? (typeof rawOutput === 'string' ? rawOutput.substring(0, 100) : JSON.stringify(rawOutput).substring(0, 100)) : null,
        type: 'bash',
      };
    }
  }
}

function getToolCallSummary(tc) {
  const name = tc.name;
  const input = tc.input || {};

  switch (name) {
    case 'read_file':
      return { label: 'Read', detail: input.path || '', type: 'read' };
    case 'write_file': {
      const wLines = typeof input.content === 'string' ? input.content.split('\n').length : 0;
      return { label: 'Edit', detail: input.path || '', extra: wLines > 0 ? `${wLines} lines` : null, type: 'write' };
    }
    case 'list_directory':
      return { label: 'Bash', detail: `ls ${input.path || '.'}`, type: 'bash' };
    case 'run_command':
      return { label: 'Bash', detail: input.command || '', type: 'bash' };
    case 'file_exists':
      return { label: 'Bash', detail: `test -e ${input.path || ''}`, type: 'bash' };
    case 'create_directory':
      return { label: 'Bash', detail: `mkdir ${input.path || ''}`, type: 'bash' };
    case 'delete_file':
      return { label: 'Bash', detail: `rm ${input.path || ''}`, type: 'bash' };
    case 'get_file_info':
      return { label: 'Read', detail: input.path || '', type: 'read' };
    case 'grep':
    case 'Grep': {
      const patternDisplay = input.pattern ? `"${input.pattern}"` : '';
      return { label: 'Grep', detail: patternDisplay, type: 'search' };
    }
    case 'glob':
    case 'Glob':
      return { label: 'Glob', detail: input.pattern || '', type: 'find' };
    case 'task':
    case 'Task': {
      const description = input.description || input.prompt || '';
      const shortDesc = description.length > 40 ? description.slice(0, 40) + '...' : description;
      return { label: 'Task', detail: shortDesc, type: 'task' };
    }
    // Claude CLI tool names (Anthropic API format)
    case 'Read':
      return { label: 'Read', detail: input.file_path || input.path || '', type: 'read' };
    case 'Write': {
      const wl = typeof input.content === 'string' ? input.content.split('\n').length : 0;
      return { label: 'Write', detail: input.file_path || input.path || '', extra: wl > 0 ? `${wl} lines` : null, type: 'write' };
    }
    case 'Edit':
      return { label: 'Edit', detail: input.file_path || input.path || '', type: 'write' };
    case 'Bash':
      return { label: 'Bash', detail: input.command || input.description || '', type: 'bash' };
    case 'WebFetch':
      return { label: 'WebFetch', detail: input.url || '', type: 'web' };
    case 'WebSearch':
      return { label: 'WebSearch', detail: input.query || '', type: 'web' };
    case 'TodoWrite':
      return { label: 'TodoWrite', detail: '', type: 'task' };
    case 'NotebookEdit':
      return { label: 'NotebookEdit', detail: input.notebook_path || '', type: 'write' };
    case 'EnterPlanMode':
    case 'ExitPlanMode':
      return { label: name, detail: '', type: 'task' };
    case 'AskUserQuestion':
    case 'Skill':
      return { label: name, detail: '', type: 'task' };
    default: {
      const firstVal = Object.values(input).filter(v => typeof v === 'string')[0] || '';
      return { label: name, detail: firstVal, type: 'bash' };
    }
  }
}

/**
 * Simple LCS-based line diff algorithm.
 * Returns array of { type: 'context'|'add'|'remove', line, oldNum, newNum }
 */
function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to get diff
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'context', line: oldLines[i - 1], oldNum: i, newNum: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', line: newLines[j - 1], oldNum: null, newNum: j });
      j--;
    } else {
      result.unshift({ type: 'remove', line: oldLines[i - 1], oldNum: i, newNum: null });
      i--;
    }
  }

  return result;
}

/**
 * Collapse long runs of unchanged context lines, keeping N lines around changes.
 */
function collapseContext(diffLines, contextSize = 3) {
  // Mark which lines are near a change
  const near = new Array(diffLines.length).fill(false);
  for (let i = 0; i < diffLines.length; i++) {
    if (diffLines[i].type !== 'context') {
      for (let k = Math.max(0, i - contextSize); k <= Math.min(diffLines.length - 1, i + contextSize); k++) {
        near[k] = true;
      }
    }
  }

  const collapsed = [];
  let skipping = false;
  let skipCount = 0;

  for (let i = 0; i < diffLines.length; i++) {
    if (near[i]) {
      if (skipping) {
        collapsed.push({ type: 'separator', count: skipCount });
        skipping = false;
        skipCount = 0;
      }
      collapsed.push(diffLines[i]);
    } else {
      skipping = true;
      skipCount++;
    }
  }
  if (skipping) {
    collapsed.push({ type: 'separator', count: skipCount });
  }

  return collapsed;
}

/**
 * Diff viewer for write_file results
 */
function WriteDiffViewer({ content, previousContent, filePath }) {
  const diffLines = useMemo(() => {
    if (previousContent === null || previousContent === undefined) {
      // New file — show all lines as added
      return content.split('\n').map((line, i) => ({
        type: 'add', line, oldNum: null, newNum: i + 1,
      }));
    }
    const raw = computeDiff(previousContent, content);
    return collapseContext(raw);
  }, [content, previousContent]);

  const maxDisplayLines = 60;
  const truncated = diffLines.length > maxDisplayLines;
  const displayLines = truncated ? diffLines.slice(0, maxDisplayLines) : diffLines;

  return (
    <div className="tool-diff-viewer">
      <div className="tool-diff-header">
        <span className="tool-diff-path">{filePath}</span>
      </div>
      <div className="tool-diff-lines">
        {displayLines.map((d, i) => {
          if (d.type === 'separator') {
            return (
              <div key={i} className="tool-diff-line tool-diff-line-sep">
                <span className="tool-diff-line-num"></span>
                <span className="tool-diff-line-num"></span>
                <span className="tool-diff-line-marker"></span>
                <span className="tool-diff-line-content tool-diff-sep-text">⋯ {d.count} unchanged lines</span>
              </div>
            );
          }
          const cls = d.type === 'add' ? 'tool-diff-line-add'
            : d.type === 'remove' ? 'tool-diff-line-remove'
            : 'tool-diff-line-ctx';
          const marker = d.type === 'add' ? '+' : d.type === 'remove' ? '−' : ' ';
          return (
            <div key={i} className={`tool-diff-line ${cls}`}>
              <span className="tool-diff-line-num">{d.oldNum || ''}</span>
              <span className="tool-diff-line-num">{d.newNum || ''}</span>
              <span className="tool-diff-line-marker">{marker}</span>
              <span className="tool-diff-line-content">{d.line || ' '}</span>
            </div>
          );
        })}
        {truncated && (
          <div className="tool-diff-line tool-diff-line-sep">
            <span className="tool-diff-line-num"></span>
            <span className="tool-diff-line-num"></span>
            <span className="tool-diff-line-marker"></span>
            <span className="tool-diff-line-content tool-diff-sep-text">... +{diffLines.length - maxDisplayLines} more lines</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact tool result item - Claude Code style
 */
export function ToolResultCompact({ tr }) {
  const summary = getToolResultSummary(tr);
  const isSuccess = tr.result && tr.result.success !== false;
  const rawOutput = tr.result?.content || tr.result?.stdout || tr.result?.listing || tr.result?.message || tr.result?.error || '';
  const hasExpandableOutput = rawOutput && typeof rawOutput === 'string' && rawOutput.length > 0;
  const isWriteType = summary.type === 'write' && summary.writeContent;
  const canExpand = hasExpandableOutput && !isWriteType;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`tool-compact-item ${isSuccess ? 'success' : 'error'}`}>
      <div
        className="tool-compact-header"
        onClick={() => canExpand && setExpanded(!expanded)}
        style={{ cursor: canExpand ? 'pointer' : 'default' }}
      >
        <span className={`tool-status-dot ${isSuccess ? 'success' : 'error'}`}></span>
        <span className="tool-compact-name">{summary.label}</span>
        {summary.detail && (
          <span className="tool-compact-detail">{summary.detail}</span>
        )}
        {canExpand && (
          <span className={`tool-compact-chevron ${expanded ? 'expanded' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </span>
        )}
      </div>
      {summary.output && !expanded && !isWriteType && (
        <div className="tool-compact-output-line">
          <span className="tool-compact-tree">└</span>
          <span className="tool-compact-output-text">
            {summary.output}
            {summary.truncated && <span className="tool-compact-more"> ... +{summary.totalLines - 4} lines</span>}
          </span>
        </div>
      )}
      {isWriteType && (
        <WriteDiffViewer
          content={summary.writeContent}
          previousContent={summary.previousContent}
          filePath={summary.writePath}
        />
      )}
      {expanded && !isWriteType && hasExpandableOutput && (
        <div className="tool-compact-expanded">
          {rawOutput}
        </div>
      )}
    </div>
  );
}

/**
 * Compact tool call item (pending) - shows tool name + key input
 */
export function ToolCallCompact({ tc }) {
  const summary = getToolCallSummary(tc);

  return (
    <div className="tool-compact-item pending">
      <div className="tool-compact-header">
        <span className="tool-status-dot pending"></span>
        <span className="tool-compact-name">{summary.label}</span>
        {summary.detail && (
          <span className="tool-compact-detail">{summary.detail}</span>
        )}
      </div>
      {summary.extra && (
        <div className="tool-compact-output-line">
          <span className="tool-compact-tree">└</span>
          <span className="tool-compact-output-text">{summary.extra}</span>
        </div>
      )}
    </div>
  );
}
