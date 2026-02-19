import React from 'react';
import { ToolGroup } from './ToolGroup';
import { TaskBlock } from './TaskBlock';

/**
 * Block router component
 * Routes different block types to their appropriate components
 */
export function Block({ block, onTaskCancel }) {
  if (!block) return null;

  switch (block.type) {
    case 'text':
      return (
        <div className="block-text">
          {block.content}
        </div>
      );

    case 'tool_group':
      return (
        <ToolGroup
          tools={block.tools}
          collapsed={block.collapsed}
          onToggle={block.onToggle}
        />
      );

    case 'task':
      return (
        <TaskBlock
          task={block}
          onCancel={onTaskCancel}
        />
      );

    case 'thinking':
      return (
        <div className="block-thinking">
          <div className="thinking-header">
            <span className="thinking-icon">💭</span>
            <span className="thinking-label">Thinking...</span>
          </div>
          <div className="thinking-content">
            {block.content}
          </div>
        </div>
      );

    default:
      // Unknown block type - render as raw content if available
      if (block.content) {
        return (
          <div className="block-unknown">
            {typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content)}
          </div>
        );
      }
      return null;
  }
}

/**
 * BlockList component
 * Renders a list of blocks with proper spacing
 */
export function BlockList({ blocks, onTaskCancel }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="block-list">
      {blocks.map((block, index) => (
        <Block
          key={block.id || `block_${index}`}
          block={block}
          onTaskCancel={onTaskCancel}
        />
      ))}
    </div>
  );
}

/**
 * Helper to process messages into blocks
 * Groups consecutive tool calls and handles special message types
 */
export function processMessagesToBlocks(messages) {
  const blocks = [];
  let currentToolGroup = null;

  const endToolGroup = () => {
    if (currentToolGroup && currentToolGroup.tools.length > 0) {
      // Mark group as complete if all tools are done
      const allComplete = currentToolGroup.tools.every(
        t => t.status === 'complete' || t.status === 'error'
      );
      currentToolGroup.status = allComplete ? 'complete' : 'running';
      blocks.push(currentToolGroup);
      currentToolGroup = null;
    }
  };

  messages.forEach((msg) => {
    // Handle thinking content (planning mode)
    if (msg.thinking) {
      endToolGroup();
      blocks.push({
        type: 'thinking',
        id: `thinking_${msg.id}`,
        content: msg.thinking
      });
    }

    // Handle assistant messages
    if (msg.role === 'assistant') {
      // Text content (without tool calls) ends any tool group
      if (msg.content && msg.content.trim() && !msg.toolCalls) {
        endToolGroup();
        blocks.push({
          type: 'text',
          id: `text_${msg.id}`,
          content: msg.content
        });
      }

      // Tool calls get grouped
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
          // Check if this is a Task tool
          if (tc.name === 'task') {
            // End current tool group first
            endToolGroup();

            // Add task as its own block
            blocks.push({
              type: 'task',
              id: tc.id,
              toolUseId: tc.id,
              description: tc.input?.description || 'Task',
              context: tc.input?.context,
              status: 'running',
              collapsed: false,
              messages: [],
              stats: { toolsUsed: 0, duration: 0 },
              result: null
            });
          } else {
            // Regular tool - add to group
            if (!currentToolGroup) {
              currentToolGroup = {
                type: 'tool_group',
                id: `tg_${msg.id}_${tc.id}`,
                tools: [],
                collapsed: true,
                status: 'running'
              };
            }
            currentToolGroup.tools.push({
              id: tc.id,
              name: tc.name,
              input: tc.input,
              result: null,
              status: 'running',
              startTime: Date.now()
            });
          }
        });
      }
    }

    // Handle tool results
    if (msg.isToolResult && msg.toolResults) {
      msg.toolResults.forEach(tr => {
        // Check if this is a Task result
        if (tr.name === 'task') {
          // Find the task block and update it
          const taskBlock = blocks.find(b => b.type === 'task' && b.id === tr.tool_use_id);
          if (taskBlock) {
            taskBlock.status = tr.result?.status || 'complete';
            taskBlock.messages = tr.result?.messages || [];
            taskBlock.stats = tr.result?.stats || { toolsUsed: 0, duration: 0 };
            taskBlock.result = { summary: tr.result?.summary || '' };
            taskBlock.collapsed = true; // Collapse when complete
          }
        } else if (currentToolGroup) {
          // Regular tool result
          const tool = currentToolGroup.tools.find(t => t.id === tr.tool_use_id);
          if (tool) {
            tool.result = tr.result;
            tool.status = tr.result?.success !== false ? 'complete' : 'error';
            tool.duration = Date.now() - (tool.startTime || Date.now());
          }
        }
      });
    }
  });

  // Add any remaining tool group
  endToolGroup();

  return blocks;
}

export default Block;
