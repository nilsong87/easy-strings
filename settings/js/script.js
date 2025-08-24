// =============================================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// =============================================================================

// Constantes para configuração
const CONFIG = {
    DEFAULT_BPM: 120,
    DEFAULT_INSTRUMENT: 'guitar',
    NOTE_FREQUENCIES: {
        'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
        'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
        'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    },
    INSTRUMENT_TUNINGS: {
        guitar: ['E', 'A', 'D', 'G', 'B', 'E'],
        bass: ['E', 'A', 'D', 'G'],
        violin: ['G', 'D', 'A', 'E'],
        cello: ['C', 'G', 'D', 'A'],
        ukulele: ['G', 'C', 'E', 'A']
    },
    SCALES: {
        'C major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        'A minor': ['A', 'C', 'E'],
        'A minor pentatonic': ['A', 'C', 'D', 'E', 'G']
    },
    INTERVALS: {
        '2M': { name: '2ª Maior', freqs: [261.63, 293.66] },
        '3m': { name: '3ª Menor', freqs: [261.63, 311.13] },
        '5P': { name: '5ª Justa', freqs: [261.63, 392.00] },
        '7m': { name: '7ª Menor', freqs: [261.63, 466.16] }
    }
};

// Estado da aplicação
const AppState = {
    audioContext: null,
    currentInstrument: CONFIG.DEFAULT_INSTRUMENT,
    metronome: {
        isPlaying: false,
        intervalId: null
    },
    games: {
        noteIdentification: {
            score: 0,
            currentNote: ''
        },
        intervalTraining: {
            score: 0,
            currentInterval: ''
        },
        noteSequence: {
            currentSequence: [],
            userSequence: [],
            isPlaying: false
        }
    }
};

// =============================================================================
// FUNÇÕES AUXILIARES SEGURAS
// =============================================================================

// Função segura para verificar e adicionar event listeners
function safeAddEventListener(selector, event, handler) {
    const element = document.querySelector(selector);
    if (element && typeof handler === 'function') {
        element.addEventListener(event, handler);
        return true;
    }
    console.warn(`Não foi possível adicionar evento a: ${selector}`);
    return false;
}

// Função segura para inicializar componentes
function safeInitializeComponent(selector, initFunction) {
    const element = document.querySelector(selector);
    if (element && typeof initFunction === 'function') {
        try {
            initFunction();
            return true;
        } catch (error) {
            console.error(`Erro ao inicializar ${selector}:`, error);
        }
    }
    return false;
}

// Função para verificar se um elemento existe antes de manipulá-lo
function safeQuerySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Elemento não encontrado: ${selector}`);
    }
    return element;
}

// Função para debounce (evitar múltiplas execuções)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Função para throttle (limitar execuções por tempo)
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// =============================================================================
// MÓDULO DE ÁUDIO
// =============================================================================

function getAudioContext() {
    if (!AppState.audioContext) {
        AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return AppState.audioContext;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

    setTimeout(() => {
        oscillator.stop();
    }, duration * 1000);

    return oscillator;
}

function playMetronomeClick() {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;
    gainNode.gain.value = 0.1;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.05);

    setTimeout(() => {
        oscillator.stop();
    }, 50);

    // Feedback visual
    const toggleButton = document.getElementById('metronome-toggle');
    if (toggleButton) {
        toggleButton.classList.add('btn-danger');
        setTimeout(() => {
            toggleButton.classList.remove('btn-danger');
        }, 100);
    }
}

// =============================================================================
// MÓDULO DO BRAÇO (FRETBOARD)
// =============================================================================

function setupFretboard() {
    generateFretboard();

    // Configurar eventos dos botões de forma segura
    safeAddEventListener('#show-notes', 'click', toggleAllNotes);
    safeAddEventListener('#show-c-major', 'click', () => showScale('C major'));
    safeAddEventListener('#show-a-minor', 'click', () => showChord('A minor'));
    safeAddEventListener('#show-pentatonic', 'click', () => showScale('A minor pentatonic'));
    safeAddEventListener('#clear-board', 'click', clearFretboard);
    safeAddEventListener('#play-note', 'click', playCurrentNote);
    safeAddEventListener('#play-scale', 'click', playCurrentScale);
}

function generateFretboard() {
    const fretboard = document.getElementById('fretboard');
    if (!fretboard) return;
    
    fretboard.innerHTML = '';

    const strings = CONFIG.INSTRUMENT_TUNINGS[AppState.currentInstrument].length;
    const frets = 13; // 12 trastes + corda solta

    const openNotes = CONFIG.INSTRUMENT_TUNINGS[AppState.currentInstrument];
    const stringNames = [...openNotes].reverse(); // Inverter para exibição padrão (cordas graves em baixo)

    for (let i = 0; i < strings; i++) {
        const stringElement = document.createElement('div');
        stringElement.className = 'string';

        // Adicionar nome da corda
        const stringName = document.createElement('div');
        stringName.className = 'string-name';
        stringName.textContent = stringNames[i];
        stringElement.appendChild(stringName);

        for (let j = 0; j < frets; j++) {
            const fretElement = document.createElement('div');
            fretElement.className = 'fret';
            fretElement.dataset.string = i;
            fretElement.dataset.fret = j;

            // Adicionar marcadores de traste
            if (j === 3 || j === 5 || j === 7 || j === 9 || j === 15 || j === 17) {
                const fretMarker = document.createElement('div');
                fretMarker.className = 'fret-marker';
                fretElement.appendChild(fretMarker);
            }
            if (j === 12) {
                const fretMarker = document.createElement('div');
                fretMarker.className = 'fret-marker';
                const fretMarker2 = document.createElement('div');
                fretMarker2.className = 'fret-marker';
                fretMarker2.style.top = '60%';
                fretElement.appendChild(fretMarker);
                fretElement.appendChild(fretMarker2);
            }

            // Adicionar indicador de nota
            const noteElement = document.createElement('div');
            noteElement.className = 'note';
            noteElement.style.visibility = 'hidden'; // Oculto por padrão

            // Calcular nota com base na corda e posição do traste
            const note = calculateNote(openNotes[i], j);
            noteElement.textContent = note;
            noteElement.dataset.note = note;
            noteElement.dataset.frequency = calculateFrequency(note, j);

            // Adicionar evento de clique para mostrar informações da nota
            noteElement.addEventListener('click', handleNoteClick);

            fretElement.appendChild(noteElement);
            stringElement.appendChild(fretElement);
        }

        fretboard.appendChild(stringElement);
    }
}

function calculateNote(openNote, fret) {
    const notes = Object.keys(CONFIG.NOTE_FREQUENCIES);
    const openIndex = notes.indexOf(openNote);
    const noteIndex = (openIndex + fret) % 12;
    return notes[noteIndex];
}

function calculateFrequency(note, fret) {
    const baseFrequency = CONFIG.NOTE_FREQUENCIES[note.replace(/\d/g, '')];
    const octave = 4 + Math.floor(fret / 12);
    return baseFrequency * Math.pow(2, octave - 4);
}

function handleNoteClick() {
    const currentNoteElement = document.getElementById('current-note');
    if (currentNoteElement) {
        currentNoteElement.textContent = `Nota: ${this.dataset.note}`;
    }

    // Remover classe ativa de todas as notas
    document.querySelectorAll('.note.active').forEach(note => {
        note.classList.remove('active');
    });

    // Adicionar classe ativa à nota clicada
    this.classList.add('active');

    // Tocar a nota
    const frequency = parseFloat(this.dataset.frequency);
    if (!isNaN(frequency)) {
        playTone(frequency, 0.5);
    }
}

function toggleAllNotes() {
    const notes = document.querySelectorAll('.note');
    if (notes.length === 0) return;
    
    const isVisible = notes[0].style.visibility === 'visible';

    notes.forEach(note => {
        note.style.visibility = isVisible ? 'hidden' : 'visible';
    });
}

function showScale(scaleName) {
    const scaleNotes = CONFIG.SCALES[scaleName];
    if (scaleNotes) {
        highlightNotes(scaleNotes);
    }
}

function showChord(chordName) {
    const chordNotes = CONFIG.SCALES[chordName];
    if (chordNotes) {
        highlightNotes(chordNotes, true);
    }
}

function clearFretboard() {
    const notes = document.querySelectorAll('.note');
    notes.forEach(note => {
        note.classList.remove('active');
        note.classList.remove('root');
    });
}

function highlightNotes(notesToHighlight, markRoot = false) {
    clearFretboard();

    const allNotes = document.querySelectorAll('.note');
    allNotes.forEach(note => {
        if (notesToHighlight.includes(note.dataset.note)) {
            note.style.visibility = 'visible';
            note.classList.add('active');

            // Marcar nota raiz se especificado
            if (markRoot && note.dataset.note === notesToHighlight[0]) {
                note.classList.add('root');
            }
        }
    });
}

function playCurrentNote() {
    const activeNote = document.querySelector('.note.active');
    if (activeNote) {
        const frequency = parseFloat(activeNote.dataset.frequency);
        if (!isNaN(frequency)) {
            playTone(frequency, 0.5);
            simulateAudioVisualization();
        }
    } else {
        alert("Por favor, selecione uma nota no braço primeiro.");
    }
}

function playCurrentScale() {
    const activeNotes = document.querySelectorAll('.note.active');
    if (activeNotes.length > 0) {
        // Ordenar notas por corda e traste para tocar em ordem
        const sortedNotes = Array.from(activeNotes).sort((a, b) => {
            const aString = parseInt(a.parentElement.dataset.string);
            const bString = parseInt(b.parentElement.dataset.string);
            const aFret = parseInt(a.parentElement.dataset.fret);
            const bFret = parseInt(b.parentElement.dataset.fret);

            if (aString !== bString) return aString - bString;
            return aFret - bFret;
        });

        // Tocar cada nota com um atraso
        sortedNotes.forEach((note, index) => {
            setTimeout(() => {
                const frequency = parseFloat(note.dataset.frequency);
                if (!isNaN(frequency)) {
                    playTone(frequency, 0.3);
                    note.classList.add('note-playing');
                    setTimeout(() => note.classList.remove('note-playing'), 300);
                }
            }, index * 500);
        });

        simulateAudioVisualization();
    } else {
        alert("Por favor, selecione algumas notas no braço primeiro.");
    }
}

function simulateAudioVisualization() {
    const visualizer = document.getElementById('visualizer');
    if (!visualizer) return;
    
    visualizer.innerHTML = '';

    for (let i = 0; i < 50; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.left = (i * 8) + 'px';
        bar.style.height = (Math.random() * 80 + 20) + 'px';
        visualizer.appendChild(bar);
    }

    // Limpar visualização após 3 segundos
    setTimeout(() => {
        if (visualizer) {
            visualizer.innerHTML = '';
        }
    }, 3000);
}

// =============================================================================
// MÓDULO DE NAVEGAÇÃO
// =============================================================================

function setupBackToTop() {
    const backToTopButton = document.querySelector('.back-to-top');
    if (!backToTopButton) return;

    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 300) {
            backToTopButton.style.display = 'flex';
        } else {
            backToTopButton.style.display = 'none';
        }
    });

    backToTopButton.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =============================================================================
// MÓDULO DE QUIZ
// =============================================================================

function setupQuiz() {
    const options = document.querySelectorAll('.form-check-input');
    const submitButton = document.getElementById('quiz-submit');
    
    if (!options.length || !submitButton) return;
    
    options.forEach(option => {
        option.addEventListener('change', function() {
            options.forEach(opt => opt.parentElement.classList.remove('selected'));
            if (this.checked) {
                this.parentElement.classList.add('selected');
            }
        });
    });

    submitButton.addEventListener('click', function() {
        const selected = document.querySelector('.form-check-input:checked');
        const feedback = document.getElementById('quiz-feedback');

        if (feedback) {
            if (selected) {
                if (selected.value === '7') {
                    feedback.innerHTML = '<div class="alert alert-success">Resposta correta! Uma escala maior possui 7 notas.</div>';
                } else {
                    feedback.innerHTML = '<div class="alert alert-danger">Resposta incorreta. Tente novamente.</div>';
                }
            } else {
                feedback.innerHTML = '<div class="alert alert-warning">Por favor, selecione uma resposta.</div>';
            }
        }
    });
}

// =============================================================================
// MÓDULO DO METRÔNOMO
// =============================================================================

function setupMetronome() {
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const toggleButton = document.getElementById('metronome-toggle');
    
    if (!bpmSlider || !bpmDisplay || !toggleButton) return;

    bpmSlider.addEventListener('input', function() {
        bpmDisplay.textContent = `${this.value} BPM`;
        if (AppState.metronome.isPlaying) {
            clearInterval(AppState.metronome.intervalId);
            startMetronome(this.value);
        }
    });

    toggleButton.addEventListener('click', function () {
        if (AppState.metronome.isPlaying) {
            // Parar metrônomo
            clearInterval(AppState.metronome.intervalId);
            toggleButton.innerHTML = '<i class="fas fa-play me-2"></i>Iniciar';
            AppState.metronome.isPlaying = false;
        } else {
            // Iniciar metrônomo
            startMetronome(bpmSlider.value);
            toggleButton.innerHTML = '<i class="fas fa-stop me-2"></i>Parar';
            AppState.metronome.isPlaying = true;
        }
    });

    function startMetronome(bpm) {
        const interval = 60000 / bpm; // Converter BPM para milissegundos
        AppState.metronome.intervalId = setInterval(function () {
            playMetronomeClick();
        }, interval);
    }
}

// =============================================================================
// MÓDULO DE SELEÇÃO DE INSTRUMENTO
// =============================================================================

function setupInstrumentSelector() {
    const instrumentSelect = document.getElementById('instrument-select');
    const instrumentButtons = document.querySelectorAll('.instrument-btn');
    
    if (instrumentSelect) {
        instrumentSelect.addEventListener('change', function() {
            const instrument = this.value;
            changeInstrument(instrument);
        });
    }

    if (instrumentButtons.length) {
        instrumentButtons.forEach(button => {
            button.addEventListener('click', function() {
                instrumentButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const instrument = this.dataset.instrument;
                changeInstrument(instrument);
                if (instrumentSelect) {
                    instrumentSelect.value = instrument;
                }
            });
        });
    }
}

function changeInstrument(instrument) {
    AppState.currentInstrument = instrument;
    generateFretboard();
}

// =============================================================================
// MÓDULO DE GRADE RÍTMICA
// =============================================================================

function setupRhythmGrid() {
    const rhythmGrid = document.getElementById('rhythm-grid');
    const playRhythmBtn = document.getElementById('play-rhythm');
    const clearRhythmBtn = document.getElementById('clear-rhythm');
    
    if (!rhythmGrid || !playRhythmBtn || !clearRhythmBtn) return;
    
    rhythmGrid.innerHTML = '';

    // Criar 16 células para a grade rítmica
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.className = 'rhythm-cell';
        if (i % 4 === 0) {
            cell.classList.add('beat');
        }

        cell.addEventListener('click', function () {
            this.classList.toggle('active');
        });

        rhythmGrid.appendChild(cell);
    }

    // Configurar botão de reproduzir ritmo
    playRhythmBtn.addEventListener('click', playRhythmPattern);

    // Configurar botão de limpar ritmo
    clearRhythmBtn.addEventListener('click', clearRhythmPattern);
}

function playRhythmPattern() {
    const activeCells = document.querySelectorAll('.rhythm-cell.active');
    if (activeCells.length === 0) {
        alert("Por favor, crie um padrão rítmico clicando nas células.");
        return;
    }

    const bpmSlider = document.getElementById('bpm-slider');
    const bpm = bpmSlider ? parseInt(bpmSlider.value) : 120;
    const interval = 60000 / bpm / 4; // Intervalo de semicolcheia

    activeCells.forEach((cell, index) => {
        setTimeout(() => {
            cell.classList.add('note-playing');
            playMetronomeClick();
            setTimeout(() => cell.classList.remove('note-playing'), interval / 2);
        }, index * interval);
    });
}

function clearRhythmPattern() {
    const activeCells = document.querySelectorAll('.rhythm-cell.active');
    activeCells.forEach(cell => {
        cell.classList.remove('active');
    });
}

// =============================================================================
// MÓDULO DO CÍRCULO DE QUINTAS
// =============================================================================

function setupCircleOfFifths() {
    const circle = document.querySelector('.tone-circle');
    if (!circle) return;
    
    const notes = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Gb', 'C#', 'Db', 'G#', 'Ab', 'D#', 'Eb', 'A#', 'Bb', 'F'];

    // Position notes around the circle
    notes.forEach((note, index) => {
        const angle = (index * 30) * (Math.PI / 180); // Convert to radians
        const radius = 120; // Distance from center

        const noteElement = document.createElement('div');
        noteElement.className = 'circle-note';
        noteElement.textContent = note;
        noteElement.style.left = `calc(50% + ${radius * Math.cos(angle)}px)`;
        noteElement.style.top = `calc(50% + ${radius * Math.sin(angle)}px)`;
        noteElement.dataset.note = note;

        noteElement.addEventListener('click', function () {
            showKeySignatureAndScales(note);
        });

        circle.appendChild(noteElement);
    });

    // Função para mostrar a armadura de clave e escalas relacionadas
    function showKeySignatureAndScales(note) {
        const keySignatures = {
            'C': { major: 'C Maior', sharps: 0, flats: 0, relativeMinor: 'Am' },
            'G': { major: 'G Maior', sharps: 1, flats: 0, relativeMinor: 'Em' },
            'D': { major: 'D Maior', sharps: 2, flats: 0, relativeMinor: 'Bm' },
            'A': { major: 'A Maior', sharps: 3, flats: 0, relativeMinor: 'F#m' },
            'E': { major: 'E Maior', sharps: 4, flats: 0, relativeMinor: 'C#m' },
            'B': { major: 'B Maior', sharps: 5, flats: 0, relativeMinor: 'G#m' },
            'F#': { major: 'F# Maior', sharps: 6, flats: 0, relativeMinor: 'D#m' },
            'C#': { major: 'C# Maior', sharps: 7, flats: 0, relativeMinor: 'A#m' },
            'F': { major: 'F Maior', sharps: 0, flats: 1, relativeMinor: 'Dm' },
            'Bb': { major: 'Bb Maior', sharps: 0, flats: 2, relativeMinor: 'Gm' },
            'Eb': { major: 'Eb Maior', sharps: 0, flats: 3, relativeMinor: 'Cm' },
            'Ab': { major: 'Ab Maior', sharps: 0, flats: 4, relativeMinor: 'Fm' },
            'Db': { major: 'Db Maior', sharps: 0, flats: 5, relativeMinor: 'Bbm' },
            'Gb': { major: 'Gb Maior', sharps: 0, flats: 6, relativeMinor: 'Ebm' },
            'Cb': { major: 'Cb Maior', sharps: 0, flats: 7, relativeMinor: 'Abm' }
        };

        if (!keySignatures[note]) {
            alert(`Nota ${note} selecionada. Informações não disponíveis.`);
            return;
        }

        const keyInfo = keySignatures[note];

        let infoContent = `
        <h4>${keyInfo.major}</h4>
        <p><strong>Armadura de Clave:</strong> `;

        if (keyInfo.sharps > 0) {
            infoContent += `${keyInfo.sharps} sustenido(s)`;
        } else if (keyInfo.flats > 0) {
            infoContent += `${keyInfo.flats} bemol(is)`;
        } else {
            infoContent += "Nenhum acidente";
        }

        infoContent += `</p>
        <p><strong>Menor Relativa:</strong> ${keyInfo.relativeMinor}</p>
        <h5>Escala Maior:</h5>
        <p>${getMajorScale(note)}</p>
        <h5>Escala Menor Natural:</h5>
        <p>${getNaturalMinorScale(note)}</p>
        <h5>Acordes da Tonalidade:</h5>
        <p>${getChordsInKey(note)}</p>
    `;

        let infoModal = document.getElementById('circle-of-fifths-modal');
        if (!infoModal) {
            infoModal = document.createElement('div');
            infoModal.id = 'circle-of-fifths-modal';
            infoModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.3);
            z-index: 1050;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        `;
            document.body.appendChild(infoModal);
        }

        infoModal.innerHTML = infoContent;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Fechar';
        closeButton.style.cssText = `
        margin-top: 15px;
        padding: 8px 16px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
        closeButton.onclick = function () {
            document.body.removeChild(infoModal);
            const overlay = document.getElementById('modal-overlay');
            if (overlay) document.body.removeChild(overlay);
        };
        infoModal.appendChild(closeButton);

        let overlay = document.getElementById('modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1040;
        `;
            overlay.onclick = function () {
                document.body.removeChild(infoModal);
                document.body.removeChild(overlay);
            };
            document.body.appendChild(overlay);
        }
    }

    function getMajorScale(tonic) {
        const scalePattern = [0, 2, 4, 5, 7, 9, 11];
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const tonicIndex = notes.indexOf(tonic);
        if (tonicIndex === -1) return "Não disponível";

        const scale = scalePattern.map(interval =>
            notes[(tonicIndex + interval) % 12]
        );

        return scale.join(' - ');
    }

    function getNaturalMinorScale(tonic) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const tonicIndex = notes.indexOf(tonic);
        if (tonicIndex === -1) return "Não disponível";

        const minorTonicIndex = (tonicIndex + 9) % 12;
        const minorTonic = notes[minorTonicIndex];

        const scalePattern = [0, 2, 3, 5, 7, 8, 10];
        const scale = scalePattern.map(interval =>
            notes[(minorTonicIndex + interval) % 12]
        );

        return scale.join(' - ');
    }

    function getChordsInKey(tonic) {
        const chordQualities = ['Maior', 'Menor', 'Menor', 'Maior', 'Maior', 'Menor', 'Diminuto'];
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const tonicIndex = notes.indexOf(tonic);
        if (tonicIndex === -1) return "Não disponível";

        const intervals = [0, 2, 4, 5, 7, 9, 11];
        const chords = intervals.map((interval, i) => {
            const note = notes[(tonicIndex + interval) % 12];
            return `${note} ${chordQualities[i]}`;
        });

        return chords.join(', ');
    }

    const style = document.createElement('style');
    style.textContent = `
    .circle-note {
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .circle-note:hover {
        transform: scale(1.2);
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
    }
    
    #circle-of-fifths-modal h4 {
        color: #3498db;
        margin-bottom: 15px;
    }
    
    #circle-of-fifths-modal h5 {
        color: #2ecc71;
        margin-top: 15px;
        margin-bottom: 5px;
    }
    
    #circle-of-fifths-modal p {
        margin-bottom: 10px;
        line-height: 1.5;
    }
`;
    document.head.appendChild(style);
}

