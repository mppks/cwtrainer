/**
 * CW QSO Trainer
 * 
 * Morse Code timing standards:
 * - Dash = 3 dots
 * - Pause between elements of a character = 1 dot
 * - Pause between characters in a word = 3 dots
 * - Pause between words = 7 dots
 */

// Constants
const MORSE_TIMING = {
    DOT_MULTIPLIER: 1,
    DASH_MULTIPLIER: 3,
    ELEMENT_PAUSE_MULTIPLIER: 1,
    CHARACTER_PAUSE_MULTIPLIER: 3,
    WORD_PAUSE_MULTIPLIER: 7
};

const DEFAULT_SETTINGS = {
    WPM: 20,
    FREQUENCY: 600,
    VOLUME: 1.0,
    WAVEFORM: 'sine'
};

const PARIS_CONSTANT = 1.2; // Standard for WPM calculation

/**
 * Morse Code Sound Generator
 * Handles audio generation for Morse code using Web Audio API
 */
class MorseSound extends EventTarget {
    // Private fields
    #duration = 0.06; // dot length: 1wpm = 1.2s => 20wpm = 0.06s (PARIS standard)
    #context;
    #oscillator;
    #gainNode;
    #level = DEFAULT_SETTINGS.VOLUME;
    #frequency = DEFAULT_SETTINGS.FREQUENCY;
    #start;
    #stop;
    #isPlaying = false;
    #masterGain; // Master volume control

