import React from 'react';
import { X, Save, Download, Trash2, Shield, Sword, Scale, Eye, EyeOff, Signal, BarChart3, TrendingUp } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  difficulty: number;
  setDifficulty: (val: number) => void;
  aggression: 'cautious' | 'balanced' | 'aggressive';
  setAggression: (val: 'cautious' | 'balanced' | 'aggressive') => void;
  fogEnabled: boolean;
  setFogEnabled: (val: boolean) => void;
  onSave: () => void;
  onLoad: () => void;
  onClearSave: () => void;
  hasSave: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  difficulty,
  setDifficulty,
  aggression,
  setAggression,
  fogEnabled,
  setFogEnabled,
  onSave,
  onLoad,
  onClearSave,
  hasSave
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
            {/* AI Personality */}
            <div className="space-y-3">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">AI Personality</label>
                <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => setAggression('cautious')}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${aggression === 'cautious' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Shield size={20} />
                        <span className="text-xs font-bold">Turtle</span>
                    </button>
                    <button 
                        onClick={() => setAggression('balanced')}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${aggression === 'balanced' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Scale size={20} />
                        <span className="text-xs font-bold">Balanced</span>
                    </button>
                    <button 
                        onClick={() => setAggression('aggressive')}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${aggression === 'aggressive' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Sword size={20} />
                        <span className="text-xs font-bold">Rush</span>
                    </button>
                </div>
            </div>

            {/* Difficulty Slider */}
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">AI Difficulty</label>
                    <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                        {difficulty.toFixed(1)}x Strength
                    </span>
                </div>
                
                {/* Presets */}
                <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => setDifficulty(0.5)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${difficulty === 0.5 ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <Signal size={14} /> Easy
                    </button>
                    <button 
                        onClick={() => setDifficulty(1.0)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${difficulty === 1.0 ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <BarChart3 size={14} /> Normal
                    </button>
                    <button 
                        onClick={() => setDifficulty(1.5)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${difficulty === 1.5 ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    >
                        <TrendingUp size={14} /> Hard
                    </button>
                </div>

                <div className="pt-2">
                    <input 
                        type="range" 
                        min="0.5" 
                        max="2.0" 
                        step="0.1"
                        value={difficulty}
                        onChange={(e) => setDifficulty(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                     <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1 mt-1">
                        <span>0.5x</span>
                        <span>1.0x</span>
                        <span>1.5x</span>
                        <span>2.0x</span>
                    </div>
                </div>
            </div>

            {/* Fog Toggle */}
             <div className="space-y-3">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Visuals</label>
                <button 
                    onClick={() => setFogEnabled(!fogEnabled)}
                    className="w-full flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors text-left"
                >
                    <div className="flex items-center gap-3">
                        {fogEnabled ? <EyeOff size={20} className="text-slate-400"/> : <Eye size={20} className="text-blue-400"/>}
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-200">Fog of War</span>
                            <span className="text-xs text-slate-500">{fogEnabled ? "Enabled (Hidden map)" : "Disabled (Visible map)"}</span>
                        </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${fogEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${fogEnabled ? 'translate-x-5' : ''}`} />
                    </div>
                </button>
            </div>

            {/* Save Management */}
             <div className="space-y-3 pt-4 border-t border-slate-700">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Save Management</label>
                <div className="grid grid-cols-2 gap-2">
                     <button 
                        onClick={() => { onSave(); onClose(); }}
                        className="flex items-center justify-center gap-2 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-semibold"
                     >
                        <Save size={16} /> Save Game
                     </button>
                     <button 
                        onClick={() => { onLoad(); onClose(); }}
                        disabled={!hasSave}
                        className="flex items-center justify-center gap-2 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <Download size={16} /> Load Game
                     </button>
                     {hasSave && (
                         <button 
                            onClick={onClearSave}
                            className="col-span-2 flex items-center justify-center gap-2 p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg transition-colors text-sm"
                         >
                            <Trash2 size={16} /> Delete Save Data
                         </button>
                     )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};