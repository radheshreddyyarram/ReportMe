'use client';
import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Tesseract from 'tesseract.js';
import { Upload, Image as ImageIcon, Send, Loader2, Zap, Brain } from 'lucide-react';

export default function CodeInput() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);
  
  // New Store Actions
  const activeConversationId = useAppStore(state => state.activeConversationId);
  const createNewConversation = useAppStore(state => state.createNewConversation);
  const addCodeBlockToActive = useAppStore(state => state.addCodeBlockToActive);
  const addMessage = useAppStore(state => state.addMessage);
  const updateCodeBlockWebhook1Response = useAppStore(state => state.updateCodeBlockWebhook1Response);
  const autoNameConversation = useAppStore(state => state.autoNameConversation);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    try {
      // 1. Ensure we have an active conversation
      let currentConvId = activeConversationId;
      if (!currentConvId) {
        currentConvId = createNewConversation();
      }
      
      // 2. Add the code block to the left panel via state
      const newBlockId = addCodeBlockToActive(inputText);
      
      // 3. Optional: Rename the session right away based on the code provided
      autoNameConversation(currentConvId, inputText.substring(0, 50));
      
      // 4. Send to Webhook 1
      const payload = {
        code: inputText,
        mode,
        learning_mode: mode
      };
      
      const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_CODE_URL;
      let aiResponseText = "Code analysis complete. I see you've submitted a new version. How can I assist you with this code?";
      
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
                       aiResponseText = JSON.stringify(targetObj);
                   }
               }
           } catch (parseError) {
               if (rawText && rawText.trim()) {
                   aiResponseText = rawText;
               } else if (!res.ok) {
                   throw new Error(`HTTP ${res.status}`);
               }
           }
         } catch(e) {
             console.error("Webhook 1 error:", e);
             aiResponseText = "Error communicating with Webhook 1. Please try again.";
         }
      } else {
         await new Promise(r => setTimeout(r, 1500));
      }
      
      // 5. Store Webhook 1 Response in the Code Block (not in chat)
      updateCodeBlockWebhook1Response(newBlockId, aiResponseText);
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setInputText('');
    }
  };

  const handleFileObject = async (file: File) => {
    setIsProcessing(true);
    if (file.type.startsWith('image/')) {
       try {
         const result = await Tesseract.recognize(file, 'eng');
         setInputText(result.data.text);
       } catch (err) {
         console.error('OCR Error', err);
       }
    } else {
       const text = await file.text();
       setInputText(text);
    }
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileObject(file);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
           <img src="/logo.jpg" alt="ReportMe Shield Logo" className="w-8 h-8 object-contain rounded-md drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]" />
           <h2 className="text-2xl font-bold text-white neon-text-primary">New Debug Session</h2>
        </div>
        <div className="flex bg-black/40 rounded-full p-1.5 border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
           <button 
             onClick={() => setMode('simple')} 
             className={`relative flex items-center gap-2 z-10 px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-500 ease-out ${mode === 'simple' ? 'text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.02]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
           >
             {mode === 'simple' && <span className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,1)]" />}
             <Zap size={15} className={mode === 'simple' ? 'fill-yellow-500 text-yellow-600' : ''} /> Simple
           </button>
           <button 
             onClick={() => setMode('learning')} 
             className={`relative flex items-center gap-2 z-10 px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-500 ease-out ${mode === 'learning' ? 'text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.02]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
           >
             {mode === 'learning' && <span className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white rounded-full -z-10 shadow-[inset_0_1px_rgba(255,255,255,1)]" />}
             <Brain size={15} className={mode === 'learning' ? 'fill-pink-400 text-pink-500' : ''} /> Learning
           </button>
        </div>
      </div>

      <div 
        className={`relative w-full rounded-2xl glass-panel p-2 transition-all duration-300 flex flex-col hide-scrollbar ${isFocused ? 'scale-[1.02] ring-1 ring-white/50 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : ''} ${isDragging ? 'ring-2 ring-white/80 bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-[1.02]' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileObject(file);
        }}
      >
        <textarea
           value={inputText}
           onChange={(e) => setInputText(e.target.value)}
           onFocus={() => setIsFocused(true)}
           onBlur={() => setIsFocused(false)}
           placeholder="Paste your code here, or drop a file/image directly..."
           className="w-full h-64 bg-transparent resize-none text-white placeholder-white/30 p-4 focus:outline-none font-mono text-sm leading-relaxed"
           disabled={isProcessing}
        />
        
        {isProcessing && (
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10 space-y-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <span className="text-white font-medium tracking-wide">Processing code...</span>
           </div>
        )}

        <div className="flex justify-between items-center p-2 border-t border-white/10 mt-auto">
           <div className="flex gap-2">
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileUpload}
               className="hidden" 
               accept="image/*,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.html,.css,.json" 
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
               disabled={isProcessing}
               title="Upload File"
             >
               <Upload size={18} /> File
             </button>
             <button 
               onClick={() => {
                 if(fileInputRef.current) {
                     fileInputRef.current.accept = "image/*";
                     fileInputRef.current.click();
                     setTimeout(() => { if(fileInputRef.current) fileInputRef.current.accept = "image/*,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.html,.css,.json"; }, 1000);
                 }
               }}
               className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
               disabled={isProcessing}
               title="Upload Image (OCR)"
             >
               <ImageIcon size={18} /> Image
             </button>
           </div>
           <button 
             onClick={handleSubmit}
             disabled={isProcessing || !inputText.trim()}
             className="relative overflow-hidden group bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] text-black px-8 py-2.5 rounded-xl font-extrabold tracking-wide flex items-center gap-2 transition-all duration-500 shadow-[0_5px_15px_rgba(255,255,255,0.2),_inset_0_2px_0_rgba(255,255,255,1)] hover:shadow-[0_10px_30px_rgba(255,255,255,0.4),_inset_0_2px_0_rgba(255,255,255,1)] hover:-translate-y-1 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 disabled:hover:scale-100"
           >
             <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
             Analyze <Send size={16} className="group-hover:translate-x-1.5 group-hover:-translate-y-1.5 transition-transform duration-300 relative z-10" />
           </button>
        </div>
      </div>
    </div>
  );
}
