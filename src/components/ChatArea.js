'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Menu, Send, Square, Sparkles, Brain, Lightbulb, Code2, BookOpen, ArrowDown, MessageSquarePlus, Settings2, Pencil, X as XIcon, Eye, Mic, MicOff, Keyboard, Share2, GitBranch, Timer, Thermometer, Hash, Zap, Clock, FileText, Globe, ImagePlus } from 'lucide-react';
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
  { keys: '/', desc: 'Focus input' },
  { keys: 'Ctrl + N', desc: 'New chat' },
  { keys: 'Ctrl + /', desc: 'Keyboard shortcuts' },
  { keys: 'Ctrl + Shift + S', desc: 'Share chat' },
  { keys: 'Escape', desc: 'Close dialogs' },
];

const CAPABILITY_ICONS = { vision: <Eye size={10} />, reasoning: <Brain size={10} />, coding: <Code2 size={10} /> };
const ROUTING_TAGS = new Set(['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github','llm7']);
const getCapabilities = (tags) => (tags || []).filter(t => !ROUTING_TAGS.has(t));

function SpeedBadge({ speed, ttk }) {
  if (ttk != null) return <span className="badge badge-speed"><Zap size={8} />{ttk < 1 ? '<1s' : `${Math.round(ttk)}s`}</span>;
  if (speed === 'slow') return <span className="badge badge-slow"><Clock size={9} /> Slow</span>;
  if (speed === 'medium') return <span className="badge badge-medium"><Clock size={9} /> Med</span>;
  return null;
}

const PROVIDER_DISPLAY = {
  anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', meta: 'Meta',
  mistralai: 'Mistral', qwen: 'Qwen', 'x-ai': 'xAI', 'deepseek-ai': 'DeepSeek',
  nvidia: 'NVIDIA', 'z-ai': 'Z.AI', microsoft: 'Microsoft', deepseek: 'DeepSeek',
  minimax: 'MiniMax', ring: 'Ring', 'arli-ai': 'Arli AI', moonshotai: 'Moonshot',
  minimaxai: 'MiniMax', 'stepfun-ai': 'StepFun', sarvamai: 'Sarvam',
  stockmark: 'Stockmark', upstage: 'Upstage',
};

