import React, { useState, useEffect } from 'react';
import { Highlighter, Trash2 } from 'lucide-react';

interface Highlight {
  text: string;
  color: string;
  timestamp: number;
}

export const HighlightsView: React.FC = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    // Get the active tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url) {
        const url = activeTab.url.split('?')[0];
        setCurrentUrl(url);
        
        // Fetch highlights from chrome storage
        chrome.storage.local.get(['corvus_highlights'], (result) => {
          const allData = (result.corvus_highlights || {}) as Record<string, Highlight[]>;
          const pageHighlights = allData[url] || [];
          setHighlights(pageHighlights.reverse()); // Newest first
        });
      }
    });
  }, []);

  const clearHighlights = () => {
    chrome.storage.local.get(['corvus_highlights'], (result) => {
      const allData = (result.corvus_highlights || {}) as Record<string, Highlight[]>;
      allData[currentUrl] = [];
      chrome.storage.local.set({ corvus_highlights: allData }, () => {
        setHighlights([]);
        // Optional: refresh page to remove colors visually
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0].id) {
            chrome.tabs.reload(tabs[0].id);
          }
        });
      });
    });
  };

  if (highlights.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Highlighter size={48} className="mb-4 text-[#8b5cf6]" strokeWidth={1} />
        <h2 className="text-lg font-semibold text-gray-200 mb-2">No Highlights Yet</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-sm">
          Select any text on the webpage and pick a color to highlight it. Your highlights will be saved here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col py-6 px-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Highlighter size={18} className="text-[#8b5cf6]"/> Saved Highlights
        </h2>
        <button 
          onClick={clearHighlights}
          className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
        >
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {highlights.map((h, i) => (
          <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-lg relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: h.color }}></div>
            <p className="text-sm text-gray-200 italic leading-relaxed pl-2">
              "{h.text}"
            </p>
            <span className="text-[10px] text-gray-500 block mt-2 pl-2">
              {new Date(h.timestamp).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
