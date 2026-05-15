'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Eye, Brain, Code2, Clock, Zap, ZapOff, Timer } from 'lucide-react';
import { fetchModels } from '@/lib/api';

const PROVIDER_NAMES = {
  anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', meta: 'Meta',
  mistralai: 'Mistral', qwen: 'Qwen', 'x-ai': 'xAI', 'deepseek-ai': 'DeepSeek',
  nvidia: 'NVIDIA', 'z-ai': 'Z.AI', microsoft: 'Microsoft', deepseek: 'DeepSeek',
  minimax: 'MiniMax', ring: 'Ring', 'arli-ai': 'Arli AI', moonshotai: 'Moonshot',
  minimaxai: 'MiniMax', 'stepfun-ai': 'StepFun', sarvamai: 'Sarvam',
  stockmark: 'Stockmark', upstage: 'Upstage',
};

const TAG_ICONS = {
  vision: <Eye size={10} />,
  reasoning: <Brain size={10} />,
  coding: <Code2 size={10} />,
};

export default function ModelSelector({ value, onChange }) {
  const [models, setModels] = useState(null);
  const [grouped, setGrouped] = useState({});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    fetchModels()
      .then(data => {
        setModels(data.models || []);
        setGrouped(data.grouped || {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedModel = models?.find(m => m.id === value);
  const displayName = selectedModel
    ? selectedModel.name
    : value ? value.split('/').pop() : 'Select a model...';

  const displayGrouped = search
    ? (() => {
        const q = search.toLowerCase();
        const filtered = {};
        for (const [provider, ms] of Object.entries(grouped)) {
          const match = ms.filter(m =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            m.provider.toLowerCase().includes(q) ||
            (m.tags || []).some(t => t.includes(q))
          );
          if (match.length) filtered[provider] = match;
        }
        return filtered;
      })()
    : grouped;

  return (
    <div className="model-selector" ref={ref}>
      <button className="model-selector-btn" onClick={() => setOpen(!open)}>
        <span className="model-selector-value">
          {displayName}
          {selectedModel?.speed === 'slow' && <span className="model-tag tag-slow"><Clock size={9} /> slow</span>}
          {selectedModel?.speed === 'medium' && <span className="model-tag tag-medium"><Clock size={9} /> med</span>}
          {selectedModel?.ttk && <span className="model-tag tag-speed"><Zap size={8} />{selectedModel.ttk < 1 ? '<1s' : `${Math.round(selectedModel.ttk)}s`}</span>}
          {selectedModel?.tags?.length > 0 && (
            <span className="model-tags-inline">
              {selectedModel.tags.filter(t => !['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github'].includes(t)).map(t => (
                <span key={t} className={`model-tag tag-${t}`}>{TAG_ICONS[t]} {t}</span>
              ))}
              {selectedModel.tags.includes('zen') && <span className="model-tag tag-zen">via Zen</span>}
              {selectedModel.tags.includes('arli') && <span className="model-tag tag-arli">via Arli</span>}
              {selectedModel.tags.includes('freetheai') && <span className="model-tag tag-freetheai">via FreeTheAi</span>}
              {selectedModel.tags.includes('modal') && <span className="model-tag tag-modal">via Modal</span>}
              {selectedModel.tags.includes('groq') && <span className="model-tag tag-groq">via Groq</span>}
              {selectedModel.tags.includes('sambanova') && <span className="model-tag tag-sambanova">via SambaNova</span>}
              {selectedModel.tags.includes('cerebras') && <span className="model-tag tag-cerebras">via Cerebras</span>}
              {selectedModel.tags.includes('google-ai') && <span className="model-tag tag-google-ai">via Google</span>}
              {selectedModel.tags.includes('openrouter') && <span className="model-tag tag-openrouter">via OpenRouter</span>}
              {selectedModel.tags.includes('github') && <span className="model-tag tag-github">via GitHub</span>}
            </span>
          )}
        </span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="model-selector-dropdown">
          <div className="model-selector-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search models, tags (vision, reasoning, coding)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {models && <span className="model-count">{models.length} models</span>}
          </div>
          <div className="model-selector-list">
            {Object.entries(displayGrouped).map(([provider, ms]) => (
              <div key={provider}>
                <div className="model-selector-group">
                  {PROVIDER_NAMES[provider] || provider}
                  <span className="model-selector-group-count">{ms.length}</span>
                </div>
                {ms.map(m => (
                  <button
                    key={m.id}
                    className={`model-selector-item ${m.id === value ? 'active' : ''} ${m.speed === 'slow' ? 'model-slow' : ''}`}
                    onClick={() => { onChange(m.id); setOpen(false); setSearch(''); }}
                  >
                    <span className="model-item-name">{m.name}</span>
                    <span className="model-item-tags">
                      {m.speed === 'slow' && <span className="model-tag tag-slow"><Clock size={9} /></span>}
                      {m.speed === 'medium' && <span className="model-tag tag-medium"><Clock size={9} /></span>}
                      {m.ttk && <span className="model-tag tag-speed"><Zap size={8} />{m.ttk < 1 ? '<1s' : `${Math.round(m.ttk)}s`}</span>}
                      {m.tags?.filter(t => !['zen','arli','freetheai','modal','groq','sambanova','cerebras','google-ai','openrouter','github'].includes(t)).map(t => (
                        <span key={t} className={`model-tag tag-${t}`}>{TAG_ICONS[t]}</span>
                      ))}
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
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {models === null && <div className="model-selector-loading">Loading models...</div>}
            {models?.length === 0 && <div className="model-selector-loading">No models available</div>}
          </div>
        </div>
      )}
    </div>
  );
}