// =============================================================================
// MÓDULO DE SEQUÊNCIA DE NOTAS
// =============================================================================

function setupNoteSequence() {
    const sequenceNotes = document.querySelectorAll('.sequence-note');
    const playSequenceBtn = document.getElementById('play-sequence');
    const repeatSequenceBtn = document.getElementById('repeat-sequence');
    
    if (!sequenceNotes.length || !playSequenceBtn || !repeatSequenceBtn) return;

    sequenceNotes.forEach(note => {
        note.addEventListener('click', handleSequenceNoteClick);
    });

    playSequenceBtn.addEventListener('click', generateNewSequence);

    repeatSequenceBtn.addEventListener('click', function () {
        if (AppState.games.noteSequence.currentSequence.length > 0) {
            playSequence();
        } else {
            alert("Gere uma sequência primeiro.");
        }
    });
}

function handleSequenceNoteClick() {
    if (AppState.games.noteSequence.isPlaying) return;

    const noteValue = this.dataset.note;
    AppState.games.noteSequence.userSequence.push(noteValue);
    this.classList.add('note-playing');

    const frequency = calculateFrequency(noteValue, 0);
    if (!isNaN(frequency)) {
        playTone(frequency, 0.3);
    }

    setTimeout(() => {
        this.classList.remove('note-playing');
    }, 500);

    if (AppState.games.noteSequence.userSequence.length === AppState.games.noteSequence.currentSequence.length) {
        checkSequence();
    }
}