    // Morse code alphabet mapping
    static #MORSE_ALPHABET = new Map([
        // Letters
        ['a', '.-'], ['b', '-...'], ['c', '-.-.'], ['d', '-..'], ['e', '.'],
        ['f', '..-.'], ['g', '--.'], ['h', '....'], ['i', '..'], ['j', '.---'],
        ['k', '-.-'], ['l', '.-..'], ['m', '--'], ['n', '-.'], ['o', '---'],
        ['p', '.--.'], ['q', '--.-'], ['r', '.-.'], ['s', '...'], ['t', '-'],
        ['u', '..-'], ['v', '...-'], ['w', '.--'], ['x', '-..-'], ['y', '-.--'],
        ['z', '--..'],
        // Numbers
        ['1', '.----'], ['2', '..---'], ['3', '...--'], ['4', '....-'], ['5', '.....'],
        ['6', '-....'], ['7', '--...'], ['8', '---..'], ['9', '----.'], ['0', '-----'],
        // Special characters
        ['/', '-..-.'], ['?', '..--..'], ['=', '-...-'], ['@', '.--.-.'],
        // Space (word separator)
        [' ', '  ']
    ]);

    constructor(audioContext) {
        super(); // Call EventTarget constructor

        if (!audioContext) {
            throw new Error('AudioContext is required');
        }
        
        this.#context = audioContext;
        this.#initializeAudioNodes();
    }

    /**
     * Initialize Web Audio API nodes
     * @private
     */
    #initializeAudioNodes() {
        this.#oscillator = this.#context.createOscillator();
        this.#gainNode = this.#context.createGain();
        this.#masterGain = this.#context.createGain();

        // Set default values
        this.#oscillator.frequency.value = this.#frequency;
        this.#oscillator.type = DEFAULT_SETTINGS.WAVEFORM;

        // Connect audio nodes: oscillator -> gain (keying) -> masterGain (volume) -> destination
        this.#oscillator.connect(this.#gainNode);
        this.#gainNode.connect(this.#masterGain);
        this.#masterGain.connect(this.#context.destination);

        // Initialize timing
        this.#start = this.#context.currentTime;
        this.#stop = this.#start;
        this.#gainNode.gain.setValueAtTime(0, this.#start);
        this.#masterGain.gain.value = this.#level;

        this.#oscillator.onended = () => {
            this.#isPlaying = false;
            let event = new Event('ended');
            this.dispatchEvent(event);
        }
    }

    /**
     * Convert text to Morse code
     * @param {string} text - Text to convert
     * @returns {string} Morse code representation
     * @private
     */
    #textToMorseCode(text) {
        return [...text.toLowerCase()]
            .map(char => MorseSound.#MORSE_ALPHABET.get(char) || '')
            .filter(code => code !== '')
            .join(' ');
    }

    /**
     * Convert Morse code to audio timing
     * @param {string} morseCode - Morse code string
     * @private
     */
    #morseCodeToAudio(morseCode) {
        for (const symbol of morseCode) {
            switch (symbol) {
                case '.':
                    this.#playDot();
                    break;
                case '-':
                    this.#playDash();
                    break;
                case ' ':
                    this.#addCharacterPause();
                    break;
            }
        }
    }

    /**
     * Play a dot (short signal)
     * @private
     */
    #playDot() {
        this.#gainNode.gain.setValueAtTime(this.#level, this.#stop);
        this.#stop += this.#duration * MORSE_TIMING.DOT_MULTIPLIER;
        this.#gainNode.gain.setValueAtTime(0, this.#stop);
        this.#stop += this.#duration * MORSE_TIMING.ELEMENT_PAUSE_MULTIPLIER;
    }

    /**
     * Play a dash (long signal)
     * @private
     */
    #playDash() {
        this.#gainNode.gain.setValueAtTime(this.#level, this.#stop);
        this.#stop += this.#duration * MORSE_TIMING.DASH_MULTIPLIER;
        this.#gainNode.gain.setValueAtTime(0, this.#stop);
        this.#stop += this.#duration * MORSE_TIMING.ELEMENT_PAUSE_MULTIPLIER;
    }

    /**
     * Add pause between characters
     * @private
     */
    #addCharacterPause() {
        this.#stop += this.#duration * MORSE_TIMING.CHARACTER_PAUSE_MULTIPLIER;
    }

    /**
     * Play text as Morse code
     * @param {string} text - Text to play
     * @throws {Error} If already playing or invalid input
     */
    play(text) {
        if (this.#isPlaying) {
            throw new Error('Already playing. Stop current playback first.');
        }

        if (!text || typeof text !== 'string') {
            throw new Error('Valid text string is required');
        }

        try {
            const morseCode = this.#textToMorseCode(text);
            if (!morseCode) {
                throw new Error('No valid Morse code characters found in text');
            }

            this.#morseCodeToAudio(morseCode);
            this.#oscillator.start(this.#start);
            this.#oscillator.stop(this.#stop);
            this.#isPlaying = true;

            console.log(`Playing: ${text}`);
            console.log(`Morse: ${morseCode}`);
            console.log(`Duration: ${this.#start}s - ${this.#stop}s`);

        } catch (error) {
            this.#isPlaying = false;
            throw error;
        }
    }

    /**
     * Stop current playback
     */
    stop() {
        if (this.#oscillator && this.#isPlaying) {
            try {
                this.#oscillator.stop(this.#context.currentTime);
                this.#isPlaying = false;
            } catch (error) {
                console.warn('Error stopping oscillator:', error);
            }
        }
    }

    // Getters and setters
    get duration() { return this.#duration; }
    set duration(value) {
        if (value <= 0) throw new Error('Duration must be positive');
        this.#duration = value;
    }

    get wpm() { return PARIS_CONSTANT / this.#duration; }
    set wpm(value) {
        if (value <= 0) throw new Error('WPM must be positive');
        this.#duration = PARIS_CONSTANT / value;
    }

    get frequency() { return this.#frequency; }
    set frequency(value) {
        if (value <= 0) throw new Error('Frequency must be positive');
        this.#frequency = value;
        if (this.#oscillator) {
            this.#oscillator.frequency.value = value;
        }
    }

    get volume() { return this.#level; }
    set volume(value) {
        if (value < 0 || value > 1) throw new Error('Volume must be between 0 and 1');
        this.#level = value;
        if (this.#masterGain) {
            this.#masterGain.gain.value = value;
        }
    }

    get type() { return this.#oscillator?.type || DEFAULT_SETTINGS.WAVEFORM; }
    set type(value) {
        const validTypes = ['sine', 'square', 'sawtooth', 'triangle'];
        if (!validTypes.includes(value)) {
            throw new Error(`Invalid waveform type. Must be one of: ${validTypes.join(', ')}`);
        }
        if (this.#oscillator) {
            this.#oscillator.type = value;
        }
    }

    get isPlaying() { return this.#isPlaying; }
}

/**
 * QSO Message Generator
 * Generates random QSO (contact) messages for practice
 */
class QSOGenerator {
    #operator;
    #messageTemplates;

    constructor(operator = null) {
        this.#operator = operator || {
            call: 'R1TBJ',
            name: 'Kostya',
            qth: 'Pestovo'
        };

        this.#messageTemplates = [
            'VVV = UB1TAC DE {call} GM DR OP TNX FER CALL UR RST IS 599 5NN MY NAME IS {name} MY QTH IS {qth} HW? BK',
            'CQ CQ CQ DE {call} {call} {call} PSE K',
            '{call} DE UB1TAC TNX FER QSO UR RST 599 NAME {name} QTH {qth} BK',
            'UB1TAC DE {call} R R TNX FB QSO 73 ES CUL SK'
        ];
    }

    /**
     * Generate a random QSO message
     * @returns {string} Random QSO message
     */
    generateRandomMessage() {
        const template = this.#messageTemplates[
            Math.floor(Math.random() * this.#messageTemplates.length)
        ];
        
        return template
            .replace(/{call}/g, this.#operator.call)
            .replace(/{name}/g, this.#operator.name)
            .replace(/{qth}/g, this.#operator.qth);
    }

    // Getters and setters for operator info
    get call() { return this.#operator.call; }
    set call(value) {
        if (!value || typeof value !== 'string') {
            throw new Error('Call sign must be a non-empty string');
        }
        this.#operator.call = value.toUpperCase();
    }

    get name() { return this.#operator.name; }
    set name(value) {
        if (!value || typeof value !== 'string') {
            throw new Error('Name must be a non-empty string');
        }
        this.#operator.name = value;
    }

    get qth() { return this.#operator.qth; }
    set qth(value) {
        if (!value || typeof value !== 'string') {
            throw new Error('QTH must be a non-empty string');
        }
        this.#operator.qth = value;
    }
}

/**
 * CW Trainer Application Controller
 * Main application class that coordinates the UI and audio components
 */
class CWTrainer {
    #audioContext;
    #morseSound;
    #qsoGenerator;
    #textArea;
    #playButton;
    #stopButton;

    constructor() {
        this.#initializeAudio();
        this.#initializeComponents();
        this.#initializeUI();
        this.#setupEventListeners();
    }

    /**
     * Initialize Web Audio API
     * @private
     */
    #initializeAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        
        if (!AudioContext) {
            throw new Error('Web Audio API is not supported in this browser');
        }

        this.#audioContext = new AudioContext();
    }

    /**
     * Initialize application components
     * @private
     */
    #initializeComponents() {
        this.#qsoGenerator = new QSOGenerator();
    }

    /**
     * Initialize UI elements
     * @private
     */
    #initializeUI() {
        this.#textArea = document.querySelector('textarea');
        this.#playButton = document.getElementById('play');
        this.#stopButton = document.getElementById('stop');

        if (!this.#textArea || !this.#playButton || !this.#stopButton) {
            throw new Error('Required UI elements not found');
        }

        // Set initial text
        this.#textArea.value = this.#qsoGenerator.generateRandomMessage();
    }

    /**
     * Setup event listeners
     * @private
     */
    #setupEventListeners() {
        this.#playButton.addEventListener('click', () => this.#handlePlay());
        this.#stopButton.addEventListener('click', () => this.#handleStop());

        // Volume slider
        const volumeSlider = document.querySelector('.volume');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => this.#handleVolumeChange(e));
        }

        // Handle audio context resume (required by some browsers)
        document.addEventListener('click', () => {
            if (this.#audioContext.state === 'suspended') {
                this.#audioContext.resume();
            }
        }, { once: true });
    }

    /**
     * Handle play button click
     * @private
     */
    #handlePlay() {
        try {
            // Prevent multiple simultaneous playbacks
            if (this.#morseSound?.isPlaying) {
                console.warn('Already playing. Stop current playback first.');
                return;
            }

            const text = this.#textArea.value.trim();
            if (!text) {
                alert('Please enter some text to play');
                return;
            }

            // Create new sound instance for each playback
            this.#morseSound = new MorseSound(this.#audioContext);
          
            // Apply default settings
            this.#morseSound.wpm = DEFAULT_SETTINGS.WPM;
            this.#morseSound.frequency = DEFAULT_SETTINGS.FREQUENCY;
            this.#morseSound.volume = DEFAULT_SETTINGS.VOLUME;

            console.log(`Settings: ${this.#morseSound.wpm} WPM, ${this.#morseSound.frequency} Hz`);
            
            this.#morseSound.play(text);
            
            // Update UI state onPlay
            this.#playButton.disabled = true;
            this.#stopButton.disabled = false;

            // Update UI state onEnded
            this.#morseSound.addEventListener('ended', () => {
                this.#playButton.disabled = false;
                this.#stopButton.disabled = true;
                console.log('ended');
            });           

        } catch (error) {
            console.error('Error playing Morse code:', error);
            alert(`Error: ${error.message}`);
            this.#playButton.disabled = false;
            this.#stopButton.disabled = true;
        }
    }

    /**
     * Handle stop button click
     * @private
     */
    #handleStop() {
        try {
            if (this.#morseSound) {
                this.#morseSound.stop();
            }
        } catch (error) {
            console.error('Error stopping playback:', error);
        }
    }

    /**
     * Handle volume slider change
     * @private
     */
    #handleVolumeChange(e) {
        const volume = parseFloat(e.target.value);
        if (this.#morseSound) {
            this.#morseSound.volume = volume;
        }
        DEFAULT_SETTINGS.VOLUME = volume;
    }

    /**
     * Generate new random message
     */
    generateNewMessage() {
        this.#textArea.value = this.#qsoGenerator.generateRandomMessage();
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return {
            wpm: this.#morseSound?.wpm || DEFAULT_SETTINGS.WPM,
            frequency: this.#morseSound?.frequency || DEFAULT_SETTINGS.FREQUENCY,
            volume: this.#morseSound?.volume || DEFAULT_SETTINGS.VOLUME,
            waveform: this.#morseSound?.type || DEFAULT_SETTINGS.WAVEFORM
        };
    }

    /**
     * Update settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        if (this.#morseSound) {
            if (settings.wpm !== undefined) this.#morseSound.wpm = settings.wpm;
            if (settings.frequency !== undefined) this.#morseSound.frequency = settings.frequency;
            if (settings.volume !== undefined) this.#morseSound.volume = settings.volume;
            if (settings.waveform !== undefined) this.#morseSound.type = settings.waveform;
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.cwTrainer = new CWTrainer();
        console.log('CW Trainer initialized successfully');
    } catch (error) {
        console.error('Failed to initialize CW Trainer:', error);
        alert(`Failed to initialize application: ${error.message}`);
    }
});