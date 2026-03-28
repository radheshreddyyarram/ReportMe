'use client';
import { useAppStore } from '@/store/useAppStore';
import Editor from '@monaco-editor/react';
import { Copy, Check, Play, Loader2, FileCode2, TerminalIcon, PlusCircle, X, Bot } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LANGUAGES = [
  { id: 93, name: 'JavaScript', monaco: 'javascript' },
  { id: 71, name: 'Python', monaco: 'python' },
  { id: 54, name: 'C++', monaco: 'cpp' },
  { id: 50, name: 'C', monaco: 'c' },
  { id: 62, name: 'Java', monaco: 'java' }
];

function detectLanguageId(code: string): number {
  if (!code) return 93;
  if (code.includes('System.out.println') || code.includes('public class') || code.includes('import java.')) return 62; // Java
  if (code.includes('#include <iostream>') || code.includes('std::cout') || code.includes('using namespace std;')) return 54; // C++
  if (code.includes('#include <stdio.h>') || code.includes('printf(') || code.includes('scanf(')) return 50; // C
  if (code.includes('def ') || code.includes('import sys') || code.includes('print(') || /^[a-zA-Z_]\w*\s*=\s*.+/.test(code)) return 71; // Python
  if (code.includes('console.log') || code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('=>{') || code.includes('=> {')) return 93; // JS
  return 71; // Python Fallback
}

