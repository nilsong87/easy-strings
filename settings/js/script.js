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

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Inicializar AOS para animações de scroll se disponível
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }

    // Configurar todos os módulos apenas se os elementos existirem
    try {
        if (document.getElementById('fretboard')) setupFretboard();
        if (document.querySelector('.back-to-top')) setupBackToTop();
        if (document.querySelector('.quiz-option')) setupQuiz();
        if (document.getElementById('metronome-toggle')) setupMetronome();
        if (document.querySelector('.instrument-btn')) setupInstrumentSelector();
        if (document.getElementById('rhythm-grid')) setupRhythmGrid();
        if (document.querySelector('.tone-circle')) setupCircleOfFifths();
        if (document.querySelector('.sequence-note')) setupNoteSequence();
        if (document.querySelector('.game-option')) setupIntervalTraining();
        if (document.getElementById('chord-select')) setupChordDiagram();
        if (document.getElementById('generate-progression')) setupProgressionGenerator();
        
        // Inicializar jogos
        if (document.getElementById('new-note')) setupNoteIdentificationGame();
        if (document.querySelector('.tuning-container')) setupTuningReferences();
        
        // Adicionar event listeners para tocar notas no braço
        document.querySelectorAll('.note').forEach(note => {
            note.addEventListener('click', function() {
                const frequency = parseFloat(this.dataset.frequency);
                if (!isNaN(frequency)) {
                    playTone(frequency, 0.5);
                }
            });
        });
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
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

    // Configurar eventos dos botões
    const showNotesBtn = document.getElementById('show-notes');
    const showCMajorBtn = document.getElementById('show-c-major');
    const showAMinorBtn = document.getElementById('show-a-minor');
    const showPentatonicBtn = document.getElementById('show-pentatonic');
    const clearBoardBtn = document.getElementById('clear-board');
    const playNoteBtn = document.getElementById('play-note');
    const playScaleBtn = document.getElementById('play-scale');

    if (showNotesBtn) showNotesBtn.addEventListener('click', toggleAllNotes);
    if (showCMajorBtn) showCMajorBtn.addEventListener('click', () => showScale('C major'));
    if (showAMinorBtn) showAMinorBtn.addEventListener('click', () => showChord('A minor'));
    if (showPentatonicBtn) showPentatonicBtn.addEventListener('click', () => showScale('A minor pentatonic'));
    if (clearBoardBtn) clearBoardBtn.addEventListener('click', clearFretboard);
    if (playNoteBtn) playNoteBtn.addEventListener('click', playCurrentNote);
    if (playScaleBtn) playScaleBtn.addEventListener('click', playCurrentScale);
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

    // Adicione também os botões visuais se ainda quiser mantê-los
    if (instrumentButtons.length) {
        instrumentButtons.forEach(button => {
            button.addEventListener('click', function() {
                instrumentButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const instrument = this.dataset.instrument;
                changeInstrument(instrument);
                // Sincronize com o select
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
        // Mapeamento de notas para armaduras de clave
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

        // Verificar se a nota existe no mapeamento
        if (!keySignatures[note]) {
            alert(`Nota ${note} selecionada. Informações não disponíveis.`);
            return;
        }

        const keyInfo = keySignatures[note];

        // Criar conteúdo informativo
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

        // Criar ou atualizar modal de informações
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

            const closeButton = document.createElement('button');
            closeButton.textContent = 'Fechar';
            closeButton.style.cssText = `
            margin-top: 15px;
            padding: 8px 16px;
            background: var(--primary);
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
            document.body.appendChild(infoModal);
        }

        infoModal.innerHTML = infoContent;

        // Adicionar botão de fechar
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Fechar';
        closeButton.style.cssText = `
        margin-top: 15px;
        padding: 8px 16px;
        background: var(--primary);
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

        // Adicionar overlay escuro
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

    // Função para obter a escala maior
    function getMajorScale(tonic) {
        const scalePattern = [0, 2, 4, 5, 7, 9, 11]; // T-T-S-T-T-T-S
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const tonicIndex = notes.indexOf(tonic);
        if (tonicIndex === -1) return "Não disponível";

        const scale = scalePattern.map(interval =>
            notes[(tonicIndex + interval) % 12]
        );

        return scale.join(' - ');
    }

    // Função para obter a escala menor natural
    function getNaturalMinorScale(tonic) {
        // Encontrar a menor relativa (3 semitons abaixo)
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const tonicIndex = notes.indexOf(tonic);
        if (tonicIndex === -1) return "Não disponível";

        const minorTonicIndex = (tonicIndex + 9) % 12; // 3 semitons acima = 9 semitons abaixo
        const minorTonic = notes[minorTonicIndex];

        const scalePattern = [0, 2, 3, 5, 7, 8, 10]; // T-S-T-T-S-T-T
        const scale = scalePattern.map(interval =>
            notes[(minorTonicIndex + interval) % 12]
        );

        return scale.join(' - ');
    }

    // Função para obter os acordes da tonalidade
    function getChordsInKey(tonic) {
        const chordQualities = ['Maior', 'Menor', 'Menor', 'Maior', 'Maior', 'Menor', 'Diminuto'];
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const tonicIndex = notes.indexOf(tonic);
        if (tonicIndex === -1) return "Não disponível";

        // Padrão de intervalos para escala maior
        const intervals = [0, 2, 4, 5, 7, 9, 11];
        const chords = intervals.map((interval, i) => {
            const note = notes[(tonicIndex + interval) % 12];
            return `${note} ${chordQualities[i]}`;
        });

        return chords.join(', ');
    }

    // Adicionar estilos CSS para o modal
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
        color: var(--primary);
        margin-bottom: 15px;
    }
    
    #circle-of-fifths-modal h5 {
        color: var(--secondary);
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

    // Adicionar evento de clique a cada nota
    sequenceNotes.forEach(note => {
        note.addEventListener('click', handleSequenceNoteClick);
    });

    // Configurar botão de reproduzir sequência
    playSequenceBtn.addEventListener('click', generateNewSequence);

    // Configurar botão de repetir sequência
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

    // Tocar a nota
    const frequency = calculateFrequency(noteValue, 0);
    if (!isNaN(frequency)) {
        playTone(frequency, 0.3);
    }

    setTimeout(() => {
        this.classList.remove('note-playing');
    }, 500);

    // Verificar se o usuário completou a sequência
    if (AppState.games.noteSequence.userSequence.length === AppState.games.noteSequence.currentSequence.length) {
        checkSequence();
    }
}

function generateNewSequence() {
    AppState.games.noteSequence.currentSequence = [];
    AppState.games.noteSequence.userSequence = [];

    // Gerar 4-7 notas aleatórias
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

                // Tocar a nota
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

    // Adicionar evento de clique ao botão de reproduzir intervalo
    playIntervalBtn.addEventListener('click', function () {
        // Selecionar um intervalo aleatório
        const intervals = Object.keys(CONFIG.INTERVALS);
        AppState.games.intervalTraining.currentInterval = intervals[Math.floor(Math.random() * intervals.length)];

        // Reproduzir o intervalo
        playInterval(AppState.games.intervalTraining.currentInterval);
    });

    // Adicionar evento de clique às opções de intervalo
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

    // Criar dois osciladores para as duas notas
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
    
    // Preencher o select com opções de acordes
    const chords = ['C', 'Cm', 'C7', 'Cmaj7', 'G', 'D', 'A', 'E'];
    chords.forEach(chord => {
        const option = document.createElement('option');
        option.value = chord;
        option.textContent = chord;
        chordSelect.appendChild(option);
    });

    // Atualizar diagrama de acorde quando a seleção mudar
    chordSelect.addEventListener('change', function() {
        updateChordDiagram(this.value);
    });

    // Atualização inicial
    updateChordDiagram(chordSelect.value);

    // Configurar botão de tocar acorde
    playChordBtn.addEventListener('click', function() {
        const selectedChord = chordSelect.value;
        playChord(selectedChord);
    });
}

function updateChordDiagram(chord) {
    const chordDiagram = document.getElementById('chord-diagram');
    if (!chordDiagram) return;

    chordDiagram.innerHTML = '';

    // -1 = X (muda), 0 = O (solta), >0 = número da casa (absoluto)
    const chordPositions = {
        // Acordes de C
                'C':      { frets: [-1, 3, 2, 0, 1, 0], fingers: ['', '3', '2', '', '1', ''], baseFret: 1 },
                'Cm':     { frets: [-1, 3, 5, 5, 4, 3], fingers: ['', '3', '4', '4', '2', '1'], baseFret: 3 },
                'C7':     { frets: [-1, 3, 2, 3, 1, 0], fingers: ['', '3', '2', '4', '1', ''], baseFret: 1 },
                'Cmaj7':  { frets: [-1, 3, 2, 0, 0, 0], fingers: ['', '2', '3', '', '', '1'], baseFret: 1 },
                'Cm7':    { frets: [-1, 3, 5, 3, 4, 3], fingers: ['', '1', '3', '1', '2', '1'], baseFret: 3 },
                'C#':     { frets: [-1, -1, 6, 6, 6, 4], fingers: ['', '', '2', '3', '4', '1'], baseFret: 4 },
                'C#m':    { frets: [-1, -1, 6, 6, 5, 4], fingers: ['', '', '3', '4', '2', '1'], baseFret: 4 },
                'C#7':    { frets: [-1, -1, 6, 6, 6, 7], fingers: ['', '', '1', '1', '1', '2'], baseFret: 4 },
                
                // Acordes de Db (mesmo que C#)
                'Db':     { frets: [-1, -1, 6, 6, 6, 4], fingers: ['', '', '2', '3', '4', '1'], baseFret: 4 },
                
                // Acordes de D
                'D':      { frets: [-1, -1, 0, 2, 3, 2], fingers: ['', '', '', '1', '3', '2'], baseFret: 1 },
                'Dm':     { frets: [-1, -1, 0, 2, 3, 1], fingers: ['', '', '', '2', '3', '1'], baseFret: 1 },
                'D7':     { frets: [-1, -1, 0, 2, 1, 2], fingers: ['', '', '', '2', '1', '3'], baseFret: 1 },
                'Dmaj7':  { frets: [-1, -1, 0, 2, 2, 2], fingers: ['', '', '', '1', '2', '3'], baseFret: 1 },
                'Dm7':    { frets: [-1, -1, 0, 2, 1, 1], fingers: ['', '', '', '3', '1', '2'], baseFret: 1 },
                'D#':     { frets: [-1, -1, 1, 3, 4, 3], fingers: ['', '', '1', '2', '4', '3'], baseFret: 1 },
                'D#m':    { frets: [-1, -1, 1, 3, 4, 2], fingers: ['', '', '1', '3', '4', '2'], baseFret: 1 },
                
                // Acordes de Eb (mesmo que D#)
                'Eb':     { frets: [-1, -1, 1, 3, 4, 3], fingers: ['', '', '1', '2', '4', '3'], baseFret: 1 },
                
                // Acordes de E
                'E':      { frets: [0, 2, 2, 1, 0, 0], fingers: ['', '3', '4', '2', '', ''], baseFret: 1 },
                'Em':     { frets: [0, 2, 2, 0, 0, 0], fingers: ['', '2', '3', '', '', ''], baseFret: 1 },
                'E7':     { frets: [0, 2, 0, 1, 0, 0], fingers: ['', '2', '', '1', '', ''], baseFret: 1 },
                'Emaj7':  { frets: [0, 2, 1, 1, 0, 0], fingers: ['', '3', '1', '2', '', ''], baseFret: 1 },
                'Em7':    { frets: [0, 2, 0, 0, 0, 0], fingers: ['', '2', '', '', '', ''], baseFret: 1 },
                
                // Acordes de F
                'F':      { frets: [1, 3, 3, 2, 1, 1], fingers: ['1', '3', '4', '2', '1', '1'], baseFret: 1 },
                'Fm':     { frets: [1, 3, 3, 1, 1, 1], fingers: ['1', '3', '4', '1', '1', '1'], baseFret: 1 },
                'F7':     { frets: [1, 3, 1, 2, 1, 1], fingers: ['1', '4', '2', '3', '1', '1'], baseFret: 1 },
                'Fmaj7':  { frets: [0, 3, 3, 2, 1, 0], fingers: ['', '3', '4', '2', '1', ''], baseFret: 1 },
                'Fm7':    { frets: [1, 3, 1, 1, 1, 1], fingers: ['1', '4', '2', '3', '1', '1'], baseFret: 1 },
                'F#':     { frets: [2, 4, 4, 3, 2, 2], fingers: ['1', '3', '4', '2', '1', '1'], baseFret: 2 },
                'F#m':    { frets: [2, 4, 4, 2, 2, 2], fingers: ['1', '3', '4', '1', '1', '1'], baseFret: 2 },
                'F#7':    { frets: [2, 4, 2, 3, 2, 2], fingers: ['1', '4', '2', '3', '1', '1'], baseFret: 2 },
                
                // Acordes de Gb (mesmo que F#)
                'Gb':     { frets: [2, 4, 4, 3, 2, 2], fingers: ['1', '3', '4', '2', '1', '1'], baseFret: 2 },
                
                // Acordes de G
                'G':      { frets: [3, 2, 0, 0, 0, 3], fingers: ['2', '1', '', '', '', '3'], baseFret: 1 },
                'Gm':     { frets: [3, 5, 5, 3, 3, 3], fingers: ['1', '3', '4', '1', '1', '1'], baseFret: 3 },
                'G7':     { frets: [3, 2, 0, 0, 0, 1], fingers: ['3', '2', '', '', '', '1'], baseFret: 1 },
                'Gmaj7':  { frets: [3, 2, 0, 0, 0, 2], fingers: ['3', '2', '', '', '', '1'], baseFret: 1 },
                'Gm7':    { frets: [3, 5, 3, 3, 3, 3], fingers: ['1', '4', '2', '3', '1', '1'], baseFret: 3 },
                'G#':     { frets: [4, 6, 6, 5, 4, 4], fingers: ['1', '3', '4', '2', '1', '1'], baseFret: 4 },
                'G#m':    { frets: [4, 6, 6, 4, 4, 4], fingers: ['1', '3', '4', '1', '1', '1'], baseFret: 4 },
                
                // Acordes de Ab (mesmo que G#)
                'Ab':     { frets: [4, 6, 6, 5, 4, 4], fingers: ['1', '3', '4', '2', '1', '1'], baseFret: 4 },
                
                // Acordes de A
                'A':      { frets: [0, 0, 2, 2, 2, 0], fingers: ['', '', '1', '2', '3', ''], baseFret: 1 },
                'Am':     { frets: [0, 0, 2, 2, 1, 0], fingers: ['', '', '2', '3', '1', ''], baseFret: 1 },
                'A7':     { frets: [0, 0, 2, 0, 2, 0], fingers: ['', '', '2', '', '3', ''], baseFret: 1 },
                'Amaj7':  { frets: [0, 0, 2, 1, 2, 0], fingers: ['', '', '3', '1', '2', ''], baseFret: 1 },
                'Am7':    { frets: [0, 0, 2, 0, 1, 0], fingers: ['', '', '3', '', '1', ''], baseFret: 1 },
                'A#':     { frets: [1, 1, 3, 3, 3, 1], fingers: ['1', '1', '2', '3', '4', '1'], baseFret: 1 },
                'A#m':    { frets: [1, 1, 3, 3, 2, 1], fingers: ['1', '1', '3', '4', '2', '1'], baseFret: 1 },
                
                // Acordes de Bb (mesmo que A#)
                'Bb':     { frets: [1, 1, 3, 3, 3, 1], fingers: ['1', '1', '2', '3', '4', '1'], baseFret: 1 },
                
                // Acordes de B
                'B':      { frets: [2, 2, 4, 4, 4, 2], fingers: ['1', '1', '2', '3', '4', '1'], baseFret: 1 },
                'Bm':     { frets: [2, 2, 4, 4, 3, 2], fingers: ['1', '1', '3', '4', '2', '1'], baseFret: 1 },
                'B7':     { frets: [2, 2, 4, 2, 4, 2], fingers: ['1', '1', '2', '1', '3', '1'], baseFret: 1 },
                'Bmaj7':  { frets: [2, 2, 4, 3, 4, 2], fingers: ['1', '1', '3', '2', '4', '1'], baseFret: 1 },
                'Bm7':    { frets: [2, 2, 4, 2, 3, 2], fingers: ['1', '1', '3', '1', '2', '1'], baseFret: 1 },
     };

    const cfg = chordPositions[chord] || chordPositions['C'];

    // ==== Cálculo da casa base (traste inicial mostrado) ====
    const usedFrets = cfg.frets.filter(f => typeof f === 'number' && f > 0);
    const minFret = usedFrets.length ? Math.min(...usedFrets) : 1;
    const maxFret = usedFrets.length ? Math.max(...usedFrets) : 1;

    // Casa base: 1 se estiver no 1º shape; senão, a menor casa usada.
    let baseFret = minFret > 1 ? minFret : 1;

    // Se o intervalo for grande (>4 casas), desliza para caber em 4 trastes
    const windowSize = 4;
    if (maxFret - baseFret + 1 > windowSize) {
        baseFret = maxFret - windowSize + 1;
    }

    // ==== Medidas do braço ====
    const neckWidth = 150;
    const neckHeight = 180;
    const stringCount = 6;
    const fretVisibleCount = 4;
    const stringSpacing = neckWidth / (stringCount - 1);
    const fretSpacing = neckHeight / fretVisibleCount;

    // ==== Construção ====
    const container = document.createElement('div');
    container.className = 'chord-container';

    const neck = document.createElement('div');
    neck.className = 'chord-neck';
    container.appendChild(neck);

    // Pestana (nut) ou rótulo da casa base
    if (baseFret === 1) {
        const nut = document.createElement('div');
        nut.className = 'chord-nut';
        neck.appendChild(nut);
    } else {
        const baseLabel = document.createElement('div');
        baseLabel.className = 'chord-basefret';
        baseLabel.textContent = `${baseFret}ª casa`;
        neck.appendChild(baseLabel);
    }

    // Trastes
    for (let i = 1; i <= fretVisibleCount; i++) {
        const fret = document.createElement('div');
        fret.className = 'chord-fret';
        fret.style.top = `${i * fretSpacing}px`;
        neck.appendChild(fret);
    }

    // Cordas
    for (let i = 0; i < stringCount; i++) {
        const string = document.createElement('div');
        string.className = 'chord-string';
        string.style.left = `${i * stringSpacing}px`;
        neck.appendChild(string);
    }

    // Dedos (centro da casa relativa à baseFret)
    cfg.frets.forEach((fret, i) => {
        if (fret > 0) {
            const rel = fret - baseFret + 0.5; // centro da casa
            if (rel >= 0 && rel <= fretVisibleCount) {
                const finger = document.createElement('div');
                finger.className = 'chord-finger';
                finger.style.left = `${i * stringSpacing}px`;
                finger.style.top = `${rel * fretSpacing}px`;
                finger.style.transform = 'translate(-50%, -50%)';
                finger.textContent = cfg.fingers?.[i] || '';
                neck.appendChild(finger);
            }
        }
    });

    // Marcadores O/X (O só faz sentido quando baseFret === 1)
    cfg.frets.forEach((fret, i) => {
        const showOpen = (fret === 0 && baseFret === 1);
        const showMuted = (fret === -1);
        if (showOpen || showMuted) {
            const marker = document.createElement('div');
            marker.className = 'chord-marker';
            marker.style.left = `${i * stringSpacing}px`;
            marker.style.top = `-12px`;
            marker.style.transform = 'translateX(-50%)';
            marker.textContent = showOpen ? 'O' : 'X';
            marker.classList.add(showOpen ? 'marker-open' : 'marker-muted');
            neck.appendChild(marker);
        }
    });

    // Nome e posição (mostra a casa base e, se útil, o alcance)
    const chordName = document.createElement('div');
    chordName.className = 'chord-name';
    chordName.textContent = chord;
    container.appendChild(chordName);

    const pos = document.createElement('div');
    pos.className = 'chord-position';
    if (usedFrets.length) {
        pos.textContent = baseFret === 1
            ? `Posição: 1ª casa`
            : `Posição: ${baseFret}ª casa (${minFret}–${maxFret})`;
    } else {
        pos.textContent = `Posição: 1ª casa`;
    }
    container.appendChild(pos);

    chordDiagram.appendChild(container);
}

document.addEventListener('DOMContentLoaded', () => {
    const chordSelect = document.getElementById('chord-select');
    if (chordSelect) {
        updateChordDiagram(chordSelect.value);
        chordSelect.addEventListener('change', (e) => updateChordDiagram(e.target.value));
    }
});


function playChord(chord) {
    const audioContext = getAudioContext();

    // Frequências dos acordes (em Hz)
    const chordFrequencies = {
        'C': [261.63, 329.63, 392.00],        // C, E, G
        'Cm': [261.63, 311.13, 392.00],       // C, D#, G
        'C7': [261.63, 329.63, 392.00, 466.16], // C, E, G, A#
        'Cmaj7': [261.63, 329.63, 392.00, 523.25], // C, E, G, B
        'G': [392.00, 493.88, 587.33],        // G, B, D
        'D': [293.66, 369.99, 440.00],        // D, F#, A
        'A': [440.00, 554.37, 659.25],        // A, C#, E
        'E': [329.63, 415.30, 493.88]         // E, G#, B
    };

    const frequencies = chordFrequencies[chord] || chordFrequencies['C'];

    // Criar ganho principal
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    gainNode.connect(audioContext.destination);

    // Criar osciladores para cada frequência do acorde
    frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        // Adicionar pequeno atraso para criar efeito de arpejo
        const delay = audioContext.createDelay();
        delay.delayTime.value = index * 0.05;
        
        oscillator.connect(delay);
        delay.connect(gainNode);
        
        oscillator.start();
        
        // Parar o oscilador após 1.5 segundos
        setTimeout(() => {
            oscillator.stop();
        }, 1500);
    });

    // Fade out suave
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

    // Preencher selects com opções
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
        
        // Gerar progressão com base no estilo e comprimento
        const progression = generateChordProgression(style, length);
        
        // Exibir progressão
        const progressionDisplay = document.querySelector('.chord-progression');
        if (progressionDisplay) {
            progressionDisplay.textContent = progression.join(' - ');
        }
        
        // Adicionar botão para tocar progressão
        addPlayProgressionButton(progression);
    });
}

