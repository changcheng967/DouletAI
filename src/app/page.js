'use client';
import { useState, useCallback } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/hooks/useChat';
import { useModels } from '@/hooks/useModels';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { models } = useModels();
  const {
    conversations, active, activeId,
    setActiveId, create, remove, clearAll, rename, togglePin,
    updateMessages, updateModel, updateSystemPrompt,
  } = useConversations();

  const handleMessagesUpdate = useCallback((messages) => {
    if (!active) return;
    // Add timestamp to new user messages
    const withTimestamps = messages.map(m =>
      m.timestamp ? m : { ...m, timestamp: Date.now() }
    );
    updateMessages(active.id, withTimestamps);
  }, [active, updateMessages]);

  const { send, stop, streaming, thinkingActive, waitingForFirst } = useChat(handleMessagesUpdate);

  const buildMessages = useCallback((msgs, systemPrompt) => {
    const result = [];
    if (systemPrompt?.trim()) {
      result.push({ role: 'system', content: systemPrompt.trim() });
    }
    for (const m of msgs) {
      result.push({ role: m.role, content: m.content });
    }
    return result;
  }, []);

  const handleSend = useCallback((text, enableThinking, options) => {
    if (!active) return;
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    const newMessages = [...active.messages, userMsg];
    updateMessages(active.id, newMessages);
    const apiMessages = buildMessages(newMessages, active.systemPrompt);
    send(apiMessages, active.model, enableThinking, options);
  }, [active, send, updateMessages, buildMessages]);

  const handleCreate = useCallback((modelId) => {
    create(modelId || '');
  }, [create]);

  const handleModelChange = useCallback((modelId) => {
    if (active) {
      updateModel(active.id, modelId);
    } else {
      create(modelId);
    }
  }, [active, updateModel, create]);

  const handleRegenerate = useCallback((msgIndex) => {
    if (!active) return;
    const msgs = active.messages.slice(0, msgIndex);
    updateMessages(active.id, msgs);
    if (msgs.length > 0) {
      const apiMessages = buildMessages(msgs, active.systemPrompt);
      send(apiMessages, active.model);
    }
  }, [active, send, updateMessages, buildMessages]);

  const handleEditMessage = useCallback((msgIndex, newText) => {
    if (!active) return;
    const msgs = active.messages.slice(0, msgIndex);
    msgs[msgIndex] = { role: 'user', content: newText, timestamp: Date.now() };
    updateMessages(active.id, msgs);
    const apiMessages = buildMessages(msgs, active.systemPrompt);
    send(apiMessages, active.model);
  }, [active, send, updateMessages, buildMessages]);

  const handleBranch = useCallback((msgIndex) => {
    if (!active) return;
    const msgs = active.messages.slice(0, msgIndex + 1).map(m => ({ ...m }));
    create(active.model, active.systemPrompt, msgs);
  }, [active, create]);

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={() => handleCreate()}
        onDelete={remove}
        onClearAll={clearAll}
        onRename={rename}
        onTogglePin={togglePin}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
      />
      <ChatArea
        conversation={active}
        streaming={streaming}
        thinkingActive={thinkingActive}
        waitingForFirst={waitingForFirst}
        onSend={handleSend}
        onStop={stop}
        onModelChange={handleModelChange}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCreateChat={handleCreate}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
        onBranch={handleBranch}
        models={models}
        systemPrompt={active?.systemPrompt || ''}
        onSystemPromptChange={(sp) => active && updateSystemPrompt(active.id, sp)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  );
}
