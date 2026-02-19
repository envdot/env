import React from 'react';

// Parse unified diff format and return structured data
function parseDiff(diffText) {
  const lines = diffText.split('\n');
  const hunks = [];
  let currentHunk = null;
  let filePath = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header (--- a/file or +++ b/file)
    if (line.startsWith('--- ')) {
      filePath = line.slice(4).replace(/^a\//, '');
    } else if (line.startsWith('+++ ')) {
      filePath = line.slice(4).replace(/^b\//, '');
    }
    // Hunk header (@@ -start,count +start,count @@)
    else if (line.startsWith('@@')) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)?/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1], 10),
          oldCount: match[2] ? parseInt(match[2], 10) : 1,
          newStart: parseInt(match[3], 10),
          newCount: match[4] ? parseInt(match[4], 10) : 1,
          context: match[5] || '',
          lines: [],
          filePath: filePath
        };
      }
    }
    // Diff content lines
    else if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({ type: 'add', content: line.slice(1) });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ type: 'remove', content: line.slice(1) });
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({ type: 'context', content: line.slice(1) || '' });
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return { hunks, filePath };
}

// Check if text contains a diff
export function containsDiff(text) {
  if (!text) return false;
  // Check for unified diff markers
  return (
    (text.includes('@@') && (text.includes('---') || text.includes('+++'))) ||
    (text.includes('\n+') && text.includes('\n-')) ||
    text.match(/^[\+\-]{3}\s/m)
  );
}

// Extract diff blocks from markdown text
export function extractDiffBlocks(text) {
  const blocks = [];
  // Match code blocks with diff language hint
  const diffCodeBlockRegex = /```(?:diff)?\n([\s\S]*?)```/g;
  let match;

  while ((match = diffCodeBlockRegex.exec(text)) !== null) {
    const content = match[1];
    if (containsDiff(content)) {
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        content: content,
        fullMatch: match[0]
      });
    }
  }

  return blocks;
}

function DiffViewer({ diff }) {
  const { hunks, filePath } = parseDiff(diff);

  if (hunks.length === 0) {
    return (
      <pre className="diff-viewer-empty">
        {diff}
      </pre>
    );
  }

  // Calculate overall line number for display
  let globalLineNum = 1;

  return (
    <div className="diff-viewer">
      {filePath && (
        <div className="diff-file-header">
          <span className="diff-file-path">{filePath}</span>
        </div>
      )}
      {hunks.map((hunk, hunkIndex) => {
        return (
          <div key={hunkIndex} className="diff-hunk">
            <div className="diff-hunk-header">
              <span className="diff-hunk-range">
                @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
              </span>
              {hunk.context && (
                <span className="diff-hunk-context">{hunk.context}</span>
              )}
            </div>
            <div className="diff-lines">
              {hunk.lines.map((line, lineIndex) => {
                const lineNum = globalLineNum++;

                return (
                  <div
                    key={lineIndex}
                    className={`diff-line diff-line-${line.type}`}
                  >
                    <span className="diff-line-num">
                      {lineNum}
                    </span>
                    <span className="diff-line-marker">
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                    </span>
                    <span className="diff-line-content">
                      <code>{line.content}</code>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DiffViewer;
