import React, { useState, useMemo } from 'react';

/**
 * Shorten a file path for display
 */
function shortenPath(filePath) {
  if (!filePath) return '';
  const parts = filePath.split('/');
  if (parts.length <= 2) return filePath;
  return '.../' + parts.slice(-2).join('/');
}

/**
 * Format duration in ms to human readable
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get a summary string for a single tool
 */
function getToolSummary(tool) {
  const { name, input, result } = tool;

  switch (name) {
    case 'read_file':
      return `Read ${shortenPath(input?.path)}`;
    case 'write_file':
      return `Write ${shortenPath(input?.path)}`;
    case 'list_directory':
      return `ls ${input?.path || '.'}`;
    case 'run_command': {
      const cmd = (input?.command || '').split('\n')[0].slice(0, 40);
      return `Bash: ${cmd}${(input?.command?.length || 0) > 40 ? '...' : ''}`;
    }
    case 'file_exists':
      return `test -e ${shortenPath(input?.path)}`;
    case 'create_directory':
      return `mkdir ${shortenPath(input?.path)}`;
    case 'delete_file':
      return `rm ${shortenPath(input?.path)}`;
    case 'get_file_info':
      return `stat ${shortenPath(input?.path)}`;
    case 'glob': {
      const fileCount = result?.fileCount ?? result?.files?.length ?? '?';
      return `Glob ${input?.pattern} (${fileCount} files)`;
    }
    case 'grep': {
      const matchCount = result?.matchCount ?? result?.matches?.length ?? '?';
      return `Grep "${input?.pattern}" (${matchCount} matches)`;
    }
    case 'task':
      return `Task: ${(input?.description || '').slice(0, 40)}`;
    default:
      return name;
  }
}

/**
 * Single tool item within a group
 */
function ToolItem({ tool }) {
  const statusIcon = tool.status === 'complete' ? '✓' :
                     tool.status === 'error' ? '✗' :
                     '⟳';
  const statusClass = tool.status === 'complete' ? 'status-complete' :
                      tool.status === 'error' ? 'status-error' :
                      'status-running';

  return (
    <div className="tool-item">
      <span className={`tool-item-status ${statusClass}`}>{statusIcon}</span>
      <span className="tool-item-summary">{getToolSummary(tool)}</span>
      {tool.duration > 0 && (
        <span className="tool-item-duration">[{formatDuration(tool.duration)}]</span>
      )}
    </div>
  );
}

/**
 * Collapsible tool group component
 * Shows "Used N tools" header with expand/collapse
 */
export function ToolGroup({ tools, collapsed: initialCollapsed = true, onToggle }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const stats = useMemo(() => {
    const totalDuration = tools.reduce((sum, t) => sum + (t.duration || 0), 0);
    const isRunning = tools.some(t => t.status === 'running');
    const hasError = tools.some(t => t.status === 'error');
    return { totalDuration, isRunning, hasError };
  }, [tools]);

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    if (onToggle) onToggle(newCollapsed);
  };

  const statusClass = stats.isRunning ? 'running' :
                      stats.hasError ? 'error' : 'complete';

  return (
    <div className={`tool-group ${statusClass}`}>
      <div className="tool-group-header" onClick={handleToggle}>
        <span className="tool-group-chevron">{collapsed ? '▶' : '▼'}</span>
        <span className="tool-group-label">
          Used {tools.length} tool{tools.length !== 1 ? 's' : ''}
        </span>
        {stats.totalDuration > 0 && (
          <span className="tool-group-duration">[{formatDuration(stats.totalDuration)}]</span>
        )}
        {stats.isRunning && (
          <span className="tool-group-spinner"></span>
        )}
      </div>
      {!collapsed && (
        <div className="tool-group-list">
          {tools.map((tool, index) => (
            <ToolItem key={tool.id || index} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to group consecutive tool calls
 */
export function groupToolCalls(toolCalls, toolResults) {
  // Create a map of results by tool_use_id
  const resultsMap = {};
  if (toolResults) {
    toolResults.forEach(tr => {
      resultsMap[tr.tool_use_id] = tr;
    });
  }

  // Build tool objects with results
  return toolCalls.map(tc => {
    const result = resultsMap[tc.id];
    return {
      id: tc.id,
      name: tc.name,
      input: tc.input,
      result: result?.result,
      status: result ? (result.result?.success !== false ? 'complete' : 'error') : 'running',
      duration: result?.duration || 0
    };
  });
}

export default ToolGroup;