const FEATURED_IDS = [
  'meta/llama-4-maverick-17b-128e-instruct',
  'qwen/qwen3-coder-480b-a35b-instruct',
  'mistralai/mistral-nemotron',
  'openai/gpt-oss-120b',
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'groq/deepseek-r1-distill-llama-70b',
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

function ModelInfoPopup({ model, onClose, containerRef }) {
  if (!model) return null;
  return (
    <div className="model-info-popup" ref={containerRef}>
      <div className="model-info-header">
        <span className="model-info-name">{model.name}</span>
        <button className="icon-btn" onClick={onClose}><XIcon size={14} /></button>
      </div>
      <div className="model-info-body">
        <div className="model-info-row"><span>Provider</span><span>{PROVIDER_DISPLAY[model.provider] || model.provider}</span></div>
        {model.context_length && <div className="model-info-row"><span>Context</span><span>{(model.context_length/1000).toFixed(0)}K tokens</span></div>}
        <div className="model-info-row"><span>Speed</span><span className={`speed-badge speed-${model.speed}`}>{model.speed}</span></div>
        {getCapabilities(model.tags).length > 0 && (
          <div className="model-info-tags">
            {getCapabilities(model.tags).map(t => (
              <span key={t} className={`badge badge-${t}`}>{CAPABILITY_ICONS[t]} {t}</span>
            ))}
          </div>
        )}
        <div className="model-info-row model-info-id"><span>ID</span><span className="model-id-text">{model.id}</span></div>
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
  onRateMessage,
  models,
  systemPrompt,
  onSystemPromptChange,
  settings,
  onUpdateSetting,
  templates,
  onCreateTemplate,
  onDeleteTemplate,
  presets,
  onCreatePreset,
  onDeletePreset,
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
  const [pendingImages, setPendingImages] = useState([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [temperature, setTemperature] = useState(0.6);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [ttkLive, setTtkLive] = useState(null);
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const ttkTimerRef = useRef(null);
  const modelInfoRef = useRef(null);
  const settingsRef = useRef(null);
  const imageInputRef = useRef(null);

  const isVisionModel = useMemo(() => {
    if (!models || !model) return false;
    const m = models.find(x => x.id === model);
    return m?.tags?.includes('vision');
  }, [models, model]);

  const addImages = useCallback((files) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    for (const file of files) {
      if (!allowed.includes(file.type)) continue;
      if (file.size > 10485760) continue;
      const reader = new FileReader();
      reader.onload = (e) => setPendingImages(prev => [...prev, { id: crypto.randomUUID(), dataUrl: e.target.result, name: file.name }]);
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback((id) => setPendingImages(prev => prev.filter(img => img.id !== id)), []);

  // Click outside to dismiss popups
  useEffect(() => {
    function handleClick(e) {
      if (showModelInfo && modelInfoRef.current && !modelInfoRef.current.contains(e.target)) {
        setShowModelInfo(false);
      }
      if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showModelInfo, showSettings]);

  const messages = conversation?.messages || [];
  const model = conversation?.model || '';

  const currentModel = models?.find(m => m.id === model);
  const charCount = input.length;

  const totalTokens = useMemo(() => messages.reduce((sum, m) => {
    if (m.usage) return sum + (m.usage.prompt_tokens || 0) + (m.usage.completion_tokens || 0);
    return sum;
  }, 0), [messages]);

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
      const tag = e.target.tagName;
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); onCreateChat(model); }
      if (e.ctrlKey && e.key === '/') { e.preventDefault(); setShowShortcuts(s => !s); }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); handleShareChat(); }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowModelInfo(false);
        setShowSettings(false);
      }
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        textareaRef.current?.focus();
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
    if ((!text && pendingImages.length === 0) || streaming) return;
    if (!model) { toast('Please select a model first', 'info'); return; }
    const images = pendingImages.length > 0 ? [...pendingImages] : undefined;
    if (!conversation) {
      onCreateChat(model);
      setTimeout(() => onSend(text, enableThinking, { temperature, maxTokens }, images), 50);
    } else {
      onSend(text, enableThinking, { temperature, maxTokens }, images);
    }
    setInput('');
    setPendingImages([]);
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


  return (
    <main className="chat-area">
      <header className="chat-header">
        <button className="icon-btn menu-btn" onClick={onOpenSidebar}>
          <Menu size={20} />
        </button>
        <ModelSelector value={model} onChange={onModelChange} models={models} />
        {currentModel && (
          <button className="icon-btn model-info-btn" onClick={() => setShowModelInfo(!showModelInfo)} title="Model info">
            <Eye size={16} />
          </button>
        )}
        {showModelInfo && <ModelInfoPopup model={currentModel} onClose={() => setShowModelInfo(false)} containerRef={modelInfoRef} />}
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
        <div className="settings-bar" ref={settingsRef}>
          <div className="settings-item">
            <label><Thermometer size={12} /> Preset</label>
            <select
              className="preset-select"
              value=""
              onChange={e => {
                const p = presets?.find(pr => pr.id === e.target.value);
                if (p) { setTemperature(p.temperature); setMaxTokens(p.maxTokens); }
              }}
            >
              <option value="" disabled>Load preset...</option>
              {presets?.map(p => (
                <option key={p.id} value={p.id}>{p.name} (T:{p.temperature} M:{p.maxTokens})</option>
              ))}
            </select>
          </div>
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
          <button
            className="action-btn preset-save-btn"
            onClick={() => {
              const name = prompt('Preset name:');
              if (name?.trim()) onCreatePreset?.(name.trim(), temperature, maxTokens);
            }}
            title="Save current settings as preset"
          >
            <Plus size={12} /> Save preset
          </button>
          <div className="settings-item settings-item-wide">
            <label><FileText size={12} /> Custom instructions</label>
            <textarea
              value={settings?.customInstructions || ''}
              onChange={e => onUpdateSetting?.('customInstructions', e.target.value)}
              placeholder="Tell the AI how to behave (applies to all chats)..."
              className="settings-textarea"
              rows={2}
            />
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
            <div className="empty-hero">
              <div className="empty-logo">
                <div className="empty-logo-icon"><Sparkles size={32} /></div>
              </div>
              <h1 className="empty-title">What can I help with?</h1>
              <p className="empty-subtitle">
                {model
                  ? `Chat with ${currentModel?.name || model}`
                  : `${models?.length || '50+'} free models from top AI providers`}
              </p>
            </div>

            {currentModel && (
              <div className="empty-model-badges">
                {getCapabilities(currentModel.tags).map(t => (
                  <span key={t} className={`badge badge-${t}`}>{CAPABILITY_ICONS[t]} {t}</span>
                ))}
                <SpeedBadge speed={currentModel.speed} ttk={currentModel.ttk} />
              </div>
            )}

            {!model ? (
              <>
                <div className="feature-strip">
                  <span className="feature-item"><Zap size={12} /> Streaming</span>
                  <span className="feature-item"><Mic size={12} /> Voice</span>
                  <span className="feature-item"><Code2 size={12} /> Code</span>
                  <span className="feature-item"><Brain size={12} /> Reasoning</span>
                </div>
                <div className="featured-models">
                  <div className="featured-header">Quick Start — pick a model</div>
                  <div className="featured-grid">
                    {models?.filter(m => FEATURED_IDS.includes(m.id)).map(m => (
                      <button key={m.id} className="featured-card" onClick={() => onModelChange(m.id)}>
                        <span className="featured-name">{m.name}</span>
                        <span className="featured-provider">{PROVIDER_DISPLAY[m.provider] || m.provider}</span>
                        <span className="featured-badges">
                          {getCapabilities(m.tags).map(t => (
                            <span key={t} className={`badge badge-${t}`}>{CAPABILITY_ICONS[t]}</span>
                          ))}
                          <SpeedBadge speed={m.speed} ttk={m.ttk} />
                        </span>
                      </button>
                    ))}
                    {models && models.filter(m => FEATURED_IDS.includes(m.id)).length === 0 && (
                      <div className="featured-empty">
                        Use the model selector above to choose a model
                      </div>
                    )}
                  </div>
                </div>
              </>
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
                  onRate={msg.role === 'assistant' && !streaming ? (rating) => onRateMessage(i, rating) : undefined}
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
          {pendingImages.length > 0 && (
            <div className="image-previews">
              {pendingImages.map(img => (
                <div key={img.id} className="image-preview-item">
                  <img src={img.dataUrl} alt="" />
                  <button className="image-preview-remove" onClick={() => removeImage(img.id)}><XIcon size={10} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="chat-input-wrapper">
            {isVisionModel && (
              <>
                <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={e => { addImages(Array.from(e.target.files)); e.target.value = ''; }} />
                <button className="icon-btn image-btn" onClick={() => imageInputRef.current?.click()} disabled={!model} title="Upload image"><ImagePlus size={15} /></button>
              </>
            )}
            <div className="template-picker-wrapper">
              <button
                className="icon-btn template-btn"
                onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                disabled={!model}
                title="Prompt templates"
              >
                <BookOpen size={15} />
              </button>
              {showTemplatePicker && (
                <div className="template-picker">
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="template-picker-list">
                    {(templates || [])
                      .filter(t => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.prompt.toLowerCase().includes(templateSearch.toLowerCase()))
                      .map(t => (
                        <button
                          key={t.id}
                          className="template-picker-item"
                          onClick={() => { setInput(t.prompt + '\n\n'); setShowTemplatePicker(false); setTemplateSearch(''); textareaRef.current?.focus(); }}
                        >
                          <span className="template-picker-name">{t.name}</span>
                          <span className="template-picker-preview">{t.prompt.slice(0, 60)}{t.prompt.length > 60 ? '...' : ''}</span>
                        </button>
                      ))}
                    {(templates || []).filter(t => !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.prompt.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 && (
                      <div className="template-picker-empty">No templates found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
              <button className={`icon-btn web-search-btn ${webSearchEnabled ? 'active' : ''}`} onClick={() => setWebSearchEnabled(!webSearchEnabled)} disabled={!model} title="Web search"><Globe size={15} /></button>
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