function generateNewSequence() {
    AppState.games.noteSequence.currentSequence = [];
    AppState.games.noteSequence.userSequence = [];

    const length = Math.floor(Math.random() * 4) + 4;
    for (let i = 0; i < length; i++) {
        const sequenceNotes = document.querySelectorAll('.sequence-note');
        if (sequenceNotes.length) {
            const randomNote = sequenceNotes[Math.floor(Math.random() * sequenceNotes.length)].dataset.note;
            AppState.games.noteSequence.currentSequence.push(randomNote);
        }
    }

    const currentSequenceElement = document.getElementById('current-sequence');
    if (currentSequenceElement) {
        currentSequenceElement.textContent = AppState.games.noteSequence.currentSequence.join(' - ');
    }
    playSequence();
}

function playSequence() {
    AppState.games.noteSequence.isPlaying = true;
    let i = 0;

    const playNextNote = () => {
        if (i < AppState.games.noteSequence.currentSequence.length) {
            const note = AppState.games.noteSequence.currentSequence[i];
            const noteElement = document.querySelector(`.sequence-note[data-note="${note}"]`);

            if (noteElement) {
                noteElement.classList.add('note-playing');

                const frequency = calculateFrequency(note, 0);
                if (!isNaN(frequency)) {
                    playTone(frequency, 0.3);
                }

                setTimeout(() => {
                    noteElement.classList.remove('note-playing');
                    i++;
                    setTimeout(playNextNote, 500);
                }, 500);
            } else {
                i++;
                setTimeout(playNextNote, 500);
            }
        } else {
            AppState.games.noteSequence.isPlaying = false;
            AppState.games.noteSequence.userSequence = [];
        }
    };

    playNextNote();
}

