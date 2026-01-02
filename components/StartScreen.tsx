import React from 'react';
import { User, Users, BrainCircuit, Hexagon, Swords } from 'lucide-react';

interface StartScreenProps {
  onStartSingle: () => void;
  onStartMulti: () => void;
  apiKeyMissing: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartSingle, onStartMulti, apiKeyMissing }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4">
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500 rounded-full blur-[80px]" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-red-500 rounded-full blur-[100px]" />
      </div>

      <div className="relative bg-slate-900 border border-slate-700 p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg w-full text-center space-y-8 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="space-y-4">
            <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-4 rounded-2xl shadow-xl shadow-blue-500/20 rotate-3">
                     <Hexagon size={48} className="text-white fill-current" />
                </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">KONQUEST</h1>
            <p className="text-slate-400 text-lg">Minimalist Strategy. Infinite War.</p>
        </div>

        {/* Buttons */}
        <div className="grid gap-4 pt-4">
            
            {/* Single Player */}
            <button 
                onClick={onStartSingle}
                disabled={apiKeyMissing}
                className={`group relative overflow-hidden p-5 rounded-xl border border-slate-600 hover:border-blue-500 bg-slate-800 hover:bg-slate-700 transition-all text-left flex items-center gap-4 ${apiKeyMissing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <BrainCircuit size={24} />
                </div>
                <div>
                    <div className="font-bold text-white text-lg">Single Player</div>
                    <div className="text-slate-400 text-sm">Challenge the Hex AI</div>
                    {apiKeyMissing && <div className="text-red-400 text-xs mt-1">API Key Missing</div>}
                </div>
            </button>

            {/* Multiplayer */}
            <button 
                onClick={onStartMulti}
                className="group relative overflow-hidden p-5 rounded-xl border border-slate-600 hover:border-red-500 bg-slate-800 hover:bg-slate-700 transition-all text-left flex items-center gap-4"
            >
                <div className="p-3 bg-red-500/20 text-red-400 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <Users size={24} />
                </div>
                <div>
                    <div className="font-bold text-white text-lg">Local Multiplayer</div>
                    <div className="text-slate-400 text-sm">Pass & Play (Hotseat)</div>
                </div>
            </button>
        </div>

        <div className="text-xs text-slate-600 pt-4">
            v1.0.0 • Turn-based Strategy
        </div>

      </div>
    </div>
  );
};