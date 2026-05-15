'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, Send, Square, Sparkles, Brain, Lightbulb, Code2, BookOpen, ArrowDown, MessageSquarePlus, Settings2, Pencil, X as XIcon, Eye, Mic, MicOff, Keyboard, Share2, GitBranch, Timer, Thermometer, Hash, Zap } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ModelSelector from './ModelSelector';
import { useToast } from './Toast';

const SUGGESTIONS = [
  { icon: <Lightbulb size={16} />, text: 'Explain quantum computing simply', label: 'Learn' },
  { icon: <Code2 size={16} />, text: 'Write a Python web scraper', label: 'Code' },
  { icon: <Sparkles size={16} />, text: 'Help me brainstorm startup ideas', label: 'Brainstorm' },
  { icon: <BookOpen size={16} />, text: 'Summarize the key ideas of Stoicism', label: 'Research' },
];

const KEYBOARD_SHORTCUTS = [
  { keys: 'Enter', desc: 'Send message' },
  { keys: 'Shift + Enter', desc: 'New line' },
  { keys: 'Ctrl + N', desc: 'New chat' },
  { keys: 'Ctrl + /', desc: 'Keyboard shortcuts' },
  { keys: 'Ctrl + Shift + S', desc: 'Share chat' },
  { keys: 'Escape', desc: 'Close dialogs' },
];

