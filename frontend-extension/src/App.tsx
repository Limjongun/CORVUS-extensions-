import { useState, useEffect, useRef } from 'react';
import { 
  Home, List, MessageSquare, BrainCircuit, Columns, 
  Highlighter, Clock, Settings, X, Copy, Zap, Send, Save, Download, BookOpen, Volume2, HelpCircle
} from 'lucide-react';
import jsPDF from 'jspdf';

interface AnalysisResult {
  summary: string;
  keywords: string[];
  key_points: string[];
}

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  analysis?: AnalysisResult;
}

import { FlashcardsView } from './components/FlashcardsView';
import { MindMapView } from './components/MindMapView';
import { HistoryView } from './components/HistoryView';
import { HighlightsView } from './components/HighlightsView';

const TONES = ['Standard', 'Casual', 'Academic', 'Humorous', "Explain Like I'm 5"];
const LENGTHS = ['30 sec', '1 min', 'Detailed'];
const LANGUAGES = ['English', 'Indonesian', 'Spanish', 'French', 'Japanese'];

function App() {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('summary');
  const [mode, setMode] = useState<'analyze' | 'chat'>('analyze');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Preferences State
  const [aiTone, setAiTone] = useState('Standard');
  const [summaryLength, setSummaryLength] = useState('30 sec');
  const [aiLanguage, setAiLanguage] = useState('Indonesian');
  
  // Chat Input
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const analyzedContent = messages.find(m => m.role === 'user')?.text || '';

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const messageListener = (request: any, _sender: any, _sendResponse: any) => {
      if (request.action === 'analyze_selection' && request.text) {
        if (mode !== 'analyze') setMode('analyze');
        handleSelectionAnalysis(request.text);
      }
      if (request.action === 'content_extracted' && request.text) {
        if (mode !== 'analyze') setMode('analyze');
        handleSelectionAnalysis(request.text);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [aiTone, summaryLength, aiLanguage, mode]);

  const handleAnalyzePage = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: "extract_content" }, (response) => {
          if (chrome.runtime.lastError) {
             console.error("Could not send message:", chrome.runtime.lastError.message);
             handleSelectionAnalysis("ERROR: Silakan Refresh (F5) halaman web ini agar ekstensi dapat membaca konten halamannya.");
             return;
          }
          if (response && response.content) {
             if (mode !== 'analyze') setMode('analyze');
             handleSelectionAnalysis(response.content);
          }
        });
      }
    });
  };

  const handleToggleReaderMode = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: "toggle_reader_mode" });
      }
    });
  };

  const handlePlayTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = aiLanguage === 'Indonesian' ? 'id-ID' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectionAnalysis = async (text: string) => {
    setLoading(true);
    setError(null);
    setActiveTab('summary');
    setMode('analyze');
    
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: text.substring(0, 200) + (text.length > 200 ? '...' : '') };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/article/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: "selection://user", 
          title: "User Selection", 
          content: text,
          tone: aiTone,
          length: summaryLength,
          language: aiLanguage
        })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        const aiMsg: ChatMessage = {
          id: Date.now() + 1,
          role: 'ai',
          text: "Analysis complete.",
          analysis: { summary: data.summary, keywords: data.keywords, key_points: data.key_points }
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setError(data.message || 'Error from server');
      }
    } catch (err: any) {
      setError('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (textOverride?: string) => {
    const text = textOverride || chatInput.trim();
    if (!text || loading) return;
    
    if (!textOverride) setChatInput('');
    setLoading(true);
    setError(null);
    setMode('chat'); 
    setActiveTab('chat');

    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
          tone: aiTone,
          language: aiLanguage
        })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        const aiMsg: ChatMessage = {
          id: Date.now() + 1,
          role: 'ai',
          text: data.response
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setError(data.message || 'Error from server');
      }
    } catch (err: any) {
      setError('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleAskKeyword = (kw: string) => {
    handleSendChat(`Tolong jelaskan lebih lanjut mengenai kata kunci: "${kw}"`);
  };

  const getAiContentText = (msg: ChatMessage) => {
    if (msg.analysis) {
      let content = `Summary:\n${msg.analysis.summary}\n\n`;
      content += `Keywords:\n${msg.analysis.keywords.join(', ')}\n\n`;
      content += `Key Points:\n${msg.analysis.key_points.map(pt => `- ${pt}`).join('\n')}`;
      return content;
    }
    return msg.text;
  };

  const saveToTxt = (msg: ChatMessage) => {
    const text = getAiContentText(msg);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corvus_note_${msg.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveToPdf = (msg: ChatMessage) => {
    const text = getAiContentText(msg);
    const doc = new jsPDF();
    doc.setFontSize(12);
    
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 10);
    
    doc.save(`corvus_note_${msg.id}.pdf`);
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button 
      onClick={() => {
        setActiveTab(id);
        if (id === 'summary') setMode('analyze');
        if (id === 'chat') setMode('chat');
      }}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-full ${activeTab === id ? 'text-[#8b5cf6] bg-surface' : 'text-textMuted hover:text-textMain hover:bg-surface/50'}`}
    >
      <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.5} />
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );

  const renderMainContent = () => {
    if (activeTab === 'flashcards') {
      return <FlashcardsView content={analyzedContent} language={aiLanguage} />;
    }
    if (activeTab === 'mindmap') {
      return <MindMapView content={analyzedContent} language={aiLanguage} />;
    }
    if (activeTab === 'history') {
      return <HistoryView />;
    }
    if (activeTab === 'highlights') {
      return <HighlightsView />;
    }

    // Default: Summary / Chat
    return (
      <div className="flex flex-col gap-6 pb-20">
        {messages.length === 0 && !loading && (
             <div className="h-full flex flex-col items-center justify-center text-center text-textMuted opacity-70 mt-20">
                <BrainCircuit size={48} className="mb-4 text-[#4a4a4a]" strokeWidth={1} />
                <p className="text-sm">Ready to {mode === 'analyze' ? 'analyze text' : 'chat'}.</p>
                <p className="text-xs mt-2 max-w-[200px]">
                  {mode === 'analyze' 
                    ? 'Select text on the page, right-click, and choose "Analyze with CORVUS", or click the green AI icon in the header to analyze the entire page.'
                    : 'Type a message below to start chatting with CORVUS.'}
                </p>
                {mode === 'analyze' && (
                  <button 
                    onClick={handleAnalyzePage}
                    className="mt-4 bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                  >
                    <BrainCircuit size={14} /> Analyze Entire Page
                  </button>
                )}
             </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-4">
            
            {msg.role === 'user' && (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 shadow-sm relative self-end w-[90%] mt-4">
                <div className="flex items-center justify-between mb-3 border-b border-[#2a2a2a] pb-2">
                   <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-300">
                      <MessageSquare size={16} className="text-[#3b82f6]" /> {mode === 'analyze' ? 'Selected Text' : 'You'}
                   </h2>
                </div>
                <p className={`text-sm leading-relaxed ${mode === 'analyze' ? 'text-gray-400 italic border-l-2 border-[#3b82f6] pl-3' : 'text-gray-200'}`}>
                  {msg.text}
                </p>
              </div>
            )}

            {msg.role === 'ai' && (
              <div className="flex flex-col gap-4 self-start w-[95%] relative group mt-4">
                
                <div className="absolute -top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => saveToTxt(msg)} className="bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 hover:text-white p-1.5 rounded flex items-center gap-1 shadow" title="Save as TXT">
                    <Save size={12} /> <span className="text-[10px]">TXT</span>
                  </button>
                  <button onClick={() => saveToPdf(msg)} className="bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 hover:text-white p-1.5 rounded flex items-center gap-1 shadow" title="Save as PDF">
                    <Download size={12} /> <span className="text-[10px]">PDF</span>
                  </button>
                </div>

                {msg.analysis ? (
                  <>
                    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 shadow-sm relative pt-6">
                      <div className="flex items-center justify-between mb-3 border-b border-[#2a2a2a] pb-2">
                         <h2 className="text-sm font-semibold flex items-center gap-2">
                            <Home size={16} className="text-[#8b5cf6]" /> Summary
                         </h2>
                         <div className="flex items-center gap-2 text-xs">
                           <button onClick={() => handlePlayTTS(msg.analysis!.summary)} className="text-[#10b981] hover:text-[#059669] flex items-center gap-1 bg-[#2a2a2a] px-2 py-1 rounded" title="Read Aloud">
                             <Volume2 size={12} /> Play
                           </button>
                         </div>
                      </div>
                      
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {msg.analysis.summary}
                      </p>
                      
                      <div className="mt-4 flex items-center gap-1 text-[10px] text-gray-500">
                         <Zap size={10} /> Generated by CORVUS AI (Tone: {aiTone} | Length: {summaryLength})
                      </div>
                    </div>

                    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3 border-b border-[#2a2a2a] pb-2">
                         <h2 className="text-sm font-semibold flex items-center gap-2">
                            <List size={16} className="text-[#8b5cf6]" /> Key Points
                         </h2>
                         <div className="flex items-center gap-2">
                           <button onClick={() => handlePlayTTS(msg.analysis!.key_points.join('. '))} className="text-xs bg-[#2a2a2a] text-[#10b981] hover:text-[#059669] px-2 py-1 rounded flex items-center gap-1" title="Read Key Points">
                             <Volume2 size={12} /> Play
                           </button>
                           <button className="text-xs bg-[#2a2a2a] text-gray-400 hover:text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => navigator.clipboard.writeText(msg.analysis!.key_points.join('\n'))}>
                             <Copy size={12} /> Copy
                           </button>
                         </div>
                      </div>
                      <ul className="space-y-3">
                        {msg.analysis.key_points.map((pt, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                             <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shrink-0"></div>
                             <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3 border-b border-[#2a2a2a] pb-2">
                         <h2 className="text-sm font-semibold flex items-center gap-2">
                            <Highlighter size={16} className="text-[#8b5cf6]" /> Keywords
                         </h2>
                         <button className="text-xs bg-[#2a2a2a] text-gray-400 hover:text-white px-2 py-1 rounded flex items-center gap-1" onClick={() => navigator.clipboard.writeText(msg.analysis!.keywords.join(', '))}>
                           <Copy size={12} /> Copy
                         </button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.analysis.keywords.map((kw, i) => (
                          <span 
                            key={i} 
                            className="group relative inline-flex items-center bg-[#2a2a2a] text-xs px-2.5 py-1 rounded-md text-[#a78bfa] border border-[#3a3a3a] cursor-pointer hover:bg-[#333333] transition-colors"
                            onClick={() => window.open('https://www.google.com/search?q=' + encodeURIComponent(kw), '_blank')}
                          >
                            {kw}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAskKeyword(kw); }}
                              className="opacity-0 group-hover:opacity-100 bg-[#8b5cf6] text-white p-1 rounded-full transition-all absolute -top-2 -right-2 shadow-md hover:scale-110 flex items-center justify-center"
                              title="Tanya AI tentang ini"
                            >
                              <BrainCircuit size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 shadow-sm pt-6">
                    <div className="flex items-center justify-between mb-3 border-b border-[#2a2a2a] pb-2">
                       <h2 className="text-sm font-semibold flex items-center gap-2">
                          <BrainCircuit size={16} className="text-[#8b5cf6]" /> CORVUS AI
                       </h2>
                       <button onClick={() => handlePlayTTS(msg.text)} className="text-[#10b981] hover:text-[#059669] flex items-center gap-1 text-xs bg-[#2a2a2a] px-2 py-1 rounded" title="Read Aloud">
                         <Volume2 size={12} /> Play
                       </button>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex items-center justify-center p-4">
             <div className="flex items-center gap-2 text-[#8b5cf6] bg-[#8b5cf6]/10 px-4 py-2 rounded-full border border-[#8b5cf6]/20">
               <Zap size={14} className="animate-pulse" />
               <span className="text-xs font-medium animate-pulse">{mode === 'analyze' ? 'Analyzing text...' : 'Thinking...'}</span>
             </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#121212] text-[#e5e5e5] font-sans overflow-hidden">
      <header className="flex flex-col border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden border border-[#2a2a2a] shadow-sm">
              <img src="/corvus-logo.png" alt="CORVUS" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-bold tracking-wide">CORVUS</h1>
          </div>
          <div className="flex items-center gap-3 text-textMuted relative">
            <button className="hover:text-white transition-colors" onClick={() => setShowHelp(!showHelp)} title="Hint / Penjelasan"><HelpCircle size={18} className={showHelp ? 'text-[#3b82f6]' : ''}/></button>
            <button className="hover:text-white transition-colors" onClick={handleToggleReaderMode} title="Toggle Reader Mode"><BookOpen size={18} /></button>
            <button className="hover:text-white transition-colors" onClick={handleAnalyzePage} title="Analyze Entire Page"><BrainCircuit size={18} className="text-[#10b981]" /></button>
            <button onClick={() => setShowSettings(!showSettings)} className={`hover:text-white transition-colors ${showSettings ? 'text-[#8b5cf6]' : ''}`}><Settings size={18} /></button>
          </div>
        </div>

        <div className="px-4 pb-2 flex gap-2">
          <button 
            onClick={() => { setMode('analyze'); setActiveTab('summary'); }}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium border ${mode === 'analyze' ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-[#a78bfa]' : 'bg-[#2a2a2a] border-transparent text-gray-400 hover:text-white'}`}
          >
            Analyze Mode
          </button>
          <button 
            onClick={() => { setMode('chat'); setActiveTab('chat'); }}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium border ${mode === 'chat' ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#60a5fa]' : 'bg-[#2a2a2a] border-transparent text-gray-400 hover:text-white'}`}
          >
            Free Chat
          </button>
        </div>

        {/* Help / Hint Panel */}
        {showHelp && (
          <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#3b82f6]/30 flex flex-col gap-3 z-20 absolute w-full top-[92px] shadow-xl text-xs text-gray-300">
             <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-[#3b82f6] flex items-center gap-1"><HelpCircle size={14}/> Cara Menggunakan CORVUS</h3>
                <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-white"><X size={14}/></button>
             </div>
             <ul className="list-disc pl-4 space-y-1.5">
               <li><b>Analyze Page (Ikon Hijau):</b> Meringkas seluruh konten artikel secara otomatis.</li>
               <li><b>Highlighter:</b> Sorot teks di web, pilih warna untuk menyimpan kutipan penting.</li>
               <li><b>Reader Mode (Buku):</b> Bersihkan iklan web, baca dengan tampilan yang fokus.</li>
               <li><b>Flashcards & Mind Map:</b> Generate otomatis materi belajar dari artikel yang dirangkum.</li>
               <li><b>Kata Kunci (Hover):</b> Arahkan mouse ke tombol kata kunci untuk bertanya ke AI.</li>
             </ul>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#2a2a2a] flex flex-col gap-3 z-20 absolute w-full top-[92px] shadow-lg">
            <div>
              <h3 className="text-xs font-semibold text-gray-300 mb-2">AI Tone of Voice</h3>
              <div className="flex flex-wrap gap-2">
                {TONES.map(tone => (
                  <button
                    key={tone}
                    onClick={() => setAiTone(tone)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${aiTone === tone ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white' : 'bg-transparent border-[#4a4a4a] text-gray-400 hover:border-gray-300'}`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-semibold text-gray-300 mb-2">Summary Length</h3>
              <div className="flex flex-wrap gap-2">
                {LENGTHS.map(len => (
                  <button 
                    key={len}
                    onClick={() => setSummaryLength(len)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${summaryLength === len ? 'bg-[#10b981] border-[#10b981] text-white' : 'bg-transparent border-[#4a4a4a] text-gray-400 hover:border-gray-300'}`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-300 mb-2">Language</h3>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button 
                    key={lang}
                    onClick={() => setAiLanguage(lang)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${aiLanguage === lang ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'bg-transparent border-[#4a4a4a] text-gray-400 hover:border-gray-300'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>
      
      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-16 border-r border-[#2a2a2a] bg-[#161616] flex flex-col items-center py-4 gap-4 shrink-0 overflow-y-auto scrollbar-none z-10">
          <NavItem id="summary" icon={Home} label="Summary" />
          <NavItem id="keypoints" icon={List} label="Key Points" />
          <NavItem id="chat" icon={MessageSquare} label="Chat" />
          <NavItem id="mindmap" icon={BrainCircuit} label="Mind Map" />
          <NavItem id="flashcards" icon={Columns} label="Flashcards" />
          <NavItem id="highlights" icon={Highlighter} label="Highlights" />
          <div className="mt-auto flex flex-col gap-4">
            <NavItem id="history" icon={Clock} label="History" />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#121212] relative">
          
          {error && (
            <div className="absolute top-4 left-4 right-4 z-50 bg-red-900/90 text-red-100 p-3 rounded-lg text-sm border border-red-900 shadow-lg flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)}><X size={14} /></button>
            </div>
          )}

          {renderMainContent()}

        </main>
      </div>

      {['chat', 'summary'].includes(activeTab) && (
        <div className="absolute bottom-0 left-16 right-0 p-4 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent pt-10 pointer-events-none z-20">
          <div className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 flex items-center gap-2 shadow-lg ${mode === 'chat' ? 'pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
            <input 
              type="text" 
              placeholder={mode === 'chat' ? "Type a message..." : "Chat disabled in Analyze Mode"} 
              className="flex-1 bg-transparent border-none outline-none text-sm px-3 text-white placeholder-gray-500 disabled:opacity-50"
              disabled={mode === 'analyze' || loading}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            />
            <button 
              disabled={mode === 'analyze' || loading || !chatInput.trim()}
              onClick={() => handleSendChat()}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-gray-700 disabled:text-gray-400 text-white p-2 rounded-lg transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default App;
