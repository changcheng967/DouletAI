'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useState, useEffect } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { useToast } from './Toast';

let mermaidCounter = 0;

function loadMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => resolve(window.mermaid);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const toast = useToast();
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  const canPreview = lang === 'html' || lang === 'htm';

  if (!className && !code.includes('\n') && code.length < 60 && !code.includes('  ')) {
    return <code className="inline-code">{children}</code>;
  }

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast('Code copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{lang || 'code'}</span>
        <div className="code-block-actions">
          {canPreview && (
            <button onClick={() => setShowPreview(!showPreview)} className="code-copy-btn preview-btn">
              <Play size={13} /> {showPreview ? 'Hide' : 'Preview'}
            </button>
          )}
          <button onClick={copy} className="code-copy-btn">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
      </div>
      {showPreview && canPreview && (
        <div className="code-preview">
          <iframe src={`data:text/html;charset=utf-8,${encodeURIComponent(code)}`} sandbox="allow-scripts" title="Preview" />
        </div>
      )}
      <pre><code className={className}>{children}</code></pre>
    </div>
  );
}

function MermaidBlock({ code }) {
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = `mermaid-${++mermaidCounter}`;
    let cancelled = false;
    loadMermaid()
      .then(m => {
        m.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
        return m.render(id, code);
      })
      .then(({ svg }) => { if (!cancelled) setSvg(svg); })
      .catch(err => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, [code]);

  if (error) return <div className="mermaid-error"><pre>{code}</pre><p>Diagram rendering failed</p></div>;
  if (!svg) return <div className="mermaid-loading">Rendering diagram...</div>;
  return <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function MarkdownContent({ content, isStreaming }) {
  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, node, ...props }) => {
            const text = String(children);
            const isInline = !className && !text.includes('\n');
            if (isInline) return <code className="inline-code" {...props}>{children}</code>;
            const match = /language-(\w+)/.exec(className || '');
            if (match && match[1] === 'mermaid') return <MermaidBlock code={text} />;
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          table: ({ children }) => (
            <div className="table-wrapper"><table>{children}</table></div>
          ),
          p: ({ children }) => <p>{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && content && <span className="typing-cursor" />}
    </>
  );
}
