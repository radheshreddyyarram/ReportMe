'use client';
import { useAppStore, ChatMessage } from '@/store/useAppStore';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Search, Loader2, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const addMessage = useAppStore(state => state.addMessage);
  const conversations = useAppStore(state => state.conversations);
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const autoNameConversation = useAppStore(state => state.autoNameConversation);
  const setHasQueriedCurrentCodeActive = useAppStore(state => state.setHasQueriedCurrentCodeActive);
  const setIsChatbotOpen = useAppStore(state => state.setIsChatbotOpen);
  
  const activeChat = conversations.find(c => c.id === activeConversationId);
  const messages = activeChat?.messages || [];

  const filteredMessages = messages.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !activeConversationId || !activeChat) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    addMessage(activeConversationId, userMessage);

    // Auto-name the chat from the first user message if it's still default
    if (activeChat.messages.filter(m => m.role === 'user').length === 0) {
      autoNameConversation(activeConversationId, userMessage.content);
    }
    
    setInput('');
    setIsTyping(true);

    try {
      const isFirstQuery = !activeChat.hasQueriedCurrentCode;
      const latestCode = activeChat.codeBlocks.length > 0 
        ? activeChat.codeBlocks[activeChat.codeBlocks.length - 1].code 
        : null;

      let payload: any = {
        message: userMessage.content,
        system_instruction: "Format your response clearly with headings, bullet points, and structured analysis using Markdown. Do not use raw walls of text. Be meticulous and use proper code blocks for snippets.",
        conversation_history: messages,
        usercode: latestCode
      };

      // Webhook 2 Logic: Send the latest webhook1_response EVERY time
      const latestWebhook1 = activeChat.codeBlocks.length > 0
        ? activeChat.codeBlocks[activeChat.codeBlocks.length - 1].webhook1Response
        : null;
        
      payload.webhook1_response = latestWebhook1;
      
      const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_CHAT_URL;
      let aiResponseText = "I received your query: " + userMessage.content;
      
      if (webhookUrl) {
         try {
             const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
             });
             
             const rawText = await res.text();
             
             try {
                 const data = JSON.parse(rawText);
                 const targetObj = Array.isArray(data) ? data[0] : data;
                 
                 if (targetObj) {
                     const extracted = targetObj.output || targetObj.message || targetObj.response || targetObj.text || targetObj.answer || targetObj.reply || targetObj.error;
                     if (extracted && typeof extracted === 'string') {
                         aiResponseText = extracted;
                     } else if (typeof targetObj === 'string') {
                         aiResponseText = targetObj;
                     } else {
                         // Fallback so the user at least sees the raw JSON instead of the placeholder
                         aiResponseText = JSON.stringify(targetObj);
                     }
                 }
             } catch (parseError) {
                 // If parsing fails, it's likely plain text
                 if (rawText && rawText.trim()) {
                     aiResponseText = rawText;
                 } else if (!res.ok) {
                     throw new Error(`HTTP ${res.status}`);
                 }
             }
         } catch (e) {
            console.error("Webhook 2 error:", e);
            aiResponseText = "There was an error connecting to Webhook 2.";
         }
      } else {
         await new Promise(r => setTimeout(r, 1500));
         if (isFirstQuery) {
            aiResponseText = `[Mega Payload Sent]\nWebhook 1 context + New code + "${userMessage.content}"`;
         } else {
            aiResponseText = `[Standard Payload Sent]\n"${userMessage.content}"`;
         }
      }

      // Mark that we have queried this code at least once
      if (isFirstQuery) {
         setHasQueriedCurrentCodeActive(true);
      }

      addMessage(activeConversationId, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponseText,
        timestamp: new Date().toISOString()
      });

    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-xl border border-white/5 p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      {/* Search Header */}
      <div className="flex items-center gap-2 mb-6 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search in conversation..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium backdrop-blur-sm"
          />
        </div>
        <button 
          onClick={() => setIsChatbotOpen(false)}
          className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Close SyntX Chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-6 mb-4 pr-2"
      >
        <AnimatePresence>
          {filteredMessages.map((msg, index) => (
            <motion.div 
              key={msg.id || index}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] gap-3 items-end ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${msg.role === 'user' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/20 text-secondary border border-secondary/30'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-4 rounded-2xl shadow-xl backdrop-blur-sm ${msg.role === 'user' ? 'bg-primary/10 border border-primary/20 text-white rounded-br-none' : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none overflow-x-auto custom-scrollbar'}`}>
                  {msg.role === 'user' ? (
                     <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                     <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-a:text-blue-400">
                        <ReactMarkdown 
                           remarkPlugins={[remarkGfm]}
                           components={{
                           code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                 <div className="relative group mt-3 mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/80 shadow-2xl">
                                    <div className="flex justify-between items-center px-4 py-2 bg-white/10 border-b border-white/5">
                                       <span className="text-xs text-gray-300 font-mono uppercase tracking-wider">{match[1]}</span>
                                       <button 
                                          onClick={(e) => {
                                             navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                             const target = e.currentTarget;
                                             target.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-secondary"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                             setTimeout(() => { target.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'; }, 2000);
                                          }}
                                          className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                          title="Copy Snippet"
                                       >
                                          <Copy size={14} />
                                       </button>
                                    </div>
                                    <SyntaxHighlighter
                                       style={vscDarkPlus}
                                       language={match[1]}
                                       PreTag="div"
                                       className="!my-0 !bg-transparent text-[13px] !p-4 custom-scrollbar"
                                       {...props}
                                    >
                                       {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                 </div>
                              ) : (
                                 <code className="bg-black/30 text-pink-400 px-1.5 py-0.5 rounded text-[13px] font-mono break-words" {...props}>
                                    {children}
                                 </code>
                              )
                           }
                        }}
                     >
                        {msg.content}
                     </ReactMarkdown>
                     </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-start mt-4"
          >
             <div className="flex max-w-[85%] gap-3 items-end flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary/20 text-secondary border border-secondary/30">
                <Bot size={14} />
              </div>
              <div className="p-3 px-5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 rounded-bl-none flex items-center gap-3">
                 <Loader2 size={16} className="animate-spin text-secondary" />
                 <span className="text-xs font-semibold tracking-wide text-gray-400">SyntX is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative mt-auto pt-2">
        <textarea 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask SyntX anything about your code..."
          className="w-full bg-black/40 border border-white/20 rounded-2xl py-4 pl-5 pr-14 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none min-h-[56px] max-h-[150px] shadow-inner transition-all"
          rows={1}
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="absolute right-3 bottom-3 p-3 rounded-xl bg-primary text-black hover:bg-primary/90 disabled:opacity-30 transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] hover:-translate-y-1 disabled:hover:translate-y-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
