class AudioManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.sounds = new Map();
        
        this.soundTypes = {
            shoot: { frequency: 200, duration: 0.1, type: 'sawtooth' },
            hit: { frequency: 150, duration: 0.2, type: 'square' },
            explosion: { frequency: 80, duration: 0.3, type: 'noise' },
            pickup: { frequency: 600, duration: 0.15, type: 'sine' },
            levelUp: { frequency: 400, duration: 0.5, type: 'triangle' },
            hurt: { frequency: 100, duration: 0.2, type: 'square' }
        };
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    play(soundName) {
        if (!this.enabled || !this.audioContext || !this.soundTypes[soundName]) return;
        
        const sound = this.soundTypes[soundName];
        const currentTime = this.audioContext.currentTime;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        if (sound.type === 'noise') {
            const bufferSize = this.audioContext.sampleRate * sound.duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = buffer;
            noiseSource.connect(gainNode);
            
            gainNode.gain.setValueAtTime(this.volume * 0.1, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + sound.duration);
            
            noiseSource.start(currentTime);
            noiseSource.stop(currentTime + sound.duration);
        } else {
            oscillator.type = sound.type;
            oscillator.frequency.setValueAtTime(sound.frequency, currentTime);
            
            if (soundName === 'shoot') {
                oscillator.frequency.exponentialRampToValueAtTime(50, currentTime + sound.duration);
            } else if (soundName === 'pickup') {
                oscillator.frequency.exponentialRampToValueAtTime(sound.frequency * 2, currentTime + sound.duration);
            } else if (soundName === 'levelUp') {
                oscillator.frequency.setValueAtTime(300, currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(600, currentTime + sound.duration / 2);
                oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + sound.duration);
            }
            
            gainNode.gain.setValueAtTime(this.volume * 0.1, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + sound.duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + sound.duration);
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}