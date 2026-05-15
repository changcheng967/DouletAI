'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { User, Bot, Copy, Check, ChevronDown, ChevronRight, Brain, Clock, Zap, RotateCcw, AlertCircle, Pencil, GitBranch, Timer } from 'lucide-react';
import { useState } from 'react';
import { useToast } from './Toast';

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const match = /language-(\w+)/.exec(className || '');
  const code = String(children).replace(/\n$/, '');

  // Skip single-line "code" that's actually just a short phrase
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
        <span className="code-lang">{match ? match[1] : 'code'}</span>
        <button onClick={copy} className="code-copy-btn">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <pre><code className={className}>{children}</code></pre>
    </div>
  );
}

function ThinkingSection({ content }) {
  const [open, setOpen] = useState(true);
  const wordCount = content.split(/\s+/).length;

  return (
    <div className="thinking-section">
      <button className="thinking-toggle" onClick={() => setOpen(!open)}>
        <Brain size={14} />
        <span>Reasoning</span>
        <span className="thinking-wordcount">{wordCount} words</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="thinking-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function MessageMeta({ duration, usage, isStreaming, timestamp, ttk }) {
  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const tokensPerSec = usage?.completion_tokens && duration ? (usage.completion_tokens / parseFloat(duration)).toFixed(1) : null;

  return (
    <div className="message-meta">
      {isStreaming && (
        <span className="message-meta-item streaming-indicator">
          <span className="pulse-dot" /> Generating...
        </span>
      )}
      {timeStr && (
        <span className="message-meta-item meta-time">
          {timeStr}
        </span>
      )}
      {tokensPerSec && (
        <span className="message-meta-item meta-ttk" title="Output speed (tokens/sec)">
          <Zap size={12} /> {tokensPerSec} tok/s
        </span>
      )}
      {duration && (
        <span className="message-meta-item">
          <Clock size={12} /> {duration}s
        </span>
      )}
      {usage?.prompt_tokens != null && (
        <span className="message-meta-item">
          {usage.prompt_tokens + (usage.completion_tokens || 0)} tokens
        </span>
      )}
      {usage?.completion_tokens != null && usage.prompt_tokens != null && (
        <span className="message-meta-item meta-detail">
          in: {usage.prompt_tokens} / out: {usage.completion_tokens}
        </span>
      )}
    </div>
  );
}

export default function MessageBubble({ message, isStreaming, onRegenerate, onEdit, onBranch }) {
  const [copiedMsg, setCopiedMsg] = useState(false);
  const toast = useToast();
  const isUser = message.role === 'user';

  const copyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMsg(true);
    toast('Message copied', 'success');
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'} ${message.isError ? 'message-error' : ''}`}>
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
        {message.isError ? <AlertCircle size={18} /> : isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className="message-body">
        <div className="message-content">
          {isUser ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
          ) : (
            <>
              {message.thinking && (
                <ThinkingSection content={message.thinking} />
              )}
              <div className={isStreaming && !message.content ? 'streaming-cursor' : ''}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    pre: ({ children }) => <>{children}</>,
                    code: ({ className, children, node, ...props }) => {
                      const text = String(children);
                      const isInline = !className && !text.includes('\n');
                      if (isInline) return <code className="inline-code" {...props}>{children}</code>;
                      return <CodeBlock className={className}>{children}</CodeBlock>;
                    },
                    table: ({ children }) => (
                      <div className="table-wrapper"><table>{children}</table></div>
                    ),
                    p: ({ children }) => <p>{children}</p>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {isStreaming && message.content && <span className="typing-cursor" />}
              </div>
            </>
          )}
        </div>

        {!isUser && (message.content || message.thinking) && (
          <div className="message-actions">
            <MessageMeta
              duration={message.duration}
              usage={message.usage}
              isStreaming={isStreaming}
              timestamp={message.timestamp}
              ttk={message.ttk}
            />
            {!isStreaming && (
              <div className="message-action-buttons">
                <button onClick={copyMessage} className="action-btn" title="Copy response">
                  {copiedMsg ? <Check size={13} /> : <Copy size={13} />}
                </button>
                {onRegenerate && (
                  <button onClick={onRegenerate} className="action-btn" title="Regenerate response">
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isUser && !isStreaming && (
          <div className="message-actions">
            <div className="message-action-buttons user-actions">
              <button onClick={copyMessage} className="action-btn" title="Copy">
                {copiedMsg ? <Check size={13} /> : <Copy size={13} />}
              </button>
              {onEdit && (
                <button onClick={onEdit} className="action-btn" title="Edit message">
                  <Pencil size={13} />
                </button>
              )}
              {onBranch && (
                <button onClick={onBranch} className="action-btn" title="Branch from here">
                  <GitBranch size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
