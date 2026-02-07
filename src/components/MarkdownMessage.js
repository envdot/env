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

// Fast CSV table renderer — renders CSV data as a native HTML table
const CsvTable = memo(({ text }) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');

  const { headers, rows } = React.useMemo(() => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    // Simple CSV parse (handles commas, not quoted commas)
    const parse = line => line.split(',').map(c => c.trim());
    const h = parse(lines[0]);
    const r = lines.slice(1).map((line, i) => ({ idx: i, cells: parse(line) }));
    return { headers: h, rows: r };
  }, [text]);

  const filtered = React.useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(r => r.cells.some(c => c.toLowerCase().includes(s)));
  }, [rows, search]);

  const sorted = React.useMemo(() => {
    if (sortCol === null) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a.cells[sortCol] || '';
      const bv = b.cells[sortCol] || '';
      // Try numeric sort
      const an = Number(av.replace(/,/g, ''));
      const bn = Number(bv.replace(/,/g, ''));
      if (!isNaN(an) && !isNaN(bn)) {
        return sortAsc ? an - bn : bn - an;
      }
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortAsc]);

  const handleSort = (i) => {
    if (sortCol === i) setSortAsc(!sortAsc);
    else { setSortCol(i); setSortAsc(true); }
  };

  return (
    <div className="csv-table-wrapper">
      <div className="csv-table-toolbar">
        <span className="csv-table-count">{filtered.length} rows</span>
        <input
          className="csv-table-search"
          placeholder="Filter..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <CopyButton text={text} />
      </div>
      <div className="csv-table-scroll">
        <table className="csv-table">
          <thead>
            <tr>
              <th className="csv-row-num">#</th>
              {headers.map((h, i) => (
                <th key={i} onClick={() => handleSort(i)} style={{ cursor: 'pointer' }}>
                  {h} {sortCol === i ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.idx}>
                <td className="csv-row-num">{row.idx + 1}</td>
                {row.cells.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
CsvTable.displayName = 'CsvTable';

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

  // Check language
  const language = className?.replace('language-', '') || '';

  // CSV code blocks → render as interactive table
  if (language === 'csv') {
    return <CsvTable text={text} />;
  }

  // Diff code blocks
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
