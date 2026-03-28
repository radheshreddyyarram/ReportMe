'use client';
import { useAppStore } from '@/store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useEffect, useRef, useState } from 'react';
import { BotMessageSquare, Sparkles } from 'lucide-react';
import CodeInput from './CodeInput';
import PersistentCodePanel from './PersistentCodePanel';
import ChatInterface from './ChatInterface';

export default function LeftPanel() {
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const conversations = useAppStore(state => state.conversations);
  const activeChat = conversations.find(c => c.id === activeConversationId);
  const codeBlocks = activeChat?.codeBlocks || [];
  const isAwaitingNewCode = useAppStore(state => state.isAwaitingNewCode);
  const isChatbotOpen = useAppStore(state => state.isChatbotOpen);
  const setIsChatbotOpen = useAppStore(state => state.setIsChatbotOpen);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const latestWebhook = codeBlocks.length > 0 ? codeBlocks[codeBlocks.length - 1].webhook1Response : null;
  const [showChatPopup, setShowChatPopup] = useState(false);

  useEffect(() => {
    if (latestWebhook && !isChatbotOpen) {
       setShowChatPopup(true);
       const timer = setTimeout(() => setShowChatPopup(false), 8000);
       return () => clearTimeout(timer);
    }
  }, [latestWebhook, isChatbotOpen]);

  // Auto-scroll to bottom when new code is added or when awaiting new code
  useEffect(() => {
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = leftScrollRef.current.scrollHeight;
    }
  }, [codeBlocks.length, isAwaitingNewCode]);

  const codeBlocksContent = (
    <div 
      ref={leftScrollRef}
      className={`h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar snap-y snap-mandatory scroll-smooth pb-8 ${isChatbotOpen ? 'pr-2' : 'w-full px-2'}`}
    >
      {codeBlocks.map((block, index) => (
        <div key={block.id} className="h-full min-h-full snap-start flex-shrink-0 w-full mb-4">
           <PersistentCodePanel blockId={block.id} initialCode={block.code} index={index} webhook1Response={block.webhook1Response || null} />
        </div>
      ))}
      
      {isAwaitingNewCode && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="w-full pb-8 pt-4 snap-start shrink-0"
        >
          <CodeInput />
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <AnimatePresence mode="wait">
        {codeBlocks.length === 0 && !isAwaitingNewCode ? (
          <motion.div
            key="code-input-initial"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
            className="w-full max-w-2xl"
          >
            <CodeInput />
          </motion.div>
        ) : (
          <motion.div
            key="chat-interface-split"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.7 }}
            className="w-full h-full relative"
          >
            {isChatbotOpen ? (
               <Group
                 orientation="horizontal"
                 style={{ width: '100%', height: '100%' }}
               >
                 <Panel defaultSize={65} minSize={30}>
                   {codeBlocksContent}
                 </Panel>

                 <Separator
                   style={{
                     width: '6px',
                     cursor: 'col-resize',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     background: 'transparent',
                     flexShrink: 0,
                   }}
                   className="group"
                 >
                   <div
                     style={{
                       width: '2px',
                       height: '48px',
                       borderRadius: '9999px',
                       background: 'rgba(255,255,255,0.12)',
                       transition: 'background 0.2s',
                     }}
                     className="group-hover:!bg-cyan-400/60"
                   />
                 </Separator>

                 <Panel defaultSize={35} minSize={20}>
                   <div className="h-full pl-4 overflow-hidden">
                     <ChatInterface />
                   </div>
                 </Panel>
               </Group>
            ) : (
               codeBlocksContent
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {codeBlocks.length > 0 && !isChatbotOpen && (
        <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
          <AnimatePresence>
             {showChatPopup && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="bg-black/80 border border-primary/40 text-white text-sm px-5 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(0,212,255,0.3)] backdrop-blur-xl relative pointer-events-auto cursor-pointer"
                  onClick={() => setIsChatbotOpen(true)}
                >
                  <p className="font-bold tracking-wide flex items-center gap-2"><Sparkles size={16} className="text-primary"/> SyntX Analysis Ready!</p>
                  <p className="text-xs text-gray-300 mt-1">I've reviewed your code. Want to chat about it?</p>
                  <div className="absolute -bottom-2 right-6 w-4 h-4 bg-black/80 border-b border-r border-primary/40 rotate-45 transform"></div>
                </motion.div>
             )}
          </AnimatePresence>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatbotOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] flex items-center justify-center text-white z-50 hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] transition-all border border-white/20 pointer-events-auto"
            title="Open SyntX Chatbot"
          >
            <BotMessageSquare size={24} />
          </motion.button>
        </div>
      )}
    </div>
  );
}