function generateChordProgression(style, length) {
    // Progressões básicas para diferentes estilos
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

    // Selecionar uma progressão aleatória do estilo escolhido
    const styleProgressions = progressions[style];
    const randomProgression = styleProgressions[Math.floor(Math.random() * styleProgressions.length)];

    // Se a progressão selecionada for mais curta que a solicitada, repeti-la
    if (randomProgression.length < length) {
        const repeatedProgression = [];
        for (let i = 0; i < length; i++) {
            repeatedProgression.push(randomProgression[i % randomProgression.length]);
        }
        return repeatedProgression;
    }

    // Se a progressão selecionada for mais longa que a solicitada, truncá-la
    if (randomProgression.length > length) {
        return randomProgression.slice(0, length);
    }

    return randomProgression;
}

function addPlayProgressionButton(progression) {
    // Remover botão anterior se existir
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
    const bpm = 120; // Batidas por minuto
    const chordDuration = 60 / bpm * 2; // 2 batidas por acorde

    progression.forEach((chord, index) => {
        setTimeout(() => {
            playChord(chord);
            
            // Destacar o acorde atual na exibição
            const progressionText = document.querySelector('.chord-progression');
            if (progressionText) {
                const chords = progressionText.textContent.split(' - ');
                chords[index] = `<strong>${chords[index]}</strong>`;
                progressionText.innerHTML = chords.join(' - ');
                
                // Remover destaque após um tempo
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

    // Inicializar pontuação
    AppState.games.noteIdentification.score = 0;
    scoreElement.textContent = '0';

    newNoteButton.addEventListener('click', generateNewNote);

    // Adicionar event listener a todas as notas no braço
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('note') && AppState.games.noteIdentification.currentNote !== '') {
            const selectedNote = e.target.dataset.note;
            
            if (selectedNote === AppState.games.noteIdentification.currentNote) {
                // Resposta correta
                AppState.games.noteIdentification.score += 5;
                scoreElement.textContent = AppState.games.noteIdentification.score;
                
                // Feedback visual
                showGameFeedback('Correto! +5 pontos', 'success');
                generateNewNote();
            } else {
                // Resposta errada
                AppState.games.noteIdentification.score = Math.max(0, AppState.games.noteIdentification.score - 2);
                scoreElement.textContent = AppState.games.noteIdentification.score;
                
                // Feedback visual
                showGameFeedback(`Incorreto. A nota era ${AppState.games.noteIdentification.currentNote}. -2 pontos`, 'error');
            }
        }
    });

    // Iniciar com uma nota
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
    // Remover feedback anterior
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
    
    // Remover após 2 segundos
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
    
    // Verificar se o container existe antes de manipular
    if (!tuningContainer) {
        console.warn('Elemento .tuning-container não encontrado no DOM');
        return;
    }
    
    // Limpar container existente
    tuningContainer.innerHTML = '';
    
    // Afinações padrão para diferentes instrumentos
    const tunings = {
        'Violão': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        'Baixo': ['E1', 'A1', 'D2', 'G2'],
        'Violino': ['G3', 'D4', 'A4', 'E5'],
        'Violoncelo': ['C2', 'G2', 'D3', 'A3'],
        'Ukulele': ['G4', 'C4', 'E4', 'A4']
    };

    // Criar botões para cada nota de afinação
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
                
                // Feedback visual
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
    // Mapeamento de notas para frequências (em Hz)
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
// FUNÇÕES AUXILIARES E DE UTILIDADE
// =============================================================================

// Função para verificar se um elemento existe antes de manipulá-lo
function safeQuerySelector(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Elemento não encontrado: ${selector}`);
    }
    return element;
}

// Função para adicionar evento seguro (verifica se o elemento existe)
function addSafeEventListener(selector, event, handler) {
    const element = document.querySelector(selector);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Não foi possível adicionar evento: ${selector} não encontrado`);
    }
}

// Função para carregar componentes dinamicamente
function loadComponent(componentId, url) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            const element = document.getElementById(componentId);
            if (element) {
                element.innerHTML = html;
                // Re-inicializar componentes após carregamento
                initApp();
            }
        })
        .catch(error => {
            console.error(`Erro ao carregar componente ${componentId}:`, error);
        });
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
    }
}