function checkSequence() {
    let correct = true;
    for (let i = 0; i < AppState.games.noteSequence.currentSequence.length; i++) {
        if (AppState.games.noteSequence.currentSequence[i] !== AppState.games.noteSequence.userSequence[i]) {
            correct = false;
            break;
        }
    }

    if (correct) {
        alert("Parabéns! Você reproduziu a sequência corretamente.");
    } else {
        alert("Sequência incorreta. Tente novamente.");
    }

    AppState.games.noteSequence.userSequence = [];
}

// =============================================================================
// MÓDULO DE TREINO DE INTERVALOS
// =============================================================================

function setupIntervalTraining() {
    const intervalOptions = document.querySelectorAll('.game-option');
    const playIntervalBtn = document.getElementById('play-interval');
    
    if (!intervalOptions.length || !playIntervalBtn) return;

    playIntervalBtn.addEventListener('click', function () {
        const intervals = Object.keys(CONFIG.INTERVALS);
        AppState.games.intervalTraining.currentInterval = intervals[Math.floor(Math.random() * intervals.length)];
        playInterval(AppState.games.intervalTraining.currentInterval);
    });

    intervalOptions.forEach(option => {
        option.addEventListener('click', function () {
            if (AppState.games.intervalTraining.currentInterval === '') {
                alert("Por favor, reproduza um intervalo primeiro.");
                return;
            }

            const selectedInterval = this.dataset.interval;
            const scoreElement = document.getElementById('interval-game-score');

            if (selectedInterval === AppState.games.intervalTraining.currentInterval) {
                alert("Correto! Você identificou o intervalo corretamente.");
                AppState.games.intervalTraining.score += 10;
            } else {
                alert(`Incorreto. O intervalo era ${CONFIG.INTERVALS[AppState.games.intervalTraining.currentInterval].name}.`);
                AppState.games.intervalTraining.score = Math.max(0, AppState.games.intervalTraining.score - 5);
            }

            if (scoreElement) {
                scoreElement.textContent = AppState.games.intervalTraining.score;
            }
            AppState.games.intervalTraining.currentInterval = '';
        });
    });
}

