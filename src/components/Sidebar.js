'use client';
import { useState } from 'react';
import { Plus, MessageSquare, Trash2, X, Sun, Moon, Download, Search, Pencil, Check, Trash, Pin, PinOff, FolderPlus, Folder, FolderOpen } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useToast } from './Toast';

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onClearAll,
  onRename,
  onTogglePin,
  onClose,
  open,
  folders = [],
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveToFolder,
}) {
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [showFolderMenu, setShowFolderMenu] = useState(null);

  const filtered = search
    ? conversations.filter(c => {
        const q = search.toLowerCase();
        if (c.title.toLowerCase().includes(q)) return true;
        return (c.messages || []).some(m => m.content?.toLowerCase().includes(q));
      }).map(c => {
        const q = search.toLowerCase();
        if (c.title.toLowerCase().includes(q)) return { ...c, searchSnippet: null };
        const matchMsg = (c.messages || []).find(m => m.content?.toLowerCase().includes(q));
        if (matchMsg) {
          const idx = matchMsg.content.toLowerCase().indexOf(q);
          const start = Math.max(0, idx - 30);
          const end = Math.min(matchMsg.content.length, idx + search.length + 30);
          const snippet = (start > 0 ? '...' : '') + matchMsg.content.slice(start, end) + (end < matchMsg.content.length ? '...' : '');
          return { ...c, searchSnippet: snippet };
        }
        return c;
      })
    : conversations;

  const pinned = filtered.filter(c => c.pinned);
  const unfiled = filtered.filter(c => !c.pinned && !c.folderId);
  const today = [];
  const older = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  for (const c of unfiled) {
    (now - c.createdAt < dayMs ? today : older).push(c);
  }

  const toggleFolder = (id) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const exportChat = (conv) => {
    let md = `# ${conv.title}\n\nModel: ${conv.model}\n\n---\n\n`;
    for (const msg of conv.messages) {
      if (msg.role === 'user') {
        md += `## You\n\n${msg.content}\n\n`;
      } else {
        if (msg.thinking) md += `<details><summary>Reasoning</summary>\n\n${msg.thinking}\n\n</details>\n\n`;
        md += `## Assistant\n\n${msg.content}\n\n`;
      }
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Chat exported', 'success');
  };

  const renderItem = (conv) => (
    <ConversationItem
      key={conv.id} conv={conv} active={conv.id === activeId}
      onSelect={() => { onSelect(conv.id); onClose(); }}
      onDelete={() => onDelete(conv.id)}
      onExport={() => exportChat(conv)}
      onRename={(t) => onRename(conv.id, t)}
      onTogglePin={() => onTogglePin(conv.id)}
      searchSnippet={conv.searchSnippet}
      folders={folders}
      onMoveToFolder={onMoveToFolder}
      showFolderMenu={showFolderMenu}
      setShowFolderMenu={setShowFolderMenu}
    />
  );

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="brand-name">DouletAI</span>
          </div>
          <button className="icon-btn sidebar-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sidebar-actions">
          <button className="new-chat-btn" onClick={() => { onCreate(); onClose(); }}>
            <Plus size={16} />
            <span>New chat</span>
          </button>
          {onCreateFolder && (
            <button className="new-folder-btn" onClick={() => setShowNewFolder(!showNewFolder)}>
              <FolderPlus size={16} />
              <span>New folder</span>
            </button>
          )}
        </div>

        {showNewFolder && (
          <div className="sidebar-new-folder">
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              autoFocus
            />
            <button className="icon-btn" onClick={handleCreateFolder}><Check size={14} /></button>
            <button className="icon-btn" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}><X size={14} /></button>
          </div>
        )}

        {conversations.length > 1 && (
          <div className="sidebar-search">
            <Search size={13} />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        <div className="sidebar-list">
          {pinned.length > 0 && (
            <div className="sidebar-group">
              <div className="sidebar-group-label">Pinned</div>
              {pinned.map(renderItem)}
            </div>
          )}
          {folders.map(folder => {
            const folderConvs = filtered.filter(c => c.folderId === folder.id);
            if (search && folderConvs.length === 0) return null;
            const isExpanded = expandedFolders.has(folder.id);
            return (
              <div key={folder.id} className="sidebar-group">
                <div className="sidebar-group-label folder-label" onClick={() => toggleFolder(folder.id)}>
                  {isExpanded ? <FolderOpen size={12} /> : <Folder size={12} />}
                  <span>{folder.name}</span>
                  <span className="folder-count">{folderConvs.length}</span>
                  <button className="folder-delete" onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); }}>
                    <Trash2 size={10} />
                  </button>
                </div>
                {isExpanded && folderConvs.map(renderItem)}
              </div>
            );
          })}
          {today.length > 0 && (
            <div className="sidebar-group">
              <div className="sidebar-group-label">Today</div>
              {today.map(renderItem)}
            </div>
          )}
          {older.length > 0 && (
            <div className="sidebar-group">
              <div className="sidebar-group-label">Previous</div>
              {older.map(renderItem)}
            </div>
          )}
          {conversations.length === 0 && (
            <div className="sidebar-empty">
              <MessageSquare size={24} strokeWidth={1.5} />
              <span>No conversations yet</span>
            </div>
          )}
          {search && filtered.length === 0 && (
            <div className="sidebar-empty">No results</div>
          )}
        </div>

        <div className="sidebar-footer">
          {conversations.length > 0 && (
            confirmClear ? (
              <div className="confirm-clear">
                <span className="confirm-clear-text">Delete all chats?</span>
                <button className="confirm-yes" onClick={() => { onClearAll(); setConfirmClear(false); }}>Yes</button>
                <button className="confirm-no" onClick={() => setConfirmClear(false)}>No</button>
              </div>
            ) : (
              <button className="clear-all-btn" onClick={() => setConfirmClear(true)}>
                <Trash size={14} />
                <span>Clear all chats</span>
              </button>
            )
          )}
          <button className="theme-toggle" onClick={toggle}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function ConversationItem({ conv, active, onSelect, onDelete, onExport, onRename, onTogglePin, searchSnippet, folders, onMoveToFolder, showFolderMenu, setShowFolderMenu }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);

  const startRename = (e) => {
    e.stopPropagation();
    setEditTitle(conv.title);
    setEditing(true);
  };

  const saveRename = () => {
    if (editTitle.trim() && editTitle !== conv.title) {
      onRename(editTitle.trim());
    }
    setEditing(false);
  };

  const msgCount = conv.messages.length;
  const menuId = conv.id;

  return (
    <div className={`sidebar-item ${active ? 'active' : ''} ${conv.pinned ? 'pinned' : ''}`} onClick={onSelect}>
      {conv.pinned && <Pin size={10} className="pin-indicator" />}
      <MessageSquare size={14} />
      <div className="sidebar-item-info">
        {editing ? (
          <input
            className="sidebar-item-edit"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={saveRename}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="sidebar-item-title">{conv.title}</span>
        )}
        {msgCount > 0 && !editing && (
          <span className="sidebar-item-meta">
            {msgCount} msg{msgCount !== 1 ? 's' : ''} · {conv.model ? conv.model.split('/').pop() : ''}
          </span>
        )}
        {searchSnippet && (
          <span className="sidebar-item-snippet">{searchSnippet}</span>
        )}
      </div>
      <div className="sidebar-item-actions">
        {onMoveToFolder && folders?.length > 0 && (
          <div className="folder-move-wrapper">
            <button className="sidebar-item-action" onClick={e => { e.stopPropagation(); setShowFolderMenu(showFolderMenu === menuId ? null : menuId); }} title="Move to folder">
              <FolderPlus size={12} />
            </button>
            {showFolderMenu === menuId && (
              <div className="folder-move-menu" onClick={e => e.stopPropagation()}>
                <button onClick={() => { onMoveToFolder(conv.id, null); setShowFolderMenu(null); }}>Remove from folder</button>
                {folders.map(f => (
                  <button key={f.id} onClick={() => { onMoveToFolder(conv.id, f.id); setShowFolderMenu(null); }}>
                    <Folder size={10} /> {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className="sidebar-item-action" onClick={e => { e.stopPropagation(); onTogglePin(); }} title={conv.pinned ? 'Unpin' : 'Pin'}>
          {conv.pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
        <button className="sidebar-item-action" onClick={startRename} title="Rename">
          <Pencil size={12} />
        </button>
        {msgCount > 0 && (
          <button className="sidebar-item-action" onClick={e => { e.stopPropagation(); onExport(); }} title="Export">
            <Download size={12} />
          </button>
        )}
        <button className="sidebar-item-delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