// =============================================================================
// MANIPULAÇÃO DE ERROS GLOBAIS
// =============================================================================

// Capturar erros não tratados
window.addEventListener('error', function(e) {
    console.error('Erro não tratado:', e.error);
    
    // Exibir mensagem amigável para o usuário
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

// =============================================================================
// OTIMIZAÇÕES DE PERFORMANCE
// =============================================================================

// Observer para elementos que entram/saem da viewport
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-viewport');
                // Carregar recursos sob demanda
                if (entry.target.dataset.lazyLoad) {
                    loadLazyContent(entry.target);
                }
            }
        });
    }, { threshold: 0.1 });

    // Observar elementos com atributo data-lazy
    document.querySelectorAll('[data-lazy]').forEach(el => {
        observer.observe(el);
    });
}

function loadLazyContent(element) {
    const src = element.dataset.lazyLoad;
    if (src && !element.dataset.loaded) {
        element.dataset.loaded = true;
        // Carregar conteúdo lazy
        if (element.tagName === 'IMG') {
            element.src = src;
        }
    }
}

// =============================================================================
// RESPONSIVIDADE E AJUSTES DE LAYOUT
// =============================================================================

function setupResponsiveLayout() {
    // Ajustar layout baseado no tamanho da tela
    function handleResize() {
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile-view', isMobile);
        
        // Ajustes específicos para mobile
        if (isMobile) {
            adjustForMobile();
        } else {
            adjustForDesktop();
        }
    }

    // Debounce para redimensionamento
    window.addEventListener('resize', debounce(handleResize, 250));
    handleResize(); // Executar inicialmente
}