function playInterval(interval) {
    const audioContext = getAudioContext();
    const frequencies = CONFIG.INTERVALS[interval].freqs;

    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.type = 'sine';
    oscillator1.frequency.value = frequencies[0];
    oscillator2.type = 'sine';
    oscillator2.frequency.value = frequencies[1];
    gainNode.gain.value = 0.2;

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.start();
    oscillator2.start();

    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1.5);

    setTimeout(() => {
        oscillator1.stop();
        oscillator2.stop();
    }, 1500);
}

// =============================================================================
// MÓDULO DE DIAGRAMA DE ACORDES
// =============================================================================

function setupChordDiagram() {
    const chordSelect = document.getElementById('chord-select');
    const playChordBtn = document.getElementById('play-chord');
    
    if (!chordSelect || !playChordBtn) return;
    
    const chords = ['C', 'Cm', 'C7', 'Cmaj7', 'G', 'D', 'A', 'E'];
    chords.forEach(chord => {
        const option = document.createElement('option');
        option.value = chord;
        option.textContent = chord;
        chordSelect.appendChild(option);
    });

    chordSelect.addEventListener('change', function() {
        updateChordDiagram(this.value);
    });

    updateChordDiagram(chordSelect.value);

    playChordBtn.addEventListener('click', function() {
        const selectedChord = chordSelect.value;
        playChord(selectedChord);
    });
}

function updateChordDiagram(chord) {
    const chordDiagram = document.getElementById('chord-diagram');
    if (!chordDiagram) return;

    chordDiagram.innerHTML = '';

    const chordPositions = {
        'C': { frets: [0, 3, 2, 0, 1, 0], fingers: ['x', '3', '2', 'x', '1', 'x'] },
        'Cm': { frets: [0, 3, 3, 0, 1, 0], fingers: ['x', '3', '4', 'x', '1', 'x'] },
        'C7': { frets: [0, 3, 2, 3, 1, 0], fingers: ['x', '3', '2', '4', '1', 'x'] },
        'Cmaj7': { frets: [0, 3, 2, 0, 0, 0], fingers: ['x', '2', '3', 'x', 'x', '1'] },
        'G': { frets: [3, 2, 0, 0, 0, 3], fingers: ['2', '1', 'x', 'x', 'x', '3'] },
        'D': { frets: [2, 3, 2, 0, 0, 0], fingers: ['2', '3', '1', 'x', 'x', 'x'] },
        'A': { frets: [0, 0, 2, 2, 2, 0], fingers: ['x', 'x', '1', '2', '3', 'x'] },
        'E': { frets: [0, 2, 2, 1, 0, 0], fingers: ['x', '3', '4', '2', 'x', '1'] }
    };

    const chordConfig = chordPositions[chord] || chordPositions['C'];

    const container = document.createElement('div');
    container.className = 'chord-container';

    const neck = document.createElement('div');
    neck.className = 'neck';
    container.appendChild(neck);

    const neckWidth = 180;
    const neckHeight = 200;
    const stringSpacing = neckWidth / (6 - 1);
    const fretSpacing = neckHeight / 4;
    const fingerSize = 26;

    for (let i = 0; i < 6; i++) {
        const string = document.createElement('div');
        string.className = 'string';
        string.style.left = `${i * stringSpacing}px`;
        neck.appendChild(string);
    }

    for (let i = 0; i <= 4; i++) {
        const fret = document.createElement('div');
        fret.className = 'fret';
        fret.style.top = `${i * fretSpacing}px`;
        neck.appendChild(fret);
    }

    chordConfig.frets.forEach((fret, i) => {
        if (fret > 0) {
            const finger = document.createElement('div');
            finger.className = 'finger';
            finger.style.left = `${(i * stringSpacing) - (fingerSize / 2)}px`;
            finger.style.top = `${((fret - 1) * fretSpacing) + (fretSpacing / 2) - (fingerSize / 2)}px`;
            finger.textContent = chordConfig.fingers[i];
            neck.appendChild(finger);
        }
    });

    chordConfig.frets.forEach((fret, i) => {
        if (fret === 0 || chordConfig.fingers[i] === 'x') {
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.style.left = `${(i * stringSpacing) - 8}px`;
            marker.style.top = `-24px`;
            marker.textContent = fret === 0 ? 'O' : 'X';
            marker.style.background = fret === 0 ? '#27ae60' : '#e74c3c';
            container.appendChild(marker);
        }
    });

    const chordName = document.createElement('div');
    chordName.className = 'chord-name';
    chordName.textContent = chord;
    container.appendChild(chordName);

    chordDiagram.appendChild(container);
}