function extractVariables(code: string, langId: number): string[] {
  const vars: string[] = [];
  if (langId === 71) { 
    // Python match: x = input(), y = int(input())
    const pyRegex = /([a-zA-Z_]\w*)\s*=\s*(?:int|float|str)?\(?\s*input\([^)]*\)\)?/g;
    let m;
    while ((m = pyRegex.exec(code)) !== null) {
      if (!vars.includes(m[1])) vars.push(m[1]);
    }
  } else if (langId === 54) { 
    // C++ match: cin >> x >> y;
    const cppRegex = /cin\s*((?:>>\s*[a-zA-Z_]\w*\s*)+)/g;
    let m;
    while ((m = cppRegex.exec(code)) !== null) {
      const parts = m[1].split('>>').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => { if (!vars.includes(p)) vars.push(p); });
    }
  } else if (langId === 50) {
    // C match: scanf("%d %d", &x, &y);
    const cRegex = /scanf\s*\(\s*"[^"]+"\s*,([^)]+)\)/g;
    let m;
    while ((m = cRegex.exec(code)) !== null) {
       const parts = m[1].split(',').map(s => s.replace(/&/g, '').trim()).filter(Boolean);
       parts.forEach(p => { if (!vars.includes(p)) vars.push(p); });
    }
    // C match: gets(str) or fgets(str, ...)
    const getsRegex = /(?:f)?gets\s*\(\s*([a-zA-Z_]\w*)\s*(?:\)|,)/g;
    while ((m = getsRegex.exec(code)) !== null) {
       if (!vars.includes(m[1])) vars.push(m[1]);
    }
  } else if (langId === 62) { 
    // Java match: int age = scanner.nextInt(); or age = scanner.nextInt();
    const javaRegex = /(?:int|double|float|long|short|byte|String|boolean)\s+([a-zA-Z_]\w*)\s*=\s*\w+\.next(?:Int|Double|Float|Long|Short|Byte|Line|Boolean|)\s*\(/g;
    let m;
    while ((m = javaRegex.exec(code)) !== null) {
      if (!vars.includes(m[1])) vars.push(m[1]);
    }
    const javaRegex2 = /([a-zA-Z_]\w*)\s*=\s*\w+\.next(?:Int|Double|Float|Long|Short|Byte|Line|Boolean|)\s*\(/g;
    while ((m = javaRegex2.exec(code)) !== null) {
      if (!vars.includes(m[1]) && !['int','double','float','long','short','byte','String','boolean'].includes(m[1])) {
         vars.push(m[1]);
      }
    }
  }
  return vars;
}

interface PersistentCodePanelProps {
  blockId: string;
  initialCode: string;
  index: number;
  webhook1Response: string | null;
}

export default function PersistentCodePanel({ blockId, initialCode, index, webhook1Response }: PersistentCodePanelProps) {
  const isAwaitingNewCode = useAppStore(state => state.isAwaitingNewCode);
  const setIsAwaitingNewCode = useAppStore(state => state.setIsAwaitingNewCode);
  const updateCodeBlockInActive = useAppStore(state => state.updateCodeBlockInActive);
  const addErrorLog = useAppStore(state => state.addErrorLog);
  const theme = useAppStore(state => state.theme);

  const [localCode, setLocalCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => LANGUAGES.find(l => l.id === detectLanguageId(initialCode)) || LANGUAGES[0]);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [stdinText, setStdinText] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [varInputs, setVarInputs] = useState<Record<string, string>>({});

  const terminalRef = useRef<HTMLDivElement>(null);

  // Sync to store on change
  useEffect(() => {
    const timer = setTimeout(() => {
        updateCodeBlockInActive(blockId, localCode);
        const extracted = extractVariables(localCode, selectedLang.id);
        setDetectedVars(extracted);
    }, 500);
    return () => clearTimeout(timer);
  }, [localCode, blockId, updateCodeBlockInActive, selectedLang.id]);

  useEffect(() => {
     if(terminalRef.current) {
         terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
     }
  }, [terminalOutput]);

  const handleCopy = () => {
    navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = async () => {
    const payloadStdin = detectedVars.length > 0 
      ? detectedVars.map(v => varInputs[v] || '').join('\n')
      : stdinText;

    // Proactive check to intercept input requirements
    const expectsInput = detectedVars.length > 0 || localCode.includes('input(') || localCode.includes('cin >>') || localCode.includes('scanf(') || localCode.includes('Scanner');
    if (expectsInput && !payloadStdin.trim()) {
      setShowStdin(true);
      setTerminalOutput(prev => prev + `\n[Wait]: Your code appears to require input. Please enter your inputs in the pop-up above and hit Run again!\n`);
      return;
    }

    setIsCompiling(true);
    const formattedStdin = payloadStdin.trim() ? payloadStdin.replace(/\n/g, '\\n') : 'Empty';
    setTerminalOutput(prev => prev + `\n$ Running code in ${selectedLang.name}...\n$ Injecting STDIN: [${formattedStdin}]\n`);
    
    let submitCode = localCode;
    if (selectedLang.id === 62) {
      // Modify any Java class explicitly to be named 'public class Main'
      submitCode = submitCode.replace(/(?:public\s+)?class\s+[a-zA-Z_$][a-zA-Z\d_$]*/, 'public class Main');
    }

    try {
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
          'x-rapidapi-key': 'caadefb297msh511c4b09781df53p1c115ejsnf83e42deb728'
        },
        body: JSON.stringify({
          source_code: submitCode,
          language_id: selectedLang.id,
          stdin: payloadStdin || undefined
        })
      });
      
      const result = await response.json();
      
      if (result.stderr || result.compile_output) {
        const errorMsg = result.stderr || result.compile_output;
        setTerminalOutput(prev => prev + `\n[Error]:\n${errorMsg}\n`);
        
        addErrorLog({
          id: Date.now().toString(),
          title: 'Execution Error',
          filename: `main.${selectedLang.monaco}`,
          timestamp: new Date().toISOString(),
          description: errorMsg
        });
      } else if (result.stdout) {
        setTerminalOutput(prev => prev + `\n${result.stdout}\n`);
      } else if (result.message) {
         // Some api level failure
         setTerminalOutput(prev => prev + `\nAPI Error: ${result.message}\n`);
      } else {
         setTerminalOutput(prev => prev + `\nExecution completed with no output.\n`);
      }

    } catch (error: any) {
      setTerminalOutput(prev => prev + `\nNetwork/API Error: ${error.message}\n`);
    } finally {
      setIsCompiling(false);
    }
  };

  const compilerContent = (
    <div className={`h-full flex flex-col rounded-xl border transition-colors shadow-2xl overflow-hidden ${theme === 'light' ? 'bg-white/95 border-gray-200 shadow-gray-300/50' : 'bg-black/60 border-white/10 shadow-black/80'} backdrop-blur-2xl`}>
      <div className={`flex justify-between items-center px-4 py-2 border-b shrink-0 relative z-50 ${theme === 'light' ? 'bg-gray-100/50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-xs font-bold tracking-widest flex items-center gap-2 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
            <span className={`px-3 py-1 rounded shadow-inner uppercase font-bold ${theme === 'light' ? 'bg-gray-200 text-gray-800 border border-gray-300' : 'bg-primary/20 text-primary'}`}>Code Env {index + 1}</span>
          </span>
          <select 
            value={selectedLang.id}
            onChange={(e) => setSelectedLang(LANGUAGES.find(l => l.id === Number(e.target.value)) || LANGUAGES[0])}
            className={`text-xs rounded px-2 py-1 focus:outline-none border ${theme === 'light' ? 'bg-white border-gray-300 text-gray-800' : 'bg-black/60 border-white/20 text-white'}`}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            title="Copy Code"
            className={`p-1.5 rounded-lg transition-colors border shadow-sm ${theme === 'light' ? 'bg-white border-gray-200 hover:bg-gray-100 text-gray-600' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'}`}
          >
            {copied ? <Check size={16} className="text-secondary" /> : <Copy size={16} />} 
          </button>
          <button
            onClick={handleRunCode}
            disabled={isCompiling}
            title="Run Compilation"
            className={`p-1.5 rounded-lg transition-colors border shadow-sm ${theme === 'light' ? 'bg-white border-gray-200 hover:bg-gray-100 text-gray-600' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'} disabled:opacity-50`}
          >
            {isCompiling ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative min-h-0 w-full">
         {showStdin && (
            <div className="absolute top-4 right-4 p-4 glass-panel w-72 z-50 flex flex-col gap-3 shadow-2xl border-white/20 bg-black/60 backdrop-blur-xl">
               <div className="flex justify-between items-center mb-1">
                  <div className="text-xs font-bold text-white uppercase tracking-widest">Input Parameters</div>
                  <button onClick={() => setShowStdin(false)} className="text-gray-400 hover:text-white p-1 bg-white/10 rounded-lg"><X size={12}/></button>
               </div>
               
               {detectedVars.length > 0 ? (
                  <div className="flex flex-col gap-3 max-h-48 overflow-y-auto hide-scrollbar pr-1">
                     {detectedVars.map(v => (
                        <div key={v} className="flex flex-col gap-1 w-full">
                           <label className="text-[10px] text-white font-mono bg-white/10 w-fit px-1.5 py-0.5 rounded shadow-inner">{v} =</label>
                           <input 
                              type="text" 
                              value={varInputs[v] || ''}
                              onChange={(e) => setVarInputs({...varInputs, [v]: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/40 font-mono shadow-inner transition-colors"
                              placeholder={`Enter value for ${v}...`}
                           />
                        </div>
                     ))}
                  </div>
               ) : (
                  <>
                     <div className="text-[10px] text-gray-400 leading-tight">Enter values for variables sequentially (separated by newlines or spaces).</div>
                     <textarea
                        value={stdinText}
                        onChange={e => setStdinText(e.target.value)}
                        placeholder="e.g. 5\n10 15\nJohn Doe"
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/30 resize-none font-mono shadow-inner custom-scrollbar"
                     />
                  </>
               )}
               
               <button 
                  onClick={() => { setShowStdin(false); handleRunCode(); }} 
                  className="btn-innovative w-full py-2.5 mt-2 flex items-center justify-center gap-2"
               >
                 <Play size={14} /> Compile & Run
               </button>
            </div>
         )}
         
         <Group orientation="vertical">
            <Panel defaultSize={70} minSize={30}>
               <div className="h-full relative overflow-hidden">
                  <Editor
                             height="100%"
                             language={selectedLang.monaco}
                             theme={theme === 'light' ? 'light' : 'vs-dark'}
                             value={localCode}
                             onChange={(val) => setLocalCode(val || '')}
                             options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: 'on',
                                scrollBeyondLastLine: false,
                                padding: { top: 16 }
                             }}
                          />
                          {isCompiling && (
                             <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                             </div>
                          )}
                       </div>
                    </Panel>
                    
                    <Separator
                       className="group hover:bg-white/50"
                       style={{
                          height: '4px',
                          background: 'rgba(255,255,255,0.05)',
                          cursor: 'row-resize',
                          transition: 'background 0.2s',
                       }}
                    />

                    <Panel defaultSize={30} minSize={15}>
                       <div className="h-full bg-black/40 border-t border-white/5 flex flex-col pt-1 w-full relative z-10 transition-colors duration-500">
                          <div className="px-3 shrink-0 py-1 flex justify-between items-center text-xs font-semibold text-gray-400 z-10">
                             <span className="flex gap-2 items-center uppercase"><TerminalIcon size={12} /> Output Console</span>
                             {terminalOutput && (
                                <button onClick={() => setTerminalOutput('')} className="hover:text-white transition-colors">Clear</button>
                             )}
                          </div>
                          <div 
                             ref={terminalRef}
                             className={`flex-1 overflow-y-auto custom-scrollbar px-4 py-2 text-[13px] font-mono whitespace-pre-wrap ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} break-words`}
                          >
                             {terminalOutput || <span className={`${theme === 'light' ? 'text-gray-400' : 'text-gray-600'} opacity-50 block italic pt-2`}>No output yet. Run the code to see results here.</span>}
                          </div>
                       </div>
                     </Panel>
                  </Group>
               </div>
               
               {webhook1Response && (
                  <div className={`px-6 py-4 border-t ${theme === 'light' ? 'bg-gray-50/80 border-gray-200' : 'bg-black/40 border-white/10'} flex justify-start shrink-0 relative z-50`}>
                      <button
                        onClick={() => setIsAwaitingNewCode(!isAwaitingNewCode)}
                        disabled={isAwaitingNewCode}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-400 to-red-500 text-white font-extrabold rounded-full shadow-[0_5px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_25px_rgba(249,115,22,0.5)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 text-sm tracking-wide"
                      >
                        <PlusCircle size={16} /> DebugNxt
                      </button>
                  </div>
               )}
            </div>
         );

  return (
    <div className="h-full w-full relative">
      <Group orientation="horizontal">
         <Panel defaultSize={50} minSize={30}>
            <div className="h-full pr-2">
               {compilerContent}
            </div>
         </Panel>
         <Separator
           style={{ width: '4px', cursor: 'col-resize', background: 'transparent', zIndex: 10 }}
           className="hover:bg-cyan-500 transition-colors mx-1"
         />
         <Panel defaultSize={50} minSize={30}>
            <div className="h-full pl-2 flex flex-col relative">
               <div className={`h-full flex flex-col rounded-xl border transition-colors shadow-2xl overflow-hidden ${theme === 'light' ? 'bg-white/95 border-gray-200 shadow-gray-300/50' : 'bg-black/60 border-white/10 shadow-black/80'} backdrop-blur-2xl`}>
                 <div className={`flex items-center gap-2 px-6 py-3.5 border-b shrink-0 ${theme === 'light' ? 'bg-gray-100/50 border-gray-200' : 'bg-white/5 border-white/10'} backdrop-blur-md`}>
                   <span className={`text-xs font-bold tracking-widest flex items-center gap-2 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                     <span className={`px-3 py-1 rounded shadow-inner uppercase font-bold ${theme === 'light' ? 'bg-gray-200 text-gray-800 border border-gray-300' : 'bg-secondary/20 text-secondary'}`}>SyntX Analysis {index + 1}</span>
                   </span>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                   {webhook1Response ? (
                      <div className={`text-sm whitespace-pre-wrap leading-relaxed min-h-full ${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:shadow-inner prose-pre:rounded-xl prose-a:text-blue-400`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                           {webhook1Response}
                        </ReactMarkdown>
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-5 animate-pulse">
                         <div className="w-14 h-14 rounded-full border-[3px] border-secondary/20 border-t-secondary animate-spin"></div>
                         <p className={`text-sm font-semibold tracking-wider ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>SyntX is analyzing this compilation...</p>
                      </div>
                   )}
                 </div>
               </div>
            </div>
         </Panel>
      </Group>
    </div>
  );
}
