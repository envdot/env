import React, { useState } from 'react';
import { ToolGroup, groupToolCalls } from './ToolGroup';

/**
 * Format duration in ms to human readable
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Recursive block renderer for task content
 */
function Block({ block }) {
  switch (block.type) {
    case 'text':
      return <div className="task-text-block">{block.content}</div>;
    case 'tool_group':
      return <ToolGroup tools={block.tools} collapsed={block.collapsed} />;
    case 'task':
      return <TaskBlock task={block} />;
    default:
      return null;
  }
}

/**
 * Process messages into blocks for display
 * Groups consecutive tool calls and separates text content
 */
function processMessagesToBlocks(messages) {
  const blocks = [];
  let currentToolGroup = null;

  messages.forEach(msg => {
    if (msg.role === 'assistant') {
      // End any current tool group if there's text content
      if (msg.content && msg.content.trim() && !msg.toolCalls) {
        if (currentToolGroup) {
          blocks.push(currentToolGroup);
          currentToolGroup = null;
        }
        blocks.push({
          type: 'text',
          id: `text_${msg.id}`,
          content: msg.content
        });
      }

      // Handle tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        if (!currentToolGroup) {
          currentToolGroup = {
            type: 'tool_group',
            id: `tg_${msg.id}`,
            tools: [],
            collapsed: true,
            status: 'running'
          };
        }

        msg.toolCalls.forEach(tc => {
          currentToolGroup.tools.push({
            id: tc.id,
            name: tc.name,
            input: tc.input,
            result: null,
            status: 'running',
            startTime: Date.now()
          });
        });
      }
    }

    // Handle tool results
    if (msg.isToolResult && msg.toolResults) {
      if (currentToolGroup) {
        msg.toolResults.forEach(tr => {
          const tool = currentToolGroup.tools.find(t => t.id === tr.tool_use_id);
          if (tool) {
            tool.result = tr.result;
            tool.status = tr.result?.success !== false ? 'complete' : 'error';
            tool.duration = Date.now() - (tool.startTime || Date.now());
          }
        });

        // Check if all tools in group are complete
        const allComplete = currentToolGroup.tools.every(
          t => t.status === 'complete' || t.status === 'error'
        );
        if (allComplete) {
          currentToolGroup.status = 'complete';
        }
      }
    }
  });

  // Add any remaining tool group
  if (currentToolGroup) {
    blocks.push(currentToolGroup);
  }

  return blocks;
}

/**
 * TaskBlock component for displaying hierarchical task results
 */
export function TaskBlock({ task, onCancel }) {
  const [collapsed, setCollapsed] = useState(task.collapsed ?? true);

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  const statusIcon = task.status === 'complete' ? '✓' :
                     task.status === 'error' ? '✗' :
                     '⟳';
  const statusClass = task.status === 'complete' ? 'status-complete' :
                      task.status === 'error' ? 'status-error' :
                      'status-running';

  // Process sub-conversation messages into blocks
  const blocks = task.messages ? processMessagesToBlocks(task.messages) : [];

  return (
    <div className={`task-block ${statusClass}`}>
      <div className="task-header" onClick={handleToggle}>
        <span className="task-chevron">{collapsed ? '▶' : '▼'}</span>
        <span className={`task-status-icon ${statusClass}`}>{statusIcon}</span>
        <span className="task-label">Task:</span>
        <span className="task-description">{task.description}</span>
        {task.stats?.duration > 0 && (
          <span className="task-duration">[{formatDuration(task.stats.duration)}]</span>
        )}
        {task.status === 'running' && onCancel && (
          <button
            className="task-cancel-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(task.taskId);
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {collapsed ? (
        <div className="task-summary-collapsed">
          {task.stats?.toolsUsed > 0 && (
            <span>Used {task.stats.toolsUsed} tool{task.stats.toolsUsed !== 1 ? 's' : ''}</span>
          )}
          {task.result?.summary && (
            <span className="task-summary-text">
              {task.result.summary.length > 80
                ? task.result.summary.slice(0, 80) + '...'
                : task.result.summary}
            </span>
          )}
        </div>
      ) : (
        <div className="task-content">
          {/* Render sub-conversation blocks */}
          {blocks.map((block, index) => (
            <Block key={block.id || index} block={block} />
          ))}

          {/* Show final summary if available */}
          {task.result?.summary && (
            <div className="task-final-summary">
              <strong>Summary:</strong> {task.result.summary}
            </div>
          )}

          {/* Show error if task failed */}
          {task.status === 'error' && task.error && (
            <div className="task-error">
              Error: {task.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskBlock;
