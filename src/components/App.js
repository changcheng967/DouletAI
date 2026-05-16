'use client';
import { useState, useCallback, useRef } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/hooks/useChat';
import { useModels } from '@/hooks/useModels';
import { useSettings } from '@/hooks/useSettings';
import { useTemplates } from '@/hooks/useTemplates';
import { generateTitle } from '@/lib/api';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { models } = useModels();
  const { settings, updateSetting, presets, createPreset, deletePreset } = useSettings();
  const { templates, createTemplate, deleteTemplate } = useTemplates();
  const {
    conversations, active, activeId,
    setActiveId, create, remove, clearAll, rename, togglePin,
    updateMessages, updateModel, updateSystemPrompt, rateMessage,
    folders, createFolder, renameFolder, deleteFolder, moveToFolder,
  } = useConversations();

  const handleMessagesUpdate = useCallback((messages) => {
    if (!active) return;
    const withTimestamps = messages.map(m =>
      m.timestamp ? m : { ...m, timestamp: Date.now() }
    );
    updateMessages(active.id, withTimestamps);
  }, [active, updateMessages]);

  const titleGenStarted = useRef(new Set());

  const handleStreamComplete = useCallback((finalMessages) => {
    if (!active) return;
    if (titleGenStarted.current.has(active.id)) return;
    const userMsgCount = finalMessages.filter(m => m.role === 'user').length;
    if (userMsgCount !== 1) return;
    titleGenStarted.current.add(active.id);
    const firstUser = finalMessages.find(m => m.role === 'user');
    if (!firstUser) return;
    generateTitle(firstUser.content).then(title => {
      if (title) rename(active.id, title);
    });
  }, [active, rename]);

  const { send, stop, streaming, thinkingActive, waitingForFirst } = useChat(handleMessagesUpdate, handleStreamComplete);

  const buildMessages = useCallback((msgs, systemPrompt) => {
    const result = [];
    let systemContent = '';
    if (settings.customInstructions?.trim()) {
      systemContent += settings.customInstructions.trim();
    }
    if (systemPrompt?.trim()) {
      if (systemContent) systemContent += '\n\n';
      systemContent += systemPrompt.trim();
    }
    if (systemContent) {
      result.push({ role: 'system', content: systemContent });
    }
    for (const m of msgs) {
      result.push({ role: m.role, content: m.content });
    }
    return result;
  }, [settings.customInstructions]);

  const handleSend = useCallback((text, enableThinking, options, images) => {
    if (!active) return;
    const userMsg = { role: 'user', content: text, timestamp: Date.now(), images: images?.map(img => ({ dataUrl: img.dataUrl, name: img.name })) };
    const newMessages = [...active.messages, userMsg];
    updateMessages(active.id, newMessages);
    const apiMessages = buildMessages(newMessages, active.systemPrompt);
    const multimodal = apiMessages.map(m => {
      const orig = newMessages.find(o => o.role === m.role && o.content === m.content && o.images?.length > 0);
      if (orig?.images?.length > 0) return { ...m, content: [...orig.images.map(img => ({ type: 'image_url', image_url: { url: img.dataUrl } })), { type: 'text', text: m.content }] };
      return m;
    });
    send(multimodal, active.model, enableThinking, options);
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

  const handleRateMessage = useCallback((msgIndex, rating) => {
    if (!active) return;
    rateMessage(active.id, msgIndex, rating);
  }, [active, rateMessage]);

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
        folders={folders}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onMoveToFolder={moveToFolder}
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
        onRateMessage={handleRateMessage}
        models={models}
        systemPrompt={active?.systemPrompt || ''}
        onSystemPromptChange={(sp) => active && updateSystemPrompt(active.id, sp)}
        settings={settings}
        onUpdateSetting={updateSetting}
        templates={templates}
        onCreateTemplate={createTemplate}
        onDeleteTemplate={deleteTemplate}
        presets={presets}
        onCreatePreset={createPreset}
        onDeletePreset={deletePreset}
      />
    </div>
  );
}