function playChord(chord) {
    const audioContext = getAudioContext();

    const chordFrequencies = {
        'C': [261.63, 329.63, 392.00],
        'Cm': [261.63, 311.13, 392.00],
        'C7': [261.63, 329.63, 392.00, 466.16],
        'Cmaj7': [261.63, 329.63, 392.00, 523.25],
        'G': [392.00, 493.88, 587.33],
        'D': [293.66, 369.99, 440.00],
        'A': [440.00, 554.37, 659.25],
        'E': [329.63, 415.30, 493.88]
    };

    const frequencies = chordFrequencies[chord] || chordFrequencies['C'];

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    gainNode.connect(audioContext.destination);

    frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        const delay = audioContext.createDelay();
        delay.delayTime.value = index * 0.05;
        
        oscillator.connect(delay);
        delay.connect(gainNode);
        
        oscillator.start();
        
        setTimeout(() => {
            oscillator.stop();
        }, 1500);
    });

    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1.5);
}

// =============================================================================
// MÓDULO GERADOR DE PROGRESSÕES
// =============================================================================

function setupProgressionGenerator() {
    const generateButton = document.getElementById('generate-progression');
    const styleSelect = document.getElementById('progression-style');
    const lengthSelect = document.getElementById('progression-length');
    
    if (!generateButton || !styleSelect || !lengthSelect) return;

    const styles = ['pop', 'rock', 'jazz', 'blues', 'classical'];
    const lengths = [4, 8, 12, 16];
    
    styles.forEach(style => {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        styleSelect.appendChild(option);
    });
    
    lengths.forEach(length => {
        const option = document.createElement('option');
        option.value = length;
        option.textContent = length + ' acordes';
        lengthSelect.appendChild(option);
    });

    generateButton.addEventListener('click', function() {
        const style = styleSelect.value;
        const length = parseInt(lengthSelect.value);
        
        const progression = generateChordProgression(style, length);
        
        const progressionDisplay = document.querySelector('.chord-progression');
        if (progressionDisplay) {
            progressionDisplay.textContent = progression.join(' - ');
        }
        
        addPlayProgressionButton(progression);
    });
}

function generateChordProgression(style, length) {
    const progressions = {
        pop: [
            ['C', 'G', 'Am', 'F'],
            ['C', 'Em', 'F', 'G'],
            ['Am', 'F', 'C', 'G'],
            ['C', 'F', 'Am', 'G']
        ],
        rock: [
            ['E', 'A', 'D', 'E'],
            ['A', 'D', 'E', 'A'],
            ['G', 'C', 'D', 'G'],
            ['E', 'D', 'A', 'E']
        ],
        jazz: [
            ['Dm7', 'G7', 'Cmaj7', 'Am7'],
            ['Em7', 'A7', 'Dmaj7', 'Bm7'],
            ['Cmaj7', 'Am7', 'Dm7', 'G7'],
            ['Fmaj7', 'Dm7', 'G7', 'C7']
        ],
        blues: [
            ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'],
            ['A7', 'D7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7']
        ],
        classical: [
            ['I', 'IV', 'V', 'I'],
            ['I', 'vi', 'IV', 'V'],
            ['ii', 'V', 'I', 'vi'],
            ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V']
        ]
    };

    const styleProgressions = progressions[style];
    const randomProgression = styleProgressions[Math.floor(Math.random() * styleProgressions.length)];

    if (randomProgression.length < length) {
        const repeatedProgression = [];
        for (let i = 0; i < length; i++) {
            repeatedProgression.push(randomProgression[i % randomProgression.length]);
        }
        return repeatedProgression;
    }

    if (randomProgression.length > length) {
        return randomProgression.slice(0, length);
    }

    return randomProgression;
}

function addPlayProgressionButton(progression) {
    const oldButton = document.getElementById('play-progression');
    if (oldButton) {
        oldButton.remove();
    }

    const progressionDisplay = document.querySelector('.progression-display');
    if (!progressionDisplay) return;
    
    const playButton = document.createElement('button');
    playButton.id = 'play-progression';
    playButton.className = 'btn btn-success mt-3';
    playButton.innerHTML = '<i class="fas fa-play me-2"></i>Tocar Progressão';
    
    playButton.addEventListener('click', function() {
        playChordProgression(progression);
    });

    progressionDisplay.appendChild(playButton);
}

function playChordProgression(progression) {
    const audioContext = getAudioContext();
    const bpm = 120;
    const chordDuration = 60 / bpm * 2;

    progression.forEach((chord, index) => {
        setTimeout(() => {
            playChord(chord);
            
            const progressionText = document.querySelector('.chord-progression');
            if (progressionText) {
                const chords = progressionText.textContent.split(' - ');
                chords[index] = `<strong>${chords[index]}</strong>`;
                progressionText.innerHTML = chords.join(' - ');
                
                setTimeout(() => {
                    progressionText.textContent = progression.join(' - ');
                }, chordDuration * 1000 / 2);
            }
            
        }, index * chordDuration * 1000);
    });
}

// =============================================================================
// MÓDULO DE IDENTIFICAÇÃO DE NOTAS
// =============================================================================

function setupNoteIdentificationGame() {
    const newNoteButton = document.getElementById('new-note');
    const scoreElement = document.getElementById('note-game-score');
    
    if (!newNoteButton || !scoreElement) return;

    AppState.games.noteIdentification.score = 0;
    scoreElement.textContent = '0';

    newNoteButton.addEventListener('click', generateNewNote);

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('note') && AppState.games.noteIdentification.currentNote !== '') {
            const selectedNote = e.target.dataset.note;
            
            if (selectedNote === AppState.games.noteIdentification.currentNote) {
                AppState.games.noteIdentification.score += 5;
                scoreElement.textContent = AppState.games.noteIdentification.score;
                
                showGameFeedback('Correto! +5 pontos', 'success');
                generateNewNote();
            } else {
                AppState.games.noteIdentification.score = Math.max(0, AppState.games.noteIdentification.score - 2);
                scoreElement.textContent = AppState.games.noteIdentification.score;
                
                showGameFeedback(`Incorreto. A nota era ${AppState.games.noteIdentification.currentNote}. -2 pontos`, 'error');
            }
        }
    });

    generateNewNote();
}

function generateNewNote() {
    const notes = Object.keys(CONFIG.NOTE_FREQUENCIES);
    AppState.games.noteIdentification.currentNote = notes[Math.floor(Math.random() * notes.length)];
    
    const noteToFindElement = document.getElementById('note-to-find');
    if (noteToFindElement) {
        noteToFindElement.textContent = AppState.games.noteIdentification.currentNote;
    }
}

