import React from 'react';
import { User, Swords } from 'lucide-react';
import { Owner } from '../types';

interface TurnTransitionModalProps {
    nextOwner: Owner;
    onReady: () => void;
}

export const TurnTransitionModal: React.FC<TurnTransitionModalProps> = ({ nextOwner, onReady }) => {
    const isPlayer = nextOwner === Owner.PLAYER; // PLAYER is Blue (P1), AI is Red (P2)
    const colorClass = isPlayer ? 'text-blue-500' : 'text-red-500';
    const bgClass = isPlayer ? 'bg-blue-500/10 border-blue-500/30' : 'bg-red-500/10 border-red-500/30';
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4 animate-in fade-in duration-300">
            <div className={`max-w-md w-full p-8 rounded-2xl border ${bgClass} backdrop-blur-sm flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300`}>
                <div className={`p-4 rounded-full ${isPlayer ? 'bg-blue-500/20' : 'bg-red-500/20'} mb-2 ring-1 ring-white/10`}>
                    <Swords size={48} className={colorClass} />
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tight uppercase">
                        <span className={colorClass}>{isPlayer ? 'BLUE' : 'RED'}</span> TURN
                    </h2>
                    <p className="text-slate-400 text-lg">
                        Pass the device to the {isPlayer ? 'Blue' : 'Red'} player.
                    </p>
                </div>

                <div className="pt-4 w-full">
                    <button 
                        onClick={onReady}
                        className={`w-full px-8 py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${isPlayer ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25' : 'bg-red-600 hover:bg-red-500 shadow-red-500/25'}`}
                    >
                        <User size={24} />
                        Ready to Start
                    </button>
                </div>
                
                <p className="text-xs text-slate-600">
                    The map is hidden until you click Ready.
                </p>
            </div>
        </div>
    );
};