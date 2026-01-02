
// Simple synthesizer using Web Audio API
let audioCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicOscillators: OscillatorNode[] = [];
let isMuted = false; // Default to open (sound on)

const getCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.05) => {
    if (isMuted) return;

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
    setMuted: (muted: boolean) => {
        isMuted = muted;
        if (muted) {
            soundManager.stopMusic();
        } else {
            soundManager.startMusic();
        }
    },

    playSelect: () => {
        playTone(440, 'sine', 0.1);
    },
    playReinforce: () => {
        if (isMuted) return;
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
        playTone(150, 'sawtooth', 0.1, 0, 0.08);
    },
    playCapture: () => {
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
    },
    
    // Ambient Music System
    startMusic: () => {
        if (isMuted) return;
        const ctx = getCtx();
        if(ctx.state === 'suspended') ctx.resume().catch(() => {});
        if (musicGain) return; // Already playing

        // Master Music Gain for fade in/out
        musicGain = ctx.createGain();
        musicGain.gain.value = 0; 
        musicGain.connect(ctx.destination);

        // Drone 1: Root (Low Sine - C2)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 65.41; 
        
        // Drone 2: Fifth (Sine - G2)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 98.00;

        // Drone 3: Minor 3rd high (Triangle - Eb3) for moody feel
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = 155.56; 
        osc3.detune.value = 4; // Slight detune for texture

        // Drone 4: 9th (Sine - D3)
        const osc4 = ctx.createOscillator();
        osc4.type = 'sine';
        osc4.frequency.value = 146.83;

        // Connect all
        [osc1, osc2, osc3, osc4].forEach((osc, i) => {
            // Individual gains to balance the mix
            const nodeGain = ctx.createGain();
            nodeGain.gain.value = i === 2 ? 0.05 : 0.1; // Triangle is louder, turn it down
            osc.connect(nodeGain);
            nodeGain.connect(musicGain!);
            osc.start();
            musicOscillators.push(osc);
        });

        // Fade in volume to 0.1 (background level)
        musicGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 3);
    },
    
    stopMusic: () => {
        if (!musicGain) return;
        const ctx = getCtx();
        
        // Fade out
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

        // Cleanup after fade
        setTimeout(() => {
            musicOscillators.forEach(o => o.stop());
            musicOscillators = [];
            if (musicGain) musicGain.disconnect();
            musicGain = null;
        }, 600);
    }
};
