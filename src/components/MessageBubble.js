'use client';
import { User, Bot, Copy, Check, ChevronDown, ChevronRight, Brain, Clock, Zap, RotateCcw, AlertCircle, Pencil, GitBranch, Timer, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useToast } from './Toast';
import MarkdownContent from './MarkdownContent';

function ThinkingSection({ content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
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
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{content}</pre>
        </div>
      )}
    </div>
  );
}

function MessageMeta({ duration, usage, isStreaming, timestamp, ttk, contentLength }) {
  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const tokensPerSec = usage?.completion_tokens && duration && parseFloat(duration) > 0
    ? (usage.completion_tokens / parseFloat(duration)).toFixed(1)
    : null;

  const [liveTps, setLiveTps] = useState(null);
  const startRef = useRef(null);
  const contentRef = useRef(0);

  useEffect(() => {
    contentRef.current = contentLength || 0;
  }, [contentLength]);

  useEffect(() => {
    if (isStreaming) {
      if (!startRef.current) startRef.current = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startRef.current) / 1000;
        if (elapsed > 1 && contentRef.current > 20) {
          const estTokens = Math.round(contentRef.current / 4);
          setLiveTps((estTokens / elapsed).toFixed(1));
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      startRef.current = null;
      setLiveTps(null);
    }
  }, [isStreaming]);

  const displayTps = tokensPerSec || liveTps;

  return (
    <div className="message-meta">
      {isStreaming && (
        <span className="message-meta-item streaming-indicator">
          <span className="pulse-dot" /> Generating...
        </span>
      )}
      {displayTps && (
        <span className="message-meta-item meta-ttk" title="Output speed (tokens/sec)">
          <Zap size={12} /> {displayTps} tok/s
        </span>
      )}
      {timeStr && (
        <span className="message-meta-item meta-time">
          {timeStr}
        </span>
      )}
      {duration && !isStreaming && (
        <span className="message-meta-item">
          <Clock size={12} /> {duration}s
        </span>
      )}
      {usage?.prompt_tokens != null && !isStreaming && (
        <span className="message-meta-item">
          {usage.prompt_tokens + (usage.completion_tokens || 0)} tokens
        </span>
      )}
      {usage?.completion_tokens != null && usage.prompt_tokens != null && !isStreaming && (
        <span className="message-meta-item meta-detail">
          in: {usage.prompt_tokens} / out: {usage.completion_tokens}
        </span>
      )}
    </div>
  );
}

export default memo(function MessageBubble({ message, isStreaming, onRegenerate, onEdit, onBranch, onRate }) {
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
            <>
              {message.images?.length > 0 && (
                <div className="message-images">
                  {message.images.map((img, i) => (
                    <img key={i} src={img.dataUrl} alt={img.name || 'Image'} className="message-image" />
                  ))}
                </div>
              )}
              <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
            </>
          ) : (
            <>
              {message.thinking && (
                <ThinkingSection content={message.thinking} defaultOpen={isStreaming} />
              )}
              <div className={isStreaming && !message.content ? 'streaming-cursor' : ''}>
                <MarkdownContent content={message.content} isStreaming={isStreaming} />
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
              contentLength={message.content?.length || 0}
            />
            {!isStreaming && (
              <div className="message-action-buttons">
                {onRate && (
                  <div className="rating-buttons">
                    <button
                      onClick={() => onRate(message.rating === 'up' ? null : 'up')}
                      className={`action-btn rating-btn ${message.rating === 'up' ? 'rated-up' : ''}`}
                      title="Good response"
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      onClick={() => onRate(message.rating === 'down' ? null : 'down')}
                      className={`action-btn rating-btn ${message.rating === 'down' ? 'rated-down' : ''}`}
                      title="Bad response"
                    >
                      <ThumbsDown size={13} />
                    </button>
                  </div>
                )}
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
});