function adjustForMobile() {
    // Simplificar interface para mobile
    const complexElements = document.querySelectorAll('.desktop-only');
    complexElements.forEach(el => {
        el.style.display = 'none';
    });
    
    // Ajustar tamanho de botões para toque
    const touchElements = document.querySelectorAll('button, .btn, .note');
    touchElements.forEach(el => {
        el.style.minHeight = '44px';
        el.style.minWidth = '44px';
    });
}

function adjustForDesktop() {
    // Restaurar elementos ocultos no mobile
    const complexElements = document.querySelectorAll('.desktop-only');
    complexElements.forEach(el => {
        el.style.display = '';
    });
}

// =============================================================================
// ANIMAÇÕES E FEEDBACK VISUAL
// =============================================================================

function setupAnimations() {
    // Animações de entrada suave
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

// Feedback visual para interações
function addVisualFeedback() {
    // Feedback para cliques
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

// =============================================================================
// PERSISTÊNCIA DE DADOS (LOCALSTORAGE)
// =============================================================================

function setupDataPersistence() {
    // Salvar estado ao fechar/recarregar
    window.addEventListener('beforeunload', saveAppState);
    
    // Carregar estado salvo
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
            
            // Restaurar instrumento
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
            
            // Restaurar pontuações dos jogos
            if (state.games) {
                Object.assign(AppState.games, state.games);
                
                // Atualizar displays de pontuação
                const noteScore = document.getElementById('note-game-score');
                if (noteScore) noteScore.textContent = state.games.noteIdentification?.score || '0';
                
                const intervalScore = document.getElementById('interval-game-score');
                if (intervalScore) intervalScore.textContent = state.games.intervalTraining?.score || '0';
            }
            
            // Restaurar BPM do metrônomo
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

// =============================================================================
// ACESSIBILIDADE
// =============================================================================

function setupAccessibility() {
    // Suporte a navegação por teclado
    document.addEventListener('keydown', function(e) {
        // Atalhos de teclado
        switch(e.key) {
            case ' ': // Espaço - tocar/parar metrônomo
                const metronomeBtn = document.getElementById('metronome-toggle');
                if (metronomeBtn && document.activeElement !== metronomeBtn) {
                    e.preventDefault();
                    metronomeBtn.click();
                }
                break;
            case 'Escape': // ESC - fechar modais
                const modals = document.querySelectorAll('.modal, [role="dialog"]');
                modals.forEach(modal => {
                    if (modal.style.display !== 'none') {
                        modal.style.display = 'none';
                    }
                });
                break;
        }
    });
    
    // Melhorar foco visual
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

// =============================================================================
// INICIALIZAÇÃO COMPLETA
// =============================================================================

// Função de inicialização estendida
function extendedInit() {
    // Configurações adicionais
    setupResponsiveLayout();
    setupIntersectionObserver();
    setupAnimations();
    addVisualFeedback();
    setupDataPersistence();
    setupAccessibility();
    
    // Verificar suporte a Web Audio API
    if (!window.AudioContext && !window.webkitAudioContext) {
        showBrowserWarning();
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

// Adicionar inicialização estendida ao carregamento principal
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extendedInit);
} else {
    extendedInit();
}

// =============================================================================
// EXPORTAÇÃO PARA USO EXTERNO (se necessário)
// =============================================================================

// Tornar funções principais disponíveis globalmente
window.MusicTrainer = {
    playTone,
    playChord,
    generateFretboard,
    changeInstrument,
    startMetronome: function(bpm) {
        const bpmSlider = document.getElementById('bpm-slider');
        if (bpmSlider) {
            bpmSlider.value = bpm;
            document.getElementById('bpm-display').textContent = `${bpm} BPM`;
            if (AppState.metronome.isPlaying) {
                clearInterval(AppState.metronome.intervalId);
                startMetronome(bpm);
            }
        }
    }
};

// =============================================================================
// POLYFILLS PARA COMPATIBILIDADE
// =============================================================================

// Polyfill para Element.closest()
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        var el = this;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

// Polyfill para NodeList.forEach()
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

// Polyfill para Element.matches()
if (!Element.prototype.matches) {
    Element.prototype.matches = 
        Element.prototype.matchesSelector || 
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector || 
        Element.prototype.oMatchesSelector || 
        Element.prototype.webkitMatchesSelector ||
        function(s) {
            var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;            
        };
}

// Polyfill para Object.assign (para navegadores mais antigos)
if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
        'use strict';
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);
        
        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];
            
            if (nextSource != null) {
                for (var nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}


// =============================================================================
// OTIMIZAÇÕES DE PERFORMANCE AVANÇADAS
// =============================================================================

// Pré-carregar recursos críticos
function preloadCriticalResources() {
    const resources = [
        // Adicione URLs de recursos críticos aqui
    ];
    
    resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = 'script'; // ou 'style', 'font', etc.
        document.head.appendChild(link);
    });
}

// Lazy loading para imagens não críticas
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
        // Fallback para navegadores sem Intersection Observer
        lazyImages.forEach(function(lazyImage) {
            lazyImage.src = lazyImage.dataset.src;
        });
    }
}

