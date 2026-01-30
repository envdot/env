import React, { useState } from 'react';

/**
 * Generate a compact summary for a tool result.
 * Returns { label, detail, output } where:
 *   label  = bold tool name (e.g. "read_file")
 *   detail = key input info (e.g. file path)
 *   output = optional compact output summary (e.g. "Read 20 lines")
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
        label: 'read_file',
        detail: input.path || '',
        output: lineCount > 0 ? `Read ${lineCount} lines` : null,
      };
    }
    case 'write_file': {
      const contentStr = input.content || '';
      const writeLineCount = typeof contentStr === 'string' ? contentStr.split('\n').length : 0;
      return {
        label: 'write_file',
        detail: input.path || '',
        output: result.success
          ? `Wrote ${writeLineCount} line${writeLineCount !== 1 ? 's' : ''}`
          : (result.error || 'Failed'),
      };
    }
    case 'list_directory': {
      const fileCount = result.files ? result.files.length : 0;
      return {
        label: 'list_directory',
        detail: input.path || '.',
        output: rawOutput || (fileCount > 0 ? `${fileCount} items` : null),
      };
    }
    case 'run_command': {
      const output = rawOutput;
      const lines = typeof output === 'string' ? output.split('\n').filter(l => l.trim()) : [];
      const truncated = lines.length > 4;
      const preview = truncated ? lines.slice(0, 4).join('\n') : lines.join('\n');
      return {
        label: 'run_command',
        detail: input.command || '',
        output: preview || null,
        truncated,
        totalLines: lines.length,
      };
    }
    case 'file_exists': {
      return {
        label: 'file_exists',
        detail: input.path || '',
        output: result.exists ? 'Exists' : 'Not found',
      };
    }
    case 'create_directory': {
      return {
        label: 'create_directory',
        detail: input.path || '',
        output: result.success ? 'Created' : (result.error || 'Failed'),
      };
    }
    case 'delete_file': {
      return {
        label: 'delete_file',
        detail: input.path || '',
        output: result.success ? 'Deleted' : (result.error || 'Failed'),
      };
    }
    case 'get_file_info': {
      return {
        label: 'get_file_info',
        detail: input.path || '',
        output: result.size ? `${(result.size / 1024).toFixed(1)} KB` : null,
      };
    }
    default: {
      return {
        label: name,
        detail: Object.values(input).filter(v => typeof v === 'string')[0] || '',
        output: rawOutput ? (typeof rawOutput === 'string' ? rawOutput.substring(0, 100) : JSON.stringify(rawOutput).substring(0, 100)) : null,
      };
    }
  }
}

/**
 * Generate a compact summary for a pending tool call.
 */
function getToolCallSummary(tc) {
  const name = tc.name;
  const input = tc.input || {};

  switch (name) {
    case 'read_file':
      return { label: 'read_file', detail: input.path || '' };
    case 'write_file': {
      const wLines = typeof input.content === 'string' ? input.content.split('\n').length : 0;
      return { label: 'write_file', detail: input.path || '', extra: wLines > 0 ? `${wLines} lines` : null };
    }
    case 'list_directory':
      return { label: 'list_directory', detail: input.path || '.' };
    case 'run_command':
      return { label: 'run_command', detail: input.command || '' };
    case 'file_exists':
      return { label: 'file_exists', detail: input.path || '' };
    case 'create_directory':
      return { label: 'create_directory', detail: input.path || '' };
    case 'delete_file':
      return { label: 'delete_file', detail: input.path || '' };
    case 'get_file_info':
      return { label: 'get_file_info', detail: input.path || '' };
    default: {
      const firstVal = Object.values(input).filter(v => typeof v === 'string')[0] || '';
      return { label: name, detail: firstVal };
    }
  }
}

/**
 * Compact tool result item - shows a collapsed summary with expandable output
 */
export function ToolResultCompact({ tr }) {
  const [expanded, setExpanded] = useState(false);
  const summary = getToolResultSummary(tr);
  const isSuccess = tr.result && tr.result.success !== false;
  const rawOutput = tr.result?.content || tr.result?.stdout || tr.result?.listing || tr.result?.message || tr.result?.error || '';
  const hasExpandableOutput = rawOutput && typeof rawOutput === 'string' && rawOutput.length > 0;

  return (
    <div className={`tool-compact-item ${isSuccess ? 'success' : 'error'}`}>
      <div
        className="tool-compact-header"
        onClick={() => hasExpandableOutput && setExpanded(!expanded)}
        style={{ cursor: hasExpandableOutput ? 'pointer' : 'default' }}
      >
        <span className={`tool-status-dot ${isSuccess ? 'success' : 'error'}`}></span>
        <span className="tool-compact-name">{summary.label}</span>
        {summary.detail && (
          <span className="tool-compact-detail">{summary.detail}</span>
        )}
        {hasExpandableOutput && (
          <span className={`tool-compact-chevron ${expanded ? 'expanded' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </span>
        )}
      </div>
      {summary.output && !expanded && (
        <div className="tool-compact-summary">
          {summary.output}
          {summary.truncated && <span className="tool-compact-more"> ... +{summary.totalLines - 4} lines</span>}
        </div>
      )}
      {expanded && hasExpandableOutput && (
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
        <div className="tool-compact-summary">{summary.extra}</div>
      )}
    </div>
  );
}
