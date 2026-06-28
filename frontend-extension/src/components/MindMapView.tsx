import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Loader2, RefreshCw } from 'lucide-react';
import mermaid from 'mermaid';

interface MindMapViewProps {
  content: string;
  language: string;
}

export const MindMapView: React.FC<MindMapViewProps> = ({ content, language }) => {
  const [mindmapCode, setMindmapCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif'
    });
  }, []);

  useEffect(() => {
    if (mindmapCode && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      mermaid.render('mermaid-svg', mindmapCode).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
        }
      }).catch(err => {
        console.error("Mermaid render error", err);
      });
    }
  }, [mindmapCode]);

  const generateMindMap = async () => {
    if (!content) {
      setError("No content available to generate a mind map. Please analyze an article first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setMindmapCode(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: "mindmap://generate", 
          title: "MindMap", 
          content: content,
          language: language
        })
      });
      
      const data = await res.json();
      if (data.status === 'success' && data.mindmap) {
        setMindmapCode(data.mindmap);
      } else {
        setError(data.message || 'Error from server');
      }
    } catch (err: any) {
      setError('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  if (!mindmapCode) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <BrainCircuit size={48} className="mb-4 text-[#3b82f6]" strokeWidth={1} />
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Visualize Concepts</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-sm">
          Generate an interactive Mind Map to visualize the relationships between concepts in the text.
        </p>
        <button 
          onClick={generateMindMap}
          disabled={loading}
          className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
          {loading ? 'Generating...' : 'Generate Mind Map'}
        </button>
        {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-gray-200">Article Mind Map</h2>
        <button onClick={generateMindMap} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={12} /> Regenerate
        </button>
      </div>
      <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-auto p-4 flex items-center justify-center min-h-[300px]">
        <div ref={mermaidRef} className="w-full flex justify-center" />
      </div>
    </div>
  );
};