// =============================================================================
// ANÁLISE E MONITORAMENTO
// =============================================================================

// Funções simples de analytics
const Analytics = {
    trackEvent: function(category, action, label) {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
        console.log(`Event tracked: ${category} - ${action} - ${label}`);
    },
    
    trackPageView: function(pageName) {
        if (typeof gtag !== 'undefined') {
            gtag('config', 'GA_MEASUREMENT_ID', {
                'page_title': pageName,
                'page_location': window.location.href
            });
        }
        console.log(`Page view: ${pageName}`);
    }
};

// =============================================================================
// INTERNACIONALIZAÇÃO (i18n)
// =============================================================================

// Sistema simples de internacionalização
const I18n = {
    currentLanguage: 'pt-BR',
    translations: {
        'pt-BR': {
            'play': 'Tocar',
            'stop': 'Parar',
            'note': 'Nota',
            'scale': 'Escala',
            'chord': 'Acorde'
            // Adicione mais traduções aqui
        },
        'en-US': {
            'play': 'Play',
            'stop': 'Stop',
            'note': 'Note',
            'scale': 'Scale',
            'chord': 'Chord'
        }
    },
    
    t: function(key) {
        return this.translations[this.currentLanguage][key] || key;
    },
    
    setLanguage: function(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            this.updateUI();
        }
    },
    
    updateUI: function() {
        // Atualizar todos os elementos com data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
        
        // Atualizar placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
    }
};