function KeyboardShortcuts({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="icon-btn" onClick={onClose}><XIcon size={16} /></button>
        </div>
        <div className="shortcut-list">
          {KEYBOARD_SHORTCUTS.map(s => (
            <div key={s.keys} className="shortcut-row">
              <span className="shortcut-desc">{s.desc}</span>
              <span className="shortcut-keys">
                {s.keys.split(' + ').map((k, i) => (
                  <span key={i}>{k}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelInfoPopup({ model, onClose }) {
  if (!model) return null;
  const PROVIDER_NAMES = {
    anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', meta: 'Meta',
    mistralai: 'Mistral', qwen: 'Qwen', 'x-ai': 'xAI', 'deepseek-ai': 'DeepSeek',
    nvidia: 'NVIDIA', 'z-ai': 'Z.AI', microsoft: 'Microsoft', deepseek: 'DeepSeek',
    minimax: 'MiniMax', ring: 'Ring', 'arli-ai': 'Arli AI', moonshotai: 'Moonshot',
    minimaxai: 'MiniMax', 'stepfun-ai': 'StepFun', sarvamai: 'Sarvam',
    stockmark: 'Stockmark', upstage: 'Upstage',
  };
  return (
    <div className="model-info-popup">
      <div className="model-info-header">
        <span className="model-info-name">{model.name}</span>
        <button className="icon-btn" onClick={onClose}><XIcon size={14} /></button>
      </div>
      <div className="model-info-body">
        <div className="model-info-row"><span>Provider</span><span>{PROVIDER_NAMES[model.provider] || model.provider}</span></div>
        {model.context_length && <div className="model-info-row"><span>Context</span><span>{(model.context_length/1000).toFixed(0)}K tokens</span></div>}
        <div className="model-info-row"><span>Speed</span><span className={`speed-badge speed-${model.speed}`}>{model.speed}</span></div>
        {model.tags?.filter(t => !['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github','llm7'].includes(t)).length > 0 && (
          <div className="model-info-tags">
            {model.tags.filter(t => !['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github','llm7'].includes(t)).map(t => <span key={t} className={`model-tag tag-${t}`}>{t}</span>)}
          </div>
        )}
        {(model.tags?.includes('zen') || model.tags?.includes('arli') || model.tags?.includes('freetheai') || model.tags?.includes('modal') || model.tags?.includes('groq') || model.tags?.includes('sambanova') || model.tags?.includes('cerebras') || model.tags?.includes('google-ai') || model.tags?.includes('openrouter') || model.tags?.includes('github') || model.tags?.includes('llm7')) && (
          <div className="model-info-tags">
            {model.tags?.includes('zen') && <span className="model-tag tag-zen">via OpenCode Zen</span>}
            {model.tags?.includes('arli') && <span className="model-tag tag-arli">via Arli AI</span>}
            {model.tags?.includes('freetheai') && <span className="model-tag tag-freetheai">via FreeTheAi</span>}
            {model.tags?.includes('modal') && <span className="model-tag tag-modal">via Modal</span>}
            {model.tags?.includes('groq') && <span className="model-tag tag-groq">via Groq</span>}
            {model.tags?.includes('sambanova') && <span className="model-tag tag-sambanova">via SambaNova</span>}
            {model.tags?.includes('cerebras') && <span className="model-tag tag-cerebras">via Cerebras</span>}
            {model.tags?.includes('google-ai') && <span className="model-tag tag-google-ai">via Google AI</span>}
            {model.tags?.includes('openrouter') && <span className="model-tag tag-openrouter">via OpenRouter</span>}
            {model.tags?.includes('github') && <span className="model-tag tag-github">via GitHub</span>}
            {model.tags?.includes('llm7') && <span className="model-tag tag-llm7">via LLM7</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function EditMessageInput({ original, onSave, onCancel }) {
  const [text, setText] = useState(original);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current.style.height = 'auto';
    ref.current.style.height = ref.current.scrollHeight + 'px';
  }, []);

  return (
    <div className="edit-message-form">
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(text); } if (e.key === 'Escape') onCancel(); }}
      />
      <div className="edit-message-actions">
        <button className="edit-cancel" onClick={onCancel}>Cancel</button>
        <button className="edit-save" onClick={() => onSave(text)} disabled={!text.trim()}>Save & Send</button>
      </div>
    </div>
  );
}

export default function ChatArea({
  conversation,
  streaming,
  thinkingActive,
  waitingForFirst,
  onSend,
  onStop,
  onModelChange,
  onOpenSidebar,
  onCreateChat,
  onRegenerate,
  onEditMessage,
  onBranch,
  models,
  systemPrompt,
  onSystemPromptChange,
}) {
  const [input, setInput] = useState('');
  const [enableThinking, setEnableThinking] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt || '');
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.6);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [ttkLive, setTtkLive] = useState(null);
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const ttkTimerRef = useRef(null);

  const messages = conversation?.messages || [];
  const model = conversation?.model || '';

  const currentModel = models?.find(m => m.id === model);
  const charCount = input.length;

  const totalTokens = messages.reduce((sum, m) => {
    if (m.usage) return sum + (m.usage.prompt_tokens || 0) + (m.usage.completion_tokens || 0);
    return sum;
  }, 0);

  useEffect(() => {
    if (currentModel?.tags?.includes('reasoning')) setEnableThinking(true);
  }, [currentModel?.id]);

  useEffect(() => {
    setLocalSystemPrompt(systemPrompt || '');
    setEditingMsg(null);
  }, [systemPrompt, conversation?.id]);

  // Live TTK counter while waiting for first token
  useEffect(() => {
    if (waitingForFirst) {
      const start = Date.now();
      setTtkLive('0.0');
      ttkTimerRef.current = setInterval(() => {
        setTtkLive(((Date.now() - start) / 1000).toFixed(1));
      }, 100);
    } else {
      clearInterval(ttkTimerRef.current);
      setTtkLive(null);
    }
    return () => clearInterval(ttkTimerRef.current);
  }, [waitingForFirst]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom(streaming ? 'auto' : 'smooth');
  }, [messages, streaming, scrollToBottom]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 150);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages.length]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); onCreateChat(model); }
      if (e.ctrlKey && e.key === '/') { e.preventDefault(); setShowShortcuts(s => !s); }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); handleShareChat(); }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowModelInfo(false);
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [model, onCreateChat]);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast('Voice input not supported in this browser', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalTranscript = input;
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + ' ';
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interim);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, input]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('text/') || /\.(md|json|csv|txt)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = (ev) => setInput(prev => prev + (prev ? '\n' : '') + ev.target.result);
        reader.readAsText(file);
      }
    }
  }, []);

  const handleSend = (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || streaming) return;
    if (!model) { toast('Please select a model first', 'info'); return; }
    if (!conversation) {
      onCreateChat(model);
      setTimeout(() => onSend(text, enableThinking, { temperature, maxTokens }), 50);
    } else {
      onSend(text, enableThinking, { temperature, maxTokens });
    }
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const saveSystemPrompt = () => {
    onSystemPromptChange?.(localSystemPrompt);
    setShowSystemPrompt(false);
  };

  const handleEditSave = (msgIndex, newText) => {
    setEditingMsg(null);
    onEditMessage(msgIndex, newText);
  };

  const handleShareChat = useCallback(() => {
    if (!conversation || messages.length === 0) return;
    let md = `# ${conversation.title}\n\nModel: ${conversation.model}\n\n---\n\n`;
    for (const msg of messages) {
      if (msg.role === 'user') {
        md += `## You\n\n${msg.content}\n\n`;
      } else {
        if (msg.thinking) md += `<details><summary>Reasoning</summary>\n\n${msg.thinking}\n\n</details>\n\n`;
        md += `## Assistant\n\n${msg.content}\n\n`;
      }
    }
    navigator.clipboard.writeText(md);
    toast('Chat copied to clipboard as markdown', 'success');
  }, [conversation, messages, toast]);

  const lastAssistantIdx = [...messages].map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop();

  const modelGroups = {};
  for (const m of (models || [])) {
    if (!modelGroups[m.provider]) modelGroups[m.provider] = [];
    modelGroups[m.provider].push(m);
  }
  const PROVIDER_NAMES = {
    anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', meta: 'Meta',
    mistralai: 'Mistral', qwen: 'Qwen', 'x-ai': 'xAI', 'deepseek-ai': 'DeepSeek',
    nvidia: 'NVIDIA', 'z-ai': 'Z.AI', microsoft: 'Microsoft', deepseek: 'DeepSeek',
    minimax: 'MiniMax', ring: 'Ring', 'arli-ai': 'Arli AI', moonshotai: 'Moonshot',
    minimaxai: 'MiniMax', 'stepfun-ai': 'StepFun', sarvamai: 'Sarvam',
    stockmark: 'Stockmark', upstage: 'Upstage',
  };

  const topProviders = ['anthropic', 'openai', 'google', 'meta', 'mistralai', 'qwen', 'x-ai', 'deepseek-ai', 'nvidia', 'z-ai', 'deepseek', 'minimax', 'ring', 'arli-ai'];

  return (
    <main className="chat-area">
      <header className="chat-header">
        <button className="icon-btn menu-btn" onClick={onOpenSidebar}>
          <Menu size={20} />
        </button>
        <ModelSelector value={model} onChange={onModelChange} />
        {currentModel && (
          <button className="icon-btn model-info-btn" onClick={() => setShowModelInfo(!showModelInfo)} title="Model info">
            <Eye size={16} />
          </button>
        )}
        {showModelInfo && <ModelInfoPopup model={currentModel} onClose={() => setShowModelInfo(false)} />}
        <div className="header-right">
          {model && (
            <button
              className={`thinking-toggle-btn ${enableThinking ? 'active' : ''}`}
              onClick={() => setEnableThinking(!enableThinking)}
              title={enableThinking ? 'Thinking mode ON' : 'Enable thinking'}
            >
              <Brain size={15} />
              <span>Think</span>
            </button>
          )}
          {totalTokens > 0 && (
            <span className="token-counter" title="Total tokens used">
              <Zap size={12} /> {totalTokens.toLocaleString()}
            </span>
          )}
          <button className={`icon-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)} title="Generation settings">
            <Thermometer size={16} />
          </button>
          <button className={`icon-btn ${showSystemPrompt ? 'active' : ''}`} onClick={() => setShowSystemPrompt(!showSystemPrompt)} title="System prompt">
            <Settings2 size={17} />
          </button>
          {conversation && messages.length > 0 && (
            <button className="icon-btn" onClick={handleShareChat} title="Share chat (Ctrl+Shift+S)">
              <Share2 size={16} />
            </button>
          )}
          <button className="icon-btn" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (Ctrl+/)">
            <Keyboard size={16} />
          </button>
          <button className="icon-btn" onClick={() => onCreateChat(model)} title="New chat (Ctrl+N)">
            <MessageSquarePlus size={17} />
          </button>
        </div>
      </header>

      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}

      {showSettings && (
        <div className="settings-bar">
          <div className="settings-item">
            <label><Thermometer size={12} /> Temp</label>
            <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} />
            <span className="settings-value">{temperature.toFixed(1)}</span>
          </div>
          <div className="settings-item">
            <label><Hash size={12} /> Max tokens</label>
            <input type="range" min="256" max="8192" step="256" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} />
            <span className="settings-value">{maxTokens.toLocaleString()}</span>
          </div>
        </div>
      )}

      {showSystemPrompt && (
        <div className="system-prompt-bar">
          <input
            type="text"
            value={localSystemPrompt}
            onChange={e => setLocalSystemPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveSystemPrompt(); }}
            placeholder="System prompt (e.g. 'You are a helpful coding assistant')"
            className="system-prompt-input"
          />
          <button className="system-prompt-save" onClick={saveSystemPrompt}>Save</button>
        </div>
      )}

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-logo">
              <div className="empty-logo-icon"><Sparkles size={32} /></div>
            </div>
            <h1 className="empty-title">What can I help with?</h1>
            <p className="empty-subtitle">
              {model ? `Chat with ${currentModel?.name || model}` : 'Choose a model below to get started'}
            </p>
            {currentModel && (
              <div className="empty-model-tags">
                {currentModel.tags?.filter(t => !['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github','llm7'].includes(t)).map(t => <span key={t} className={`model-tag tag-${t}`}>{t}</span>)}
                {currentModel.tags?.includes('zen') && <span className="model-tag tag-zen">via Zen</span>}
                {currentModel.tags?.includes('arli') && <span className="model-tag tag-arli">via Arli</span>}
                {currentModel.tags?.includes('freetheai') && <span className="model-tag tag-freetheai">via FreeTheAi</span>}
                {currentModel.tags?.includes('modal') && <span className="model-tag tag-modal">via Modal</span>}
                {currentModel.tags?.includes('groq') && <span className="model-tag tag-groq">via Groq</span>}
                {currentModel.tags?.includes('sambanova') && <span className="model-tag tag-sambanova">via SambaNova</span>}
                {currentModel.tags?.includes('cerebras') && <span className="model-tag tag-cerebras">via Cerebras</span>}
                {currentModel.tags?.includes('google-ai') && <span className="model-tag tag-google-ai">via Google AI</span>}
                {currentModel.tags?.includes('openrouter') && <span className="model-tag tag-openrouter">via OpenRouter</span>}
                {currentModel.tags?.includes('github') && <span className="model-tag tag-github">via GitHub</span>}
                {currentModel.tags?.includes('llm7') && <span className="model-tag tag-llm7">via LLM7</span>}
                {currentModel.speed === 'slow' && <span className="model-tag tag-slow">slow</span>}
                {currentModel.speed === 'medium' && <span className="model-tag tag-medium">medium</span>}
                {currentModel.ttk != null && <span className="model-tag tag-speed"><Zap size={8} />{currentModel.ttk < 1 ? '<1s' : `${Math.round(currentModel.ttk)}s`}</span>}
              </div>
            )}

            {!model ? (
              <div className="model-cards">
                {topProviders.filter(p => modelGroups[p]).slice(0, 8).map(provider => (
                  <div key={provider} className="model-card-group">
                    <div className="model-card-provider">
                      {PROVIDER_NAMES[provider] || provider}
                    </div>
                    <div className="model-card-list">
                      {modelGroups[provider].slice(0, 2).map(m => (
                        <button key={m.id} className="model-card" onClick={() => onModelChange(m.id)}>
                          <span className="model-card-name">{m.name}</span>
                          <span className="model-card-tags">
                            {m.tags?.filter(t => !['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github','llm7'].includes(t)).map(t => <span key={t} className={`model-tag tag-${t}`}>{t}</span>)}
                            {m.tags?.includes('zen') && <span className="model-tag tag-zen">Zen</span>}
                            {m.tags?.includes('arli') && <span className="model-tag tag-arli">Arli</span>}
                            {m.tags?.includes('freetheai') && <span className="model-tag tag-freetheai">FreeTheAi</span>}
                            {m.tags?.includes('modal') && <span className="model-tag tag-modal">Modal</span>}
                            {m.tags?.includes('groq') && <span className="model-tag tag-groq">Groq</span>}
                            {m.tags?.includes('sambanova') && <span className="model-tag tag-sambanova">SambaNova</span>}
                            {m.tags?.includes('cerebras') && <span className="model-tag tag-cerebras">Cerebras</span>}
                            {m.tags?.includes('google-ai') && <span className="model-tag tag-google-ai">Google</span>}
                            {m.tags?.includes('openrouter') && <span className="model-tag tag-openrouter">OpenRouter</span>}
                            {m.tags?.includes('github') && <span className="model-tag tag-github">GitHub</span>}
                            {m.tags?.includes('llm7') && <span className="model-tag tag-llm7">LLM7</span>}
                            {m.speed === 'slow' && <span className="model-tag tag-slow">slow</span>}
                            {m.ttk != null && <span className="model-tag tag-speed"><Zap size={8} />{m.ttk < 1 ? '<1s' : `${Math.round(m.ttk)}s`}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="suggestion-card" onClick={() => handleSend(s.text)}>
                    <span className="suggestion-icon">{s.icon}</span>
                    <span className="suggestion-label">{s.label}</span>
                    <span className="suggestion-text">{s.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="message-wrapper">
              {editingMsg === i ? (
                <div className="message message-user editing">
                  <div className="message-avatar avatar-user"><Pencil size={16} /></div>
                  <div className="message-body">
                    <EditMessageInput
                      original={msg.content}
                      onSave={(text) => handleEditSave(i, text)}
                      onCancel={() => setEditingMsg(null)}
                    />
                  </div>
                </div>
              ) : (
                <MessageBubble
                  message={msg}
                  isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
                  onRegenerate={i === lastAssistantIdx && !streaming ? () => onRegenerate(i) : undefined}
                  onEdit={msg.role === 'user' && !streaming ? () => setEditingMsg(i) : undefined}
                  onBranch={msg.role === 'user' && !streaming && onBranch ? () => onBranch(i) : undefined}
                />
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollBtn && (
        <button className="scroll-to-bottom" onClick={() => scrollToBottom()}>
          <ArrowDown size={16} />
        </button>
      )}

      <div
        className={`chat-input-area ${isDragging ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drag-overlay">
            <Sparkles size={24} />
            <span>Drop text file here</span>
          </div>
        )}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={model ? 'Ask anything...' : 'Select a model to start...'}
              rows={1}
              disabled={!model}
            />
            <div className="input-meta">
              {charCount > 0 && <span className="char-count">{charCount}</span>}
              <button
                className={`icon-btn voice-btn ${isListening ? 'voice-active' : ''}`}
                onClick={toggleVoice}
                disabled={!model}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              {streaming ? (
                <button className="send-btn stop" onClick={onStop} title="Stop">
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button
                  className={`send-btn ${input.trim() && model ? 'active' : ''}`}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || !model}
                  title="Send (Enter)"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
          {(waitingForFirst || thinkingActive) && (
            <div className="thinking-status">
              {waitingForFirst && !thinkingActive ? (
                <>
                  <Timer size={13} className="thinking-pulse" />
                  <span>Waiting for response... {ttkLive}s</span>
                </>
              ) : (
                <>
                  <Brain size={13} className="thinking-pulse" />
                  <span>Reasoning... {ttkLive ? `${ttkLive}s` : ''}</span>
                </>
              )}
            </div>
          )}
        </div>
        <p className="chat-input-hint">
          DouletAI may produce inaccurate information. All models are free to use.
        </p>
      </div>
    </main>
  );
}