function showGameFeedback(message, type) {
    const oldFeedback = document.getElementById('game-feedback');
    if (oldFeedback) {
        oldFeedback.remove();
    }

    const feedback = document.createElement('div');
    feedback.id = 'game-feedback';
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        border-radius: 10px;
        z-index: 1000;
        font-weight: bold;
    `;
    feedback.textContent = message;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        if (document.body.contains(feedback)) {
            document.body.removeChild(feedback);
        }
    }, 2000);
}

// =============================================================================
// MÓDULO DE REFERÊNCIAS DE AFINAÇÃO
// =============================================================================

function setupTuningReferences() {
    const tuningContainer = document.querySelector('.tuning-container');
    
    if (!tuningContainer) {
        console.warn('Elemento .tuning-container não encontrado no DOM');
        return;
    }
    
    tuningContainer.innerHTML = '';
    
    const tunings = {
        'Violão': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        'Baixo': ['E1', 'A1', 'D2', 'G2'],
        'Violino': ['G3', 'D4', 'A4', 'E5'],
        'Violoncelo': ['C2', 'G2', 'D3', 'A3'],
        'Ukulele': ['G4', 'C4', 'E4', 'A4']
    };

    Object.entries(tunings).forEach(([instrument, notes]) => {
        const instrumentSection = document.createElement('div');
        instrumentSection.className = 'tuning-section mb-4';
        instrumentSection.innerHTML = `<h5 class="mb-2">${instrument}</h5>`;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex flex-wrap gap-2';
        
        notes.forEach(note => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-primary btn-sm tuning-btn';
            button.textContent = note;
            button.dataset.note = note;
            
            button.addEventListener('click', function() {
                playTuningNote(note);
                
                this.classList.add('btn-primary');
                this.classList.remove('btn-outline-primary');
                
                setTimeout(() => {
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-outline-primary');
                }, 1000);
            });
            
            buttonContainer.appendChild(button);
        });
        
        instrumentSection.appendChild(buttonContainer);
        tuningContainer.appendChild(instrumentSection);
    });
}

function playTuningNote(note) {
    const noteFrequencies = {
        'E1': 41.20, 'A1': 55.00, 'D2': 73.42, 'G2': 98.00,
        'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00,
        'B3': 246.94, 'E4': 329.63, 'G4': 392.00, 'C4': 261.63,
        'E5': 659.25, 'A4': 440.00, 'D4': 293.66, 'C2': 65.41,
        'G5': 783.99, 'A3': 220.00
    };

     const frequency = noteFrequencies[note] || 440.00;
    playTone(frequency, 2, 'sine', 0.3);
}

// =============================================================================
// INICIALIZAÇÃO COMPLETA
// =============================================================================

// Função de inicialização estendida
function extendedInit() {
    setupResponsiveLayout();
    setupIntersectionObserver();
    setupAnimations();
    addVisualFeedback();
    setupDataPersistence();
    setupAccessibility();
    setupConnectionMonitoring();
    setupThemeManager();
    setupFormValidation();
    setupLazyLoading();
    
    if (!window.AudioContext && !window.webkitAudioContext) {
        showBrowserWarning();
    }
}

function safeExtendedInit() {
    try {
        extendedInit();
    } catch (error) {
        console.error('Erro na inicialização estendida:', error);
    }
}

function setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
        console.warn('IntersectionObserver não suportado neste navegador');
        return;
    }
    
    const lazyElements = document.querySelectorAll('[data-lazy]');
    if (lazyElements.length === 0) return;
    
    try {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-viewport');
                    if (entry.target.dataset.lazyLoad) {
                        loadLazyContent(entry.target);
                    }
                }
            });
        }, { threshold: 0.1 });

        lazyElements.forEach(el => {
            observer.observe(el);
        });
    } catch (error) {
        console.error('Erro no IntersectionObserver:', error);
    }
}

function loadLazyContent(element) {
    const src = element.dataset.lazyLoad;
    if (src && !element.dataset.loaded) {
        element.dataset.loaded = true;
        if (element.tagName === 'IMG') {
            element.src = src;
        }
    }
}

function setupConnectionMonitoring() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    function updateConnectionStatus() {
        const isOnline = navigator.onLine;
        
        if (isOnline) {
            statusElement.style.display = 'none';
        } else {
            statusElement.style.display = 'block';
            statusElement.textContent = '⚠️ Você está offline. Algumas funcionalidades podem não estar disponíveis.';
        }
        
        document.body.classList.toggle('offline', !isOnline);
    }

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
}

function setupResponsiveLayout() {
    function handleResize() {
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile-view', isMobile);
        
        if (isMobile) {
            adjustForMobile();
        } else {
            adjustForDesktop();
        }
    }

    window.addEventListener('resize', debounce(handleResize, 250));
    handleResize();
}

function adjustForMobile() {
    const complexElements = document.querySelectorAll('.desktop-only');
    complexElements.forEach(el => {
        el.style.display = 'none';
    });
    
    const touchElements = document.querySelectorAll('button, .btn, .note');
    touchElements.forEach(el => {
        el.style.minHeight = '44px';
        el.style.minWidth = '44px';
    });
}

function adjustForDesktop() {
    const complexElements = document.querySelectorAll('.desktop-only');
    complexElements.forEach(el => {
        el.style.display = '';
    });
}

function setupAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in');
    
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function addVisualFeedback() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('button, .btn, .note, .card')) {
            const element = e.target;
            element.classList.add('active-feedback');
            setTimeout(() => {
                element.classList.remove('active-feedback');
            }, 300);
        }
    });
}

function setupDataPersistence() {
    window.addEventListener('beforeunload', saveAppState);
    loadAppState();
}

function saveAppState() {
    try {
        const stateToSave = {
            currentInstrument: AppState.currentInstrument,
            games: AppState.games,
            metronome: {
                bpm: document.getElementById('bpm-slider')?.value || CONFIG.DEFAULT_BPM
            }
        };
        localStorage.setItem('musicTrainerState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Erro ao salvar estado:', error);
    }
}

function loadAppState() {
    try {
        const savedState = localStorage.getItem('musicTrainerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            if (state.currentInstrument) {
                AppState.currentInstrument = state.currentInstrument;
                const instrumentSelect = document.getElementById('instrument-select');
                if (instrumentSelect) instrumentSelect.value = state.currentInstrument;
                
                const instrumentBtn = document.querySelector(`.instrument-btn[data-instrument="${state.currentInstrument}"]`);
                if (instrumentBtn) {
                    document.querySelectorAll('.instrument-btn').forEach(btn => btn.classList.remove('active'));
                    instrumentBtn.classList.add('active');
                }
            }
            
            if (state.games) {
                Object.assign(AppState.games, state.games);
                
                const noteScore = document.getElementById('note-game-score');
                if (noteScore) noteScore.textContent = state.games.noteIdentification?.score || '0';
                
                const intervalScore = document.getElementById('interval-game-score');
                if (intervalScore) intervalScore.textContent = state.games.intervalTraining?.score || '0';
            }
            
            if (state.metronome?.bpm) {
                const bpmSlider = document.getElementById('bpm-slider');
                const bpmDisplay = document.getElementById('bpm-display');
                if (bpmSlider && bpmDisplay) {
                    bpmSlider.value = state.metronome.bpm;
                    bpmDisplay.textContent = `${state.metronome.bpm} BPM`;
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar estado:', error);
    }
}

function setupAccessibility() {
    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case ' ':
                const metronomeBtn = document.getElementById('metronome-toggle');
                if (metronomeBtn && document.activeElement !== metronomeBtn) {
                    e.preventDefault();
                    metronomeBtn.click();
                }
                break;
            case 'Escape':
                const modals = document.querySelectorAll('.modal, [role="dialog"]');
                modals.forEach(modal => {
                    if (modal.style.display !== 'none') {
                        modal.style.display = 'none';
                    }
                });
                break;
        }
    });
    
    const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusableElements.forEach(el => {
        el.addEventListener('focus', () => {
            el.classList.add('keyboard-focus');
        });
        el.addEventListener('blur', () => {
            el.classList.remove('keyboard-focus');
        });
    });
}

function setupThemeManager() {
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = prefersDarkScheme.matches ? 'dark' : 'light';
    const currentTheme = savedTheme || systemTheme;
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeToggle) {
        themeToggle.checked = currentTheme === 'dark';
        
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    
    prefersDarkScheme.addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}

function setupFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
}

function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            showValidationError(input, 'Este campo é obrigatório');
            isValid = false;
        } else {
            clearValidationError(input);
        }
        
        if (input.type === 'email' && input.value) {
            if (!isValidEmail(input.value)) {
                showValidationError(input, 'Por favor, insira um email válido');
                isValid = false;
            }
        }
    });
    
    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showValidationError(input, message) {
    clearValidationError(input);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'color: #e74c3c; font-size: 0.875rem; margin-top: 0.25rem;';
    
    input.parentNode.appendChild(errorDiv);
    input.classList.add('invalid');
}

function clearValidationError(input) {
    const errorDiv = input.parentNode.querySelector('.validation-error');
    if (errorDiv) {
        errorDiv.remove();
    }
    input.classList.remove('invalid');
}

function setupLazyLoading() {
    const lazyImages = [].slice.call(document.querySelectorAll('img.lazy'));
    
    if ('IntersectionObserver' in window) {
        const lazyImageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const lazyImage = entry.target;
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.remove('lazy');
                    lazyImageObserver.unobserve(lazyImage);
                }
            });
        });

        lazyImages.forEach(function(lazyImage) {
            lazyImageObserver.observe(lazyImage);
        });
    } else {
        lazyImages.forEach(function(lazyImage) {
            lazyImage.src = lazyImage.dataset.src;
        });
    }
}

function showBrowserWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff9800;
        color: white;
        padding: 10px;
        text-align: center;
        z-index: 9999;
    `;
    warning.innerHTML = `
        ⚠️ Seu navegador pode não suportar todas as funcionalidades de áudio. 
        Recomendamos usar Chrome, Firefox ou Edge para melhor experiência.
    `;
    document.body.appendChild(warning);
}

