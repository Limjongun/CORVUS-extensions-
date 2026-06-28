import React, { useState } from 'react';
import { BrainCircuit, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
}

interface Evaluation {
  is_correct: boolean;
  feedback: string;
}

interface FlashcardsViewProps {
  content: string;
  language: string;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ content, language }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Interactive study state
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const generateFlashcards = async () => {
    if (!content) {
      setError("No content available to generate flashcards. Please analyze an article first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setUserAnswer('');
    setEvaluation(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: "flashcards://generate", 
          title: "Flashcards", 
          content: content,
          language: language
        })
      });
      
      const data = await res.json();
      if (data.status === 'success' && data.flashcards) {
        setFlashcards(data.flashcards);
      } else {
        setError(data.message || 'Error from server');
      }
    } catch (err: any) {
      setError('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const goToCard = (index: number) => {
    setCurrentIndex(index);
    setIsFlipped(false);
    setUserAnswer('');
    setEvaluation(null);
  };

  const handleAnswerSubmit = async () => {
    if (!userAnswer.trim()) return;
    setEvaluating(true);
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/flashcards/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: flashcards[currentIndex].question, 
          true_answer: flashcards[currentIndex].answer, 
          user_answer: userAnswer,
          language: language
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEvaluation(data.evaluation);
        setIsFlipped(true); // Flip to show true answer automatically
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <BrainCircuit size={48} className="mb-4 text-[#8b5cf6]" strokeWidth={1} />
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Study with Flashcards</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-sm">
          Convert the currently analyzed text into interactive Question & Answer cards to test your knowledge.
        </p>
        <button 
          onClick={generateFlashcards}
          disabled={loading}
          className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
          {loading ? 'Generating...' : 'Generate Flashcards'}
        </button>
        {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="h-full flex flex-col items-center py-8 px-4 overflow-y-auto">
      <div className="w-full max-w-md flex justify-between items-center mb-6 text-gray-400 text-sm">
        <span>Card {currentIndex + 1} of {flashcards.length}</span>
        <button onClick={generateFlashcards} className="flex items-center gap-1 hover:text-white transition-colors">
          <RefreshCw size={14} /> Regenerate
        </button>
      </div>

      <div 
        className="w-full max-w-md aspect-[4/3] perspective-1000 cursor-pointer group shrink-0"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front (Question) */}
          <div className="absolute w-full h-full backface-hidden bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
            <span className="absolute top-4 left-4 text-xs font-semibold text-[#8b5cf6]">QUESTION</span>
            <p className="text-lg text-gray-200 font-medium leading-relaxed">{currentCard.question}</p>
            <span className="absolute bottom-4 text-[10px] text-gray-500">Click to flip manually</span>
          </div>

          {/* Back (Answer) */}
          <div className="absolute w-full h-full backface-hidden bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center rotate-y-180">
            <span className="absolute top-4 left-4 text-xs font-semibold text-[#10b981]">TRUE ANSWER</span>
            <p className="text-lg text-gray-100 font-medium leading-relaxed">{currentCard.answer}</p>
          </div>

        </div>
      </div>

      {/* Answer Input Area */}
      {!isFlipped && !evaluation && (
        <div className="w-full max-w-md mt-6 flex gap-2">
          <input 
            type="text" 
            placeholder="Type your answer here..." 
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-lg outline-none focus:border-[#8b5cf6] transition-colors shadow-sm"
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnswerSubmit()}
            disabled={evaluating}
          />
          <button 
            onClick={handleAnswerSubmit}
            disabled={evaluating || !userAnswer.trim()}
            className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#2a2a2a] disabled:text-gray-500 text-white px-5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
          >
            {evaluating ? <Loader2 size={16} className="animate-spin" /> : 'Check'}
          </button>
        </div>
      )}

      {/* Evaluation Result */}
      {evaluation && (
        <div className={`w-full max-w-md mt-6 p-5 rounded-xl border flex flex-col gap-2 shadow-sm ${evaluation.is_correct ? 'bg-[#10b981]/10 border-[#10b981]/30' : 'bg-red-500/10 border-red-500/30'}`}>
           <h3 className={`text-sm font-semibold flex items-center gap-2 ${evaluation.is_correct ? 'text-[#10b981]' : 'text-red-400'}`}>
              {evaluation.is_correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {evaluation.is_correct ? 'Good Job!' : 'Not Quite'}
           </h3>
           <p className="text-sm text-gray-300 leading-relaxed">{evaluation.feedback}</p>
        </div>
      )}

      <div className="flex gap-4 mt-8 pb-4">
        <button 
          onClick={() => goToCard(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-6 py-2 bg-[#2a2a2a] disabled:opacity-50 text-gray-300 rounded-lg hover:bg-[#333333] transition-colors text-sm font-medium"
        >
          Previous
        </button>
        <button 
          onClick={() => goToCard(Math.min(flashcards.length - 1, currentIndex + 1))}
          disabled={currentIndex === flashcards.length - 1}
          className="px-6 py-2 bg-[#8b5cf6] disabled:opacity-50 text-white rounded-lg hover:bg-[#7c3aed] transition-colors text-sm font-medium"
        >
          Next Card
        </button>
      </div>
    </div>
  );
};
