import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Mode = 'simple' | 'learning';

export interface User {
  email: string;
  name?: string;
  picture?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface ErrorLog {
  id: string;
  title: string;
  filename: string;
  timestamp: string;
  description: string;
}

export interface CodeBlock {
  id: string;
  code: string;
  webhook1Response: string | null;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: string;
  codeBlocks: CodeBlock[];
  hasQueriedCurrentCode: boolean;
  lastWebhook1Response: string | null;
}

export interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Workspace
  mode: Mode;
  setMode: (mode: Mode) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  isAwaitingNewCode: boolean;
  setIsAwaitingNewCode: (val: boolean) => void;
  isChatbotOpen: boolean;
  setIsChatbotOpen: (val: boolean) => void;

  // Chat & Sessions
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createNewConversation: () => string; // Returns new ID
  addMessage: (conversationId: string, message: ChatMessage) => void;
  removeConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  autoNameConversation: (id: string, firstMessage: string) => void;
  
  // Workspace specific modifiers for active conversation
  addCodeBlockToActive: (code: string) => string;
  updateCodeBlockInActive: (blockId: string, code: string) => void;
  updateCodeBlockWebhook1Response: (blockId: string, response: string) => void;
  setHasQueriedCurrentCodeActive: (val: boolean) => void;
  setLastWebhook1ResponseActive: (val: string | null) => void;

  // Error History
  errorHistory: ErrorLog[];
  addErrorLog: (error: ErrorLog) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      mode: 'simple',
      setMode: (mode) => set({ mode }),
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      
      isAwaitingNewCode: false,
      setIsAwaitingNewCode: (val) => set({ isAwaitingNewCode: val }),
      isChatbotOpen: false,
      setIsChatbotOpen: (val) => set({ isChatbotOpen: val }),

      conversations: [],
      activeConversationId: null,
      setActiveConversationId: (id) => set({ activeConversationId: id, isAwaitingNewCode: false }),
      createNewConversation: () => {
        const id = Date.now().toString();
        const newConv: Conversation = {
          id,
          title: 'New Debug Session',
          messages: [],
          timestamp: new Date().toISOString(),
          codeBlocks: [],
          hasQueriedCurrentCode: false,
          lastWebhook1Response: null
        };
        set((state) => ({
          conversations: [newConv, ...state.conversations],
          activeConversationId: id,
          isAwaitingNewCode: false
        }));
        return id;
      },
      addMessage: (conversationId, message) => set((state) => ({
        conversations: state.conversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages: [...(conv.messages || []), message] }
            : conv
        )
      })),
      removeConversation: (id) => set((state) => ({
        conversations: state.conversations.filter(c => c.id !== id),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
      })),
      renameConversation: (id, title) => set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === id ? { ...c, title } : c
        )
      })),
      autoNameConversation: (id, firstMessage) => set((state) => ({
        conversations: state.conversations.map(c => {
          if (c.id !== id || c.title !== 'New Debug Session') return c;
          
          let title = `🔍 Quick Session`;
          
          const funcMatch = firstMessage.match(/(?:function|def)\s+([a-zA-Z_]\w*)/);
          const classMatch = firstMessage.match(/(?:class|struct|interface)\s+([a-zA-Z_]\w*)/);
          const errMatch = firstMessage.match(/([a-zA-Z]+Error):/);
          
          if (errMatch) {
             title = `🐛 Fix: ${errMatch[1]}`;
          } else if (funcMatch) {
             title = `⚡ Func: ${funcMatch[1]}()`;
          } else if (classMatch) {
             title = `🏗️ ${classMatch[1]}`;
          } else {
             const cleanWords = firstMessage.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(w => w.length > 2);
             if (cleanWords.length >= 2) title = `✨ ${cleanWords[0]} ${cleanWords[1]}`;
             else if (cleanWords.length === 1) title = `✨ ${cleanWords[0]} Code`;
          }
          
          return { ...c, title };
        })
      })),

      addCodeBlockToActive: (code) => {
        const id = Date.now().toString();
        const newBlock: CodeBlock = {
          id,
          code,
          webhook1Response: null,
          timestamp: new Date().toISOString()
        };
        set((state) => {
          if (!state.activeConversationId) return state;
          return {
            conversations: state.conversations.map(conv => 
              conv.id === state.activeConversationId
                ? { ...conv, codeBlocks: [...(conv.codeBlocks || []), newBlock], hasQueriedCurrentCode: false }
                : conv
            ),
            isAwaitingNewCode: false // Reset debugging view
          };
        });
        return id;
      },
      updateCodeBlockInActive: (blockId, code) => set((state) => {
        if (!state.activeConversationId) return state;
        return {
          conversations: state.conversations.map(conv => 
            conv.id === state.activeConversationId
              ? {
                  ...conv,
                  codeBlocks: (conv.codeBlocks || []).map(b => b.id === blockId ? { ...b, code } : b)
                }
              : conv
          )
        }
      }),
      updateCodeBlockWebhook1Response: (blockId, response) => set((state) => {
        if (!state.activeConversationId) return state;
        return {
          conversations: state.conversations.map(conv => 
            conv.id === state.activeConversationId
              ? {
                  ...conv,
                  codeBlocks: (conv.codeBlocks || []).map(b => b.id === blockId ? { ...b, webhook1Response: response } : b)
                }
              : conv
          )
        }
      }),
      setHasQueriedCurrentCodeActive: (val) => set((state) => {
        if (!state.activeConversationId) return state;
        return {
          conversations: state.conversations.map(conv => 
            conv.id === state.activeConversationId
              ? { ...conv, hasQueriedCurrentCode: val }
              : conv
          )
        };
      }),
      setLastWebhook1ResponseActive: (val) => set((state) => {
        if (!state.activeConversationId) return state;
        return {
          conversations: state.conversations.map(conv => 
            conv.id === state.activeConversationId
              ? { ...conv, lastWebhook1Response: val }
              : conv
          )
        };
      }),

      errorHistory: [],
      addErrorLog: (error) => set((state) => ({
        errorHistory: [error, ...state.errorHistory]
      })),
    }),
    {
      name: 'reportme-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
           // Base schema migration for old sessions missing codeBlocks
           persistedState.conversations = (persistedState.conversations || []).map((c: any) => ({
             ...c,
             codeBlocks: (c.codeBlocks || []).map((b: any) => ({ ...b, webhook1Response: b.webhook1Response || null })),
             hasQueriedCurrentCode: c.hasQueriedCurrentCode || false,
             lastWebhook1Response: c.lastWebhook1Response || null
           }));
        }
        return persistedState as AppState;
      }
    }
  )
);
