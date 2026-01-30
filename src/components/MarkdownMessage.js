import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import DiffViewer, { containsDiff } from './DiffViewer';
import { useStore } from '../store';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.css';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      className="code-copy-btn"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
};

const CodeBlock = ({ inline, className, children, node, ...props }) => {
  // Detect inline code: explicitly inline, or no className and content has no newlines
  // Block code always has a className (language-xxx) from highlight.js or is multi-line
  const text = String(children).replace(/\n$/, '');
  const isInline = inline || (!className && !text.includes('\n'));

  if (isInline) {
    return (
      <code className="inline-code" {...props}>
        {children}
      </code>
    );
  }

  // Check if this is a diff code block
  const language = className?.replace('language-', '') || '';
  const isDiff = language === 'diff' || containsDiff(text);

  if (isDiff) {
    return (
      <div className="diff-block-wrapper">
        <CopyButton text={text} />
        <DiffViewer diff={text} />
      </div>
    );
  }

  return (
    <div className="code-block-wrapper">
      <CopyButton text={text} />
      <code className={className} {...props}>
        {children}
      </code>
    </div>
  );
};

const LinkRenderer = ({ href, children }) => {
  const addWebTab = useStore(state => state.addWebTab);
  const handleClick = (e) => {
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      e.preventDefault();
      addWebTab(href, typeof children === 'string' ? children : href);
    }
  };
  return (
    <a href={href} onClick={handleClick} title={href}>
      {children}
    </a>
  );
};

const MarkdownMessage = memo(({ content }) => {
  // Process content to wrap display math with copy button
  React.useEffect(() => {
    const mathBlocks = document.querySelectorAll('.katex-display');
    mathBlocks.forEach((block) => {
      if (!block.parentElement.classList.contains('math-block-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'math-block-wrapper';

        // Get the LaTeX source from annotation if available
        const annotation = block.querySelector('annotation[encoding="application/x-tex"]');
        const latex = annotation ? annotation.textContent : '';

        if (latex) {
          const copyBtn = document.createElement('button');
          copyBtn.className = 'math-copy-btn';
          copyBtn.textContent = '⧉';
          copyBtn.title = 'Copy LaTeX';
          copyBtn.onclick = async () => {
            try {
              await navigator.clipboard.writeText(latex);
              copyBtn.textContent = '✓';
              setTimeout(() => {
                copyBtn.textContent = '⧉';
              }, 2000);
            } catch (err) {
              console.error('Failed to copy:', err);
            }
          };

          block.parentNode.insertBefore(wrapper, block);
          wrapper.appendChild(copyBtn);
          wrapper.appendChild(block);
        }
      }
    });
  });

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        code: CodeBlock,
        pre: ({ children }) => <pre>{children}</pre>,
        a: LinkRenderer,
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

MarkdownMessage.displayName = 'MarkdownMessage';

export default MarkdownMessage;
