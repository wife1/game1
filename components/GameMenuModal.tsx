import React from 'react';
import { RotateCcw, Home, X } from 'lucide-react';

interface GameMenuModalProps {
  onClose: () => void;
  onRestartLevel: () => void;
  onNewGame: () => void;
}

export const GameMenuModal: React.FC<GameMenuModalProps> = ({ onClose, onRestartLevel, onNewGame }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-bold text-white">Game Menu</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
             <button 
                onClick={onRestartLevel}
                className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 rounded-xl transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <RotateCcw size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">Restart Level</div>
                        <div className="text-xs text-slate-400">Retry the current map</div>
                    </div>
                </div>
            </button>

            <button 
                onClick={onNewGame}
                className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 rounded-xl transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 text-red-400 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <Home size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">New Game</div>
                        <div className="text-xs text-slate-400">Back to mode selection</div>
                    </div>
                </div>
            </button>
        </div>
        
        <div className="p-4 bg-slate-900/50 text-center">
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">Cancel</button>
        </div>

      </div>
    </div>
  );
};