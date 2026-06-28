import React, { useState, useEffect } from 'react';
import { Clock, Loader2, BookOpen } from 'lucide-react';

interface HistoryItem {
  id: string;
  metadata: { url: string; title: string };
  snippet: string;
}

export const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/history');
        const data = await res.json();
        if (data.status === 'success') {
          setHistory(data.history);
        } else {
          setError(data.message || 'Error from server');
        }
      } catch (err: any) {
        setError('Failed to fetch history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-400 text-sm text-center mt-10">{error}</div>;
  }

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
        <Clock size={32} className="mb-4 opacity-50" />
        <p className="text-sm">No history yet.</p>
        <p className="text-xs mt-1">Articles you analyze will appear here.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
        <Clock size={16} className="text-[#a78bfa]" /> Reading History
      </h2>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {history.map((item) => (
          <div key={item.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#8b5cf6]/50 transition-colors cursor-pointer">
            <h3 className="text-sm font-medium text-gray-200 truncate flex items-center gap-2">
              <BookOpen size={14} className="text-[#8b5cf6]" /> {item.metadata.title || "Untitled Document"}
            </h3>
            <a href={item.metadata.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline truncate block mt-1">
              {item.metadata.url}
            </a>
            <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
              {item.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
