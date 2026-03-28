'use client';
import { useAppStore } from '@/store/useAppStore';
import { LogOut, User as UserIcon, MessageSquarePlus, MessageSquare, Edit2, Share2, Trash2, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RightPanel({ onClose }: { onClose?: () => void }) {
  const user = useAppStore(state => state.user);
  const setUser = useAppStore(state => state.setUser);
  const router = useRouter();
  
  const conversations = useAppStore(state => state.conversations);
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const setActiveConversationId = useAppStore(state => state.setActiveConversationId);
  const createNewConversation = useAppStore(state => state.createNewConversation);

  const removeConversation = useAppStore(state => state.removeConversation);
  const renameConversation = useAppStore(state => state.renameConversation);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      setUser(null);
      router.push('/');
    }
  };

  const handleNewChat = () => {
    createNewConversation();
  };

  const handleRenameStart = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleRenameSave = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeConversation(id);
  };

  const handleShare = async (e: React.MouseEvent, conv: any) => {
    e.stopPropagation();
    try {
       const chatText = (conv.messages || []).map((m: any) => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n');
       
       let codeText = '';
       if (conv.codeBlocks && conv.codeBlocks.length > 0) {
          codeText = "CODE SNIPPETS:\n" + conv.codeBlocks.map((b: any, i: number) => `Phase ${i+1}:\n${b.code}\n`).join('\n');
       }
       
       const content = `Chat: ${conv.title}\n\n${codeText}\n\n${chatText}`;
       await navigator.clipboard.writeText(content.trim() ? content : 'Empty Session');
       
       setCopiedId(conv.id);
       setTimeout(() => setCopiedId(null), 2000);
    } catch(err) {
       console.error("Failed to share", err);
    }
  };

  return (
    <div className="h-full w-full flex flex-col gap-5">
      {/* SECTION 1: USER PROFILE */}
      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] transition-colors hover:bg-white/10">
        <div className="flex items-center gap-4">
          {user?.picture ? (
            <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <UserIcon size={16} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-wide">{user?.name || 'Developer'}</span>
            <span className="text-xs text-gray-400 mt-0.5">{user?.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Close Sidebar"
            >
              <X size={18} />
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* SECTION 2: CONVERSATIONS */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-primary/20 rounded-lg">
                <MessageSquare size={16} className="text-primary" />
             </div>
             <h3 className="font-bold text-white tracking-wide text-sm">CONVERSATIONS</h3>
          </div>
          <button 
            onClick={handleNewChat}
            className="p-1.5 bg-primary/20 text-primary hover:bg-primary text-black rounded-lg transition-all shadow-[0_0_10px_rgba(0,212,255,0.3)] hover:shadow-[0_0_15px_rgba(0,212,255,0.8)]"
            title="Start New Debug Session"
          >
             <MessageSquarePlus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1">
          {conversations.length === 0 ? (
             <div className="h-full flex items-center justify-center text-sm text-gray-500 italic">No chat history</div>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id} 
                className={`group w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${activeConversationId === conv.id ? 'bg-primary/10 border-primary/30 border shadow-[0_0_15px_rgba(0,212,255,0.15)]' : 'bg-transparent border border-transparent hover:bg-white/5'}`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                 <div className="flex items-center gap-4 overflow-hidden flex-1">
                   <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeConversationId === conv.id ? 'bg-primary shadow-[0_0_8px_theme(colors.primary)]' : 'bg-gray-600'}`}></div>
                   <div className="flex flex-col flex-1 overflow-hidden">
                      {editingId === conv.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input 
                            type="text" 
                            value={editTitle} 
                            onChange={e => setEditTitle(e.target.value)} 
                            className="bg-black/50 border border-primary/50 text-white text-sm rounded px-1 w-full focus:outline-none"
                            autoFocus
                            onKeyDown={e => {
                              if(e.key === 'Enter') handleRenameSave(e as any, conv.id);
                              if(e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button onClick={(e) => handleRenameSave(e, conv.id)} className="text-white hover:text-gray-300 p-1"><Check size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white p-1"><X size={14}/></button>
                        </div>
                      ) : (
                        <span className={`text-sm font-semibold truncate ${activeConversationId === conv.id ? 'text-white' : 'text-gray-400'}`}>{conv.title}</span>
                      )}
                      
                      {editingId !== conv.id && (
                         <span className="text-[10px] text-gray-500 mt-0.5">{new Date(conv.timestamp).toLocaleDateString()}</span>
                      )}
                   </div>
                 </div>

                 {editingId !== conv.id && (
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleRenameStart(e, conv.id, conv.title)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                         onClick={(e) => handleShare(e, conv)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title={copiedId === conv.id ? "Copied!" : "Share (Copy)"}
                      >
                        {copiedId === conv.id ? <Check size={12} className="text-green-500" /> : <Share2 size={12} />}
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, conv.id)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                   </div>
                 )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
