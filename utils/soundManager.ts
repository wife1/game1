
// Simple synthesizer using Web Audio API
let audioCtx: AudioContext | null = null;

const getCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.05) => {
    const ctx = getCtx();
    // Browser policy: resume on user interaction. We call this in handlers.
    if(ctx.state === 'suspended') ctx.resume().catch(() => {}); 
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
};

export const soundManager = {
    playSelect: () => {
        playTone(440, 'sine', 0.1);
    },
    playReinforce: () => {
        const ctx = getCtx();
        if(ctx.state === 'suspended') ctx.resume().catch(() => {});
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    },
    playAttack: () => {
        // Lower pitched saw for aggression
        playTone(150, 'sawtooth', 0.1, 0, 0.08);
    },
    playCapture: () => {
        // Success chord
        playTone(523.25, 'sine', 0.15, 0, 0.1); // C5
        playTone(659.25, 'sine', 0.15, 0.05, 0.1); // E5
        playTone(783.99, 'sine', 0.3, 0.1, 0.1); // G5
    },
    playTurnStart: () => {
        playTone(300, 'sine', 0.2, 0, 0.05);
        playTone(600, 'sine', 0.3, 0.1, 0.05);
    },
    playUndo: () => {
        playTone(300, 'sine', 0.1, 0);
        playTone(150, 'sine', 0.2, 0.1);
    },
    playWin: () => {
        const now = 0;
        playTone(523.25, 'square', 0.2, now, 0.1);
        playTone(659.25, 'square', 0.2, now + 0.2, 0.1);
        playTone(783.99, 'square', 0.2, now + 0.4, 0.1);
        playTone(1046.50, 'square', 0.6, now + 0.6, 0.1);
    },
    playLose: () => {
        playTone(293.66, 'sawtooth', 0.3, 0, 0.1);
        playTone(277.18, 'sawtooth', 0.3, 0.3, 0.1);
        playTone(261.63, 'sawtooth', 0.8, 0.6, 0.1);
    }
};