// =============================================================================
// GERENCIAMENTO DE TEMA
// =============================================================================

function setupThemeManager() {
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Carregar tema salvo ou usar preferência do sistema
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
    
    // Observar mudanças na preferência do sistema
    prefersDarkScheme.addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}

// =============================================================================
// VALIDAÇÃO DE FORMULÁRIOS
// =============================================================================

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
        
        // Validações específicas por tipo
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

// =============================================================================
// UTILITÁRIOS DE ÁUDIO AVANÇADOS
// =============================================================================

// Analisador de espectro para visualização de áudio
function setupAudioAnalyzer() {
    const audioContext = getAudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    return {
        analyser,
        connectToSource: function(source) {
            source.connect(analyser);
            return analyser;
        },
        getFrequencyData: function() {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            return dataArray;
        },
        getWaveformData: function() {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);
            return dataArray;
        }
    };
}

// Gerador de ruído para testes de áudio
function generateNoise(type = 'white', duration = 1.0) {
    const audioContext = getAudioContext();
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
        if (type === 'white') {
            output[i] = Math.random() * 2 - 1;
        } else if (type === 'pink') {
            // Algoritmo de ruído rosa
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // Ajuste de ganho
        } else if (type === 'brown') {
            // Algoritmo de ruído marrom
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 6.0; // Ajuste de ganho
        }
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    
    const gainNode = audioContext.createGain();
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start();
    
    // Parar após a duração especificada
    setTimeout(() => {
        source.stop();
    }, duration * 1000);
    
    return {
        source,
        gainNode,
        stop: function() {
            source.stop();
        }
    };
}

