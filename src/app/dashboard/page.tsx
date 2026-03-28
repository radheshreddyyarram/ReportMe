'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import LeftPanel from '@/components/dashboard/LeftPanel';
import RightPanel from '@/components/dashboard/RightPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Sun, Moon, MessageSquarePlus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const createNewConversation = useAppStore(state => state.createNewConversation);
  
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const conversations = useAppStore(state => state.conversations);
  const isAwaitingNewCode = useAppStore(state => state.isAwaitingNewCode);
  const activeChat = conversations.find(c => c.id === activeConversationId);
  const hasCodeBlocks = (activeChat?.codeBlocks || []).length > 0;
  // It is analyzing/interacting if there are code blocks or if we manually triggered awaiting new code
  const isAnalyzing = hasCodeBlocks || isAwaitingNewCode;

  useEffect(() => {
     if (theme === 'light') {
        document.body.classList.add('light-theme');
     } else {
        document.body.classList.remove('light-theme');
     }
  }, [theme]);

  // Protected route logic
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) return null; // Or a loading spinner

  return (
    <div className="h-screen w-full flex overflow-hidden text-[var(--foreground)] relative transition-colors duration-500">
      {/* Branding */}
      <AnimatePresence>
         {!isAnalyzing && (
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
               className="absolute top-8 left-8 z-50 pointer-events-none select-none flex items-center gap-3 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            >
              <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.jpg`} alt="ReportMe Bug Shield Logo" className="w-10 h-10 object-contain rounded-lg drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]" />
              <h1 className="text-4xl brand-text" data-text="ReportMe">
                 ReportMe
              </h1>
            </motion.div>
         )}
      </AnimatePresence>
      
      {/* Dynamic Left Side */}
      <motion.div 
         initial={false}
         animate={{ width: isSidebarOpen ? '66.666%' : '100%' }}
         transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
         className="h-full p-4 relative z-10 flex flex-col"
      >
        <div className="glass-panel w-full h-full p-6 flex flex-col relative overflow-hidden !transition-colors !duration-500">
           <LeftPanel />
        </div>
      </motion.div>

      {/* Dynamic Right Side */}
      <AnimatePresence>
         {isSidebarOpen && (
           <motion.div 
             initial={{ width: 0, opacity: 0 }}
             animate={{ width: '33.333%', opacity: 1 }}
             exit={{ width: 0, opacity: 0 }}
             transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
             className="h-full py-4 pr-4 relative z-10 flex flex-col"
           >
             <div className="glass-panel w-full h-full p-6 flex flex-col relative overflow-hidden min-w-[320px] !transition-colors !duration-500">
               <RightPanel onClose={() => setIsSidebarOpen(false)} />
             </div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* Floating Profile Button (visible when sidebar is closed) */}
      <AnimatePresence>
         {!isSidebarOpen && (
            <motion.div
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               transition={{ ease: "easeOut", duration: 0.3 }}
               className="absolute top-8 right-8 z-50 flex items-center gap-4"
            >
               <button 
                  onClick={() => createNewConversation()}
                  className="w-10 h-10 rounded-full btn-innovative glass-panel flex items-center justify-center cursor-pointer text-[var(--foreground)] disabled:opacity-50"
                  title="New Session"
               >
                  <MessageSquarePlus size={18} />
               </button>
               <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-10 h-10 rounded-full btn-innovative glass-panel flex items-center justify-center cursor-pointer text-[var(--foreground)] disabled:opacity-50"
                  title="Toggle Theme"
               >
                  <AnimatePresence mode="wait">
                    <motion.div
                       key={theme}
                       initial={{ opacity: 0, rotate: -90 }}
                       animate={{ opacity: 1, rotate: 0 }}
                       exit={{ opacity: 0, rotate: 90 }}
                       transition={{ duration: 0.2 }}
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </motion.div>
                  </AnimatePresence>
               </button>
               <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="w-10 h-10 rounded-full btn-innovative glass-panel flex items-center justify-center cursor-pointer"
                  title="Open Sidebar"
               >
                  {user.picture ? (
                     <img src={user.picture} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                     <UserIcon size={16} className="text-[var(--foreground)] drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                  )}
               </button>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