function checkBrowserCompatibility() {
    const isIE = /*@cc_on!@*/false || !!document.documentMode;
    const isOldFirefox = typeof InstallTrigger !== 'undefined' && parseFloat(navigator.userAgent.match(/Firefox\/([0-9]+\.)/)[1]) < 60;
    
    if (isIE || isOldFirefox) {
        showBrowserWarning('Seu navegador não é totalmente compatível. Recomendamos atualizar para uma versão mais recente.');
    }
}

// =============================================================================
// INICIALIZAÇÃO PRINCIPAL
// =============================================================================

function initApp() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }

    const modules = [
        { selector: '#fretboard', init: setupFretboard },
        { selector: '.back-to-top', init: setupBackToTop },
        { selector: '.quiz-option', init: setupQuiz },
        { selector: '#metronome-toggle', init: setupMetronome },
        { selector: '.instrument-btn', init: setupInstrumentSelector },
        { selector: '#rhythm-grid', init: setupRhythmGrid },
        { selector: '.tone-circle', init: setupCircleOfFifths },
        { selector: '.sequence-note', init: setupNoteSequence },
        { selector: '.game-option', init: setupIntervalTraining },
        { selector: '#chord-select', init: setupChordDiagram },
        { selector: '#generate-progression', init: setupProgressionGenerator },
        { selector: '#new-note', init: setupNoteIdentificationGame },
        { selector: '.tuning-container', init: setupTuningReferences }
    ];

    modules.forEach(module => {
        safeInitializeComponent(module.selector, module.init);
    });
    
    setTimeout(() => {
        const notes = document.querySelectorAll('.note');
        notes.forEach(note => {
            note.addEventListener('click', function() {
                const frequency = parseFloat(this.dataset.frequency);
                if (!isNaN(frequency)) {
                    playTone(frequency, 0.5);
                }
            });
        });
    }, 500);
}

// Inicialização quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        try {
            initApp();
            safeExtendedInit();
        } catch (error) {
            console.error('Erro na inicialização:', error);
        }
    });
} else {
    try {
        initApp();
        safeExtendedInit();
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
}

// Handler para erros não capturados
window.addEventListener('error', function(e) {
    console.error('Erro não tratado:', e.error);
    
    const errorDisplay = document.getElementById('error-display');
    if (!errorDisplay) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-display';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 9999;
            max-width: 300px;
        `;
        errorDiv.innerHTML = `
            <strong>Ocorreu um erro</strong>
            <p>Recarregue a página ou tente novamente mais tarde.</p>
            <button onclick="this.parentElement.style.display='none'" 
                    style="background: white; color: #e74c3c; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                Fechar
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Handler para erros não capturados em Promises
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promise rejeitada não tratada:', event.reason);
    event.preventDefault();
});

// Verificação de compatibilidade
checkBrowserCompatibility();