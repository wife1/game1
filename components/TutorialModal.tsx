import React from 'react';
import { X, MousePointer, Shield, Swords, User, BrainCircuit, Target, ArrowRight, Activity, Clock, Check, Castle } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

// Simple Hex Visual for diagrams
const HexVisual = ({ strength, owner, label, ghost = false }: { strength: number, owner: 'PLAYER' | 'AI' | 'NEUTRAL', label: string, ghost?: boolean }) => {
    const color = owner === 'PLAYER' ? '#3b82f6' : owner === 'AI' ? '#ef4444' : '#94a3b8';
    return (
        <div className={`flex flex-col items-center gap-2 ${ghost ? 'opacity-40 grayscale' : ''}`}>
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                 <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-lg">
                    <polygon points="50 5, 90 27.5, 90 72.5, 50 95, 10 72.5, 10 27.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="5" />
                 </svg>
                 <span className="relative z-10 text-white font-bold text-xs md:text-sm shadow-black drop-shadow-md">{strength}</span>
            </div>
            <span className="text-[8px] md:text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</span>
        </div>
    );
};

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-700 bg-slate-800 sticky top-0 z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-blue-500" /> Tutorial
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-8 md:space-y-10">
          
          {/* Section 1: Objective */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2 border-b border-blue-500/20 pb-2">
              <User size={20} /> Objective
            </h3>
            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-4">
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                      You command the <span className="text-blue-400 font-bold">Blue Army</span>. 
                      Your goal is total domination. Capture nodes to expand territory and increase income.
                    </p>
                    
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 space-y-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">How to Win</div>
                        <ul className="space-y-2 text-sm text-slate-200">
                            <li className="flex items-center gap-2">
                                <span className="bg-amber-500/20 text-amber-400 p-1.5 rounded"><Castle size={16} /></span>
                                <span>Capture the enemy <strong>Capital</strong> (Castle)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="bg-red-500/20 text-red-400 p-1.5 rounded"><Swords size={16} /></span>
                                <span>OR Eliminate <strong>all enemy units</strong></span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex items-center gap-8 shrink-0">
                     <HexVisual strength={25} owner="PLAYER" label="YOU" />
                     <div className="text-slate-600 font-bold text-xs">VS</div>
                     <HexVisual strength={25} owner="AI" label="ENEMY" />
                </div>
            </div>
          </section>

          {/* Section 2: Combat Math */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 border-b border-red-500/20 pb-2">
              <Swords size={20} /> Combat Mechanics
            </h3>
            <p className="text-slate-400 text-sm mb-4">
                Leave <strong className="text-white">1 unit</strong> behind when moving.
            </p>

            {/* Diagram 1: Victory */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-700 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-emerald-500/20">VICTORY</div>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 mt-2">
                    <HexVisual strength={15} owner="PLAYER" label="SRC" />
                    
                    <div className="flex flex-col items-center">
                        <ArrowRight className="text-slate-500 mb-1" size={16} />
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">14 Sent</span>
                    </div>

                    <HexVisual strength={10} owner="AI" label="TGT" ghost />

                    <div className="flex flex-col items-center text-emerald-500 font-bold text-xs">
                        <span>Win</span>
                        <ArrowRight size={16} />
                    </div>

                    <HexVisual strength={4} owner="PLAYER" label="RES" />
                </div>
                <div className="text-center mt-4 text-[10px] md:text-xs text-slate-500 font-mono">
                    14 (Atk) &gt; 10 (Def) &rarr; 14 - 10 = 4 Left
                </div>
            </div>

            {/* Diagram 2: Defeat */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-700 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-orange-500/10 text-orange-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-orange-500/20">DEFEAT</div>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 mt-2">
                    <HexVisual strength={8} owner="PLAYER" label="SRC" />
                    
                    <div className="flex flex-col items-center">
                        <ArrowRight className="text-slate-500 mb-1" size={16} />
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">7 Sent</span>
                    </div>

                    <HexVisual strength={10} owner="AI" label="TGT" ghost />

                    <div className="flex flex-col items-center text-orange-500 font-bold text-xs">
                        <span>Lose</span>
                        <ArrowRight size={16} />
                    </div>

                    <HexVisual strength={3} owner="AI" label="RES" />
                </div>
                 <div className="text-center mt-4 text-[10px] md:text-xs text-slate-500 font-mono">
                    7 (Atk) &le; 10 (Def) &rarr; 10 - 7 = 3 Left
                </div>
            </div>
          </section>

          {/* Section 3: Turn Structure */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 border-b border-amber-500/20 pb-2">
              <Clock size={20} /> Turn Structure
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm md:text-base">
                        <span className="bg-blue-500 text-white w-5 h-5 rounded flex items-center justify-center text-xs">1</span>
                        Your Action Phase
                    </h4>
                    <ul className="list-disc list-inside text-xs md:text-sm text-slate-300 space-y-1 ml-1">
                        <li>Move units between your nodes (Reinforce).</li>
                        <li>Attack enemy or neutral nodes.</li>
                        <li>Unlimited moves per turn.</li>
                    </ul>
                </div>

                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm md:text-base">
                        <span className="bg-emerald-500 text-white w-5 h-5 rounded flex items-center justify-center text-xs">2</span>
                        End Turn & Income
                    </h4>
                    <ul className="list-disc list-inside text-xs md:text-sm text-slate-300 space-y-1 ml-1">
                        <li>Click "End Turn" &rarr; All nodes <span className="text-emerald-400 font-bold">+1 Str</span>.</li>
                        <li>AI takes its turn.</li>
                    </ul>
                </div>
            </div>
          </section>

          {/* Section 4: Fog of War */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2 border-b border-purple-500/20 pb-2">
              <BrainCircuit size={20} /> Fog of War
            </h3>
            <div className="flex gap-4 items-start">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                        <span className="text-xs text-slate-500">?</span>
                    </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                    You can only see the immediate surroundings of your nodes. 
                    <br/>
                    <span className="text-slate-500 italic text-xs mt-1 block">Adjust visibility in Settings.</span>
                </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 md:px-8 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 flex items-center gap-2 text-sm md:text-base">
                Understood <Check size={18} />
            </button>
        </div>

      </div>
    </div>
  );
};