// =============================================================================
// EXPORTAÇÕES FINAIS E INICIALIZAÇÃO
// =============================================================================

// Exportar utilitários globais
window.AppUtils = {
    debounce,
    throttle,
    Analytics,
    I18n,
    generateNoise,
    setupAudioAnalyzer
};

// Inicialização final quando tudo estiver carregado
window.addEventListener('load', function() {
    console.log('Music Trainer totalmente carregado e inicializado');
    
    // Rastrear página inicial
    Analytics.trackPageView('Página Inicial');
    
    // Verificar performance
    if ('performance' in window) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Tempo de carregamento: ${loadTime}ms`);
        
        if (loadTime > 3000) {
            console.warn('Tempo de carregamento lento. Considere otimizar recursos.');
        }
    }
});

// Handler para erros não capturados em Promises
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promise rejeitada não tratada:', event.reason);
    event.preventDefault();
});

// =============================================================================
// FALLBACKS PARA NAVEGADORES ANTIGOS
// =============================================================================

// Verificar e avisar sobre navegadores desatualizados
function checkBrowserCompatibility() {
    const isIE = /*@cc_on!@*/false || !!document.documentMode;
    const isOldFirefox = typeof InstallTrigger !== 'undefined' && parseFloat(navigator.userAgent.match(/Firefox\/([0-9]+\.)/)[1]) < 60;
    
    if (isIE || isOldFirefox) {
        showBrowserWarning('Seu navegador não é totalmente compatível. Recomendamos atualizar para uma versão mais recente.');
    }
}

function showBrowserWarning(message) {
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
        z-index: 10000;
        font-weight: bold;
    `;
    warning.textContent = message;
    document.body.appendChild(warning);
}

// Executar verificação de compatibilidade
checkBrowserCompatibility();