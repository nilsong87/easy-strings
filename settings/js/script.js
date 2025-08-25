// Configuração do sintetizador de áudio
        const synth = new Tone.Synth().toDestination();
        
        // Dados das notas musicais
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const guitarTuning = ["E2", "A2", "D3", "G3", "B3", "E4"];
        const bassTuning = ["E1", "A1", "D2", "G2"];
        
        // Gerar o braço da guitarra
        function generateGuitarNeck() {
            const neck = document.getElementById("guitar-neck");
            neck.innerHTML = "";
            
            // Criar 6 cordas (de E grave para E agudo)
            for (let string = 0; string < 6; string++) {
                const stringDiv = document.createElement("div");
                stringDiv.className = "string";
                
                // Adicionar 12 trastes (0-12)
                for (let fret = 0; fret <= 12; fret++) {
                    const fretDiv = document.createElement("div");
                    fretDiv.className = "fret";
                    
                    // Calcular a nota com base na afinação e casa
                    const baseNoteIndex = notes.indexOf(guitarTuning[string].charAt(0));
                    const noteIndex = (baseNoteIndex + fret) % 12;
                    const note = notes[noteIndex];
                    
                    const noteDiv = document.createElement("div");
                    noteDiv.className = "note";
                    noteDiv.textContent = note;
                    noteDiv.dataset.note = note + (parseInt(guitarTuning[string].charAt(1)) + Math.floor((baseNoteIndex + fret) / 12));
                    
                    noteDiv.addEventListener("click", function() {
                        playNote(this.dataset.note);
                    });
                    
                    fretDiv.appendChild(noteDiv);
                    stringDiv.appendChild(fretDiv);
                }
                
                neck.appendChild(stringDiv);
            }
        }
        
        // Tocar uma nota
        function playNote(note) {
            // Converter o nome da nota para frequência (ex: "C4")
            synth.triggerAttackRelease(note, "8n");
        }
        
        // Gerar a escala de C maior
        function generateCMajorScale() {
            const scaleContainer = document.getElementById("c-major-scale");
            scaleContainer.innerHTML = "";
            
            const cMajorNotes = ["C", "D", "E", "F", "G", "A", "B"];
            
            cMajorNotes.forEach(note => {
                const noteDiv = document.createElement("div");
                noteDiv.className = "note m-1";
                noteDiv.textContent = note;
                noteDiv.dataset.note = note + "4";
                
                noteDiv.addEventListener("click", function() {
                    playNote(this.dataset.note);
                });
                
                scaleContainer.appendChild(noteDiv);
            });
        }
        
        // Gerar os acordes do campo harmônico
        function generateChordProgression(key) {
            const chordCards = document.getElementById("chord-cards");
            chordCards.innerHTML = "";
            
            // Relativos do campo harmônico maior
            const majorScaleIntervals = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
            const chordTypes = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
            const chordFunctions = ["Tônica", "Supertonica", "Mediante", "Subdominante", "Dominante", "Superdominante", "Sensible"];
            
            // Encontrar o índice da tonalidade selecionada
            const keyIndex = notes.indexOf(key);
            
            majorScaleIntervals.forEach((interval, index) => {
                // Calcular a nota do acorde
                const noteIndex = (keyIndex + index) % 12;
                const note = notes[noteIndex];
                
                const col = document.createElement("div");
                col.className = "col-md-4 mb-3";
                
                col.innerHTML = `
                    <div class="bg-dark bg-opacity-50 p-3 rounded text-center">
                        <h5>${interval}</h5>
                        <div class="chord-name display-6">${note}${chordTypes[index]}</div>
                        <p class="mb-2">${chordFunctions[index]}</p>
                        <button class="btn btn-sm btn-outline-light play-chord-btn" data-chord="${note}${chordTypes[index]}">Ouvir</button>
                    </div>
                `;
                
                chordCards.appendChild(col);
            });
            
            // Adicionar event listeners aos botões de tocar acorde
            document.querySelectorAll(".play-chord-btn").forEach(btn => {
                btn.addEventListener("click", function() {
                    playChord(this.dataset.chord);
                });
            });
        }
        
        // Tocar um acorde (simplificado)
        function playChord(chord) {
            // Em uma implementação real, tocaríamos várias notas simultaneamente
            // Aqui estamos apenas tocando a nota fundamental por simplicidade
            const rootNote = chord.match(/[A-G]#?/)[0] + "4";
            playNote(rootNote);
        }
        
        // Configuração do metrônomo
        let metronomeInterval;
        let isMetronomePlaying = false;
        let bpm = 120;
        
        function updateMetronome() {
            document.getElementById("bpm-display").textContent = `${bpm} BPM`;
            document.getElementById("bpm-slider").value = bpm;
            
            if (isMetronomePlaying) {
                // Parar o metrônomo atual
                clearInterval(metronomeInterval);
                
                // Iniciar um novo metrônomo com o BPM atualizado
                startMetronome();
            }
        }
        
        function startMetronome() {
            const intervalMs = (60 / bpm) * 1000;
            let beat = 0;
            
            metronomeInterval = setInterval(() => {
                // Tocar um som de clique
                synth.triggerAttackRelease("C5", "32n");
                
                // Atualizar a animação do círculo de progresso
                const circle = document.querySelector(".progress-ring__circle");
                const radius = circle.r.baseVal.value;
                const circumference = 2 * Math.PI * radius;
                
                circle.style.strokeDasharray = `${circumference} ${circumference}`;
                circle.style.strokeDashoffset = `${circumference}`;
                
                const offset = circumference - (beat % 4) / 4 * circumference;
                circle.style.strokeDashoffset = offset;
                
                document.getElementById("progress-value").textContent = `${((beat % 4) / 4 * 100).toFixed(0)}%`;
                
                beat++;
            }, intervalMs);
        }
        
        // Inicialização quando o documento estiver carregado
        document.addEventListener("DOMContentLoaded", function() {
            generateGuitarNeck();
            generateCMajorScale();
            generateChordProgression("C");
            
            // Event listeners para o metrônomo
            document.getElementById("bpm-slider").addEventListener("input", function() {
                bpm = parseInt(this.value);
                updateMetronome();
            });
            
            document.getElementById("increase-bpm").addEventListener("click", function() {
                bpm += 5;
                updateMetronome();
            });
            
            document.getElementById("decrease-bpm").addEventListener("click", function() {
                bpm = Math.max(40, bpm - 5);
                updateMetronome();
            });
            
            document.getElementById("play-metronome").addEventListener("click", function() {
                if (isMetronomePlaying) {
                    // Parar o metrônomo
                    clearInterval(metronomeInterval);
                    isMetronomePlaying = false;
                    this.innerHTML = '<i class="fas fa-play"></i>';
                } else {
                    // Iniciar o metrônomo
                    startMetronome();
                    isMetronomePlaying = true;
                    this.innerHTML = '<i class="fas fa-stop"></i>';
                }
            });
            
            // Event listener para o seletor de tonalidade
            document.getElementById("key-select").addEventListener("change", function() {
                generateChordProgression(this.value);
            });
            
            // Event listener para o botão de tocar acorde
            document.getElementById("play-chord").addEventListener("click", function() {
                playChord("Cmajor");
            });
            
            // Smooth scroll para links de navegação
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener("click", function(e) {
                    e.preventDefault();
                    
                    const targetId = this.getAttribute("href");
                    if (targetId === "#") return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        window.scrollTo({
                            top: targetElement.offsetTop - 80,
                            behavior: "smooth"
                        });
                    }
                });
            });
        });