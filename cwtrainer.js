/*
    CW QSO trainer
*/
// Dash = 3 dots
// Pause between elements of a sign = 1 dot
// Pause between characters in a word = 3 dots
// Pause between words = 7 dots

// TODO добавить геттеры и сеттеры на регулирование громкости - #level
// TODO несколько рандомных вариантов текста
// TODO Проверка набранного текста
// TODO Регуляторы громкости, частоты, скорости
// TODO Блокировка срабатывания при повторном нажатии на старт

class Sound {
    #duration = 0.06; // dot length 1wpm = 1.2s => 20wpm = 0.06s (PARIS)
    #context;
    #oscillator;
    #gainNode;
    #level = 1; // volume level 1 = 100%
    #start;
    #stop;

    #abc = new Map([
        ["a", ".-"],
        ["b", "-..."],
        ["c", "-.-."],
        ["d", "-.."],
        ["e", "."],
        ["f", "..-."],
        ["g", "--."],
        ["h", "...."],
        ["i", ".."],
        ["j", ".---"],
        ["k", "-.-"],
        ["l", ".-.."],
        ["m", "--"],
        ["n", "-."],
        ["o", "---"],
        ["p", ".--."],
        ["q", "--.-"],
        ["r", ".-."],
        ["s", "..."],
        ["t", "-"],
        ["u", "..-"],
        ["v", "...-"],
        ["w", ".--"],
        ["x", "-..-"],
        ["y", "-.--"],
        ["z", "--.."],
        ["1", ".----"],
        ["2", "..---"],
        ["3", "...--"],
        ["4", "....-"],
        ["5", "....."],
        ["6", "-...."],
        ["7", "--..."],
        ["8", "---.."],
        ["9", "----."],
        ["0", "-----"],
        ["/", "-..-."],
        ["?", "..--.."],
        ["=", "=...="],
        [" ", "  "],
    ]);

    constructor(context) {
        this.#context = context;
        this.#oscillator = this.#context.createOscillator();
        this.#gainNode = this.#context.createGain();
        this.#oscillator.connect(this.#gainNode);
        this.#gainNode.connect(this.#context.destination);

        this.#start = this.#context.currentTime;
        this.#stop = this.#start;
        this.#gainNode.gain.setValueAtTime(0,this.#start);
    }
    
    #text2code(text) {
        let code = "";
        [...text].forEach((letter) => {
            if (this.#abc.has(letter.toLowerCase())) {
                code += this.#abc.get(letter.toLowerCase()) + " ";
            }
        });

        return code;
    }

    #code2sound(code) {
        [...code].forEach((letter) => {
            switch(letter) {
                case ".":
                    this.#gainNode.gain.setValueAtTime(1,this.#stop);
                    this.#stop += this.#duration;
                    this.#gainNode.gain.setValueAtTime(0,this.#stop);
                    this.#stop += this.#duration;
                    break;
                case "-":
                    this.#gainNode.gain.setValueAtTime(1,this.#stop);
                    this.#stop += this.#duration * 3;
                    this.#gainNode.gain.setValueAtTime(0,this.#stop);
                    this.#stop += this.#duration;                    
                    break;
                case " ":
                    this.#stop += 3 * this.#duration;
                    break;
            }            
        });
    }

    play(text) {
        let code = this.#text2code(text);
        this.#code2sound(code);
        this.#oscillator.start(this.#start);
        this.#oscillator.stop(this.#stop);
        console.log(this.#start + "s", this.#stop + "s");
    }

    stop() {
        this.#oscillator.stop(this.#context.currentTime);
    }

    set duration(value) {
        this.#duration = value;
    }

    get duration() {
        return this.#duration;
    }

    set wpm(value) {
        this.#duration = 1.2/value;
    }

    get wpm() {
        return 1.2/this.#duration;
    }

    set frequency(value) {
        this.#oscillator.frequency.value = value;
    }

    get frequency() {
        return this.#oscillator.frequency.value;
    }

    set type(value) {
        this.#oscillator.type = value;
    }

    get type() {
        return this.#oscillator.type;
    } 
}

let AudioContext = window.AudioContext || window.webkitAudioContext;
let context = new AudioContext();

let text = document.querySelector("textarea");
text.value = "GM DR OP TNX FER CALL UR RST IS 599 5NN MY NAME IS";
let sound;

let playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
    sound = new Sound(context);
    console.log(sound.wpm + "wpm");
    console.log(sound.frequency + "Hz");
    // console.log(sound.level);
    sound.play(text.value);
});

let stopButton = document.getElementById("stop");
stopButton.addEventListener("click", () => {
    if (sound instanceof Sound) sound.stop();
});