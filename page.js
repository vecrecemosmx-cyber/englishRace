'use client';

import React, { useState, useEffect, useRef } from 'react';
// Importamos los métodos oficiales de NextAuth para iniciar y cerrar sesión con Google
import { useSession, signIn, signOut, SessionProvider } from 'next-auth/react';
// Importación oficial confirmada con alias absoluto y mayúsculas exactas
import { IconoBocina, IconoNota } from '@/Iconos';
// Bases de datos oficiales cargadas localmente
import datasetP1 from '../words_practice1.json';
import datasetP2 from '../words_practice2.json';

// COMPONENTE CONTENEDOR EXCLUSIVO DE NEXTAUTH (Envoltura Obligatoria)
export default function Home() {
  return (
    <SessionProvider>
      <PlataformaFonica />
    </SessionProvider>
  );
}

// NUEVO COMPONENTE MAESTRO DE LA APLICACIÓN
function PlataformaFonica() {
  // Jalamos los datos reales del estudiante desde los servidores de Google
  const { data: session, status } = useSession();
  
  // --- ESTADOS DE CONTROL GLOBALES (Sincronizados con Google) ---
  const [currentPractice, setCurrentPractice] = useState('3'); // '3' = Práctica 1, '5' = Práctica 2
  const [currentFonema, setCurrentFonema] = useState('ə'); 
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [studentSelectedVocals, setStudentSelectedVocals] = useState([]); 
  const [errorMessage, setErrorMessage] = useState('');
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSuccessNote, setFeedbackSuccessNote] = useState('');
  const [feedbackIsCorrect, setFeedbackIsCorrect] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.25);

  const answerInputRef = useRef(null);

  // Mapeos oficiales para traducir los IDs de tus menús desplegables
  const mappingP1 = { "1": "ə", "2": "ɪ", "3": "ɛ", "4": "æ", "5": "ʌ" };

  // El arreglo base de preguntas cambia dinámicamente si es Práctica 1 o Práctica 2
  const questionsTexts = currentPractice === '3' 
    ? [
        "1. ¿Cuántos sonidos componen la palabra?",
        "2. ¿Cuántos fonemas consonantes tiene?",
        "3. ¿Cuántos fonemas vocales tiene?",
        "4. ¿En qué sílaba está el énfasis o acento?",
        "5. ¿En qué sílaba está la vocal que estamos practicando?"
      ]
    : [
        "1. ¿Cuántos sonidos componen la palabra?",
        "2. ¿Cuántos fonemas consonantes tiene?",
        "3. ¿Cuántos fonemas vocales tiene?",
        "4. ¿En qué sílaba está el énfasis o acento?",
        "5. Elige el fonema correcto.",
        "6. Selecciona todos los fonemas vocales que escuchas."
      ];

  // Ruta local para reproducir los audios fónicos desde public/audio/
  const baseAudioUrl = "/audio/";
  const vocalAudioFiles = { "ə": "PHONEME-DUST.mp3", "ɪ": "PHONEME-PINK.mp3", "ɛ": "PHONEME-RED.mp3", "æ": "PHONEME-SAND.mp3", "ʌ": "PHONEME-CUP.mp3" };

  // Lista de los 21 fonemas para la pregunta 6 (Botonera)
  const vocalOptionsP2 = [
    "ɪ", "ʌ", "ʊ", "ə", "ɒ", "æ", "e", "i:", "ɑ:", "u:", "ɜ:", "ɔ:", 
    "aɪ", "eɪ", "ɔɪ", "aʊ", "oʊ", "ɑːr", "ɜːr", "ɔːr", "ər"
  ];

  // --- FILTRADO DINÁMICO DE PALABRAS POR ID NUMÉRICO SEGÚN LA PRÁCTICA ACTIVA ---
  const obtenerPalabrasFiltradas = () => {
    if (currentPractice === '3') {
      const filtradasCrudas = datasetP1.filter(item => {
        const symbol = mappingP1[String(item.fonema_id)] || item.fonema_simbolo;
        return symbol === currentFonema;
      });
      return filtradasCrudas.map(item => ({
        word: item.word, f: String(item.f), fc: String(item.fc), fv: String(item.fv), stress: String(item.stress), posVocal: String(item.posVocal)
      }));
    } else {
      const filtradasCrudas = datasetP2.filter(item => String(item.fonema_id) === String(currentFonema));
      return filtradasCrudas.map(item => ({
        word: item.word, f: String(item.f), fc: String(item.fc), fv: String(item.fv), stress: String(item.stress), consonant: String(item.consonant), vocalesIPA: String(item.vocalesIPA)
      }));
    }
  };

  const palabrasFiltradas = obtenerPalabrasFiltradas();
  const currentData = palabrasFiltradas[currentWordIndex] || null;

  // Lógica de enfoque automático al cambiar de pregunta
  useEffect(() => {
    if (status === "authenticated" && answerInputRef.current && currentQuestionIndex < 4) {
      answerInputRef.current.focus();
    }
  }, [currentQuestionIndex, currentWordIndex, currentFonema, status]);

  useEffect(() => {
    if (currentPractice === '3') {
      setCurrentFonema('ə');
    } else {
      setCurrentFonema('1');
    }
    resetEntireExercise();
  }, [currentPractice]);

  const resetEntireExercise = () => {
    setCurrentQuestionIndex(0);
    setStudentAnswer('');
    setStudentSelectedVocals([]);
    setShowFeedback(false);
    setErrorMessage('');
    setHasAnsweredCorrectly(false);
  };

  // --- REPRODUCCIÓN AUDIO LOCAL (Integrados 100% sin internet) ---
  const handlePlayWordAudio = (e) => {
    if (e) e.preventDefault();
    if (answerInputRef.current) answerInputRef.current.focus();
    if (!currentData) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanWord = currentData.word.replace(/\(.*\)/, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = 'en-US';
      utterance.rate = audioSpeed;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePlayVocalAudio = (e) => {
    if (e) e.preventDefault();
    if (currentPractice !== '3') return;
    const fileName = vocalAudioFiles[currentFonema];
    if (fileName) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      const vocalAudio = new Audio(baseAudioUrl + fileName);
      vocalAudio.play().catch(err => console.log("Asegúrate de tener los archivos .mp3 en public/audio/ :", err));
    }
  };

  // --- MOTOR DE EVALUACIÓN MULTI-CASO (Soporta Pregunta 5 de Botones y Pregunta 6 de Cuadrícula de Botones) ---
  const handleCheckAnswer = (e, valorBotonP5 = null) => {
    if (e) e.preventDefault();
    if (!currentData) return;

    let value = studentAnswer.trim();
    let isCorrect = false;
    let successNote = "";

    // CASO A: EVALUACIÓN DE LAS PREGUNTAS GENERALES 1 A 4 (Común para P1 y P2)
    if (currentQuestionIndex < 4) {
      let isTwoDigitQuestion = (currentQuestionIndex === 0);
      let isValidFormat = isTwoDigitQuestion ? /^[0-9]{1,2}$/.test(value) : /^[0-9]$/.test(value);

      if (value === "") { 
        setErrorMessage("⚠️ Escribe tu respuesta antes de comprobar."); 
        setShowFeedback(false);
        return; 
      } 
      if (!isValidFormat) { 
        setErrorMessage(isTwoDigitQuestion ? "⚠️ Ingresa un número de 1 o 2 dígitos." : "⚠️ Ingresa un número de un solo dígito (0-9)."); 
        setShowFeedback(false);
        return; 
      }

      setErrorMessage("");
      let correctValue = "";
      switch(currentQuestionIndex) {
        case 0: correctValue = currentData.f; successNote = `¡Excelente! Esta palabra está compuesta por ${currentData.f} sonidos.`; break;
        case 1: correctValue = currentData.fc; successNote = `¡Correcto! Tiene ${currentData.fc} sonidos consonantes.`; break;
        case 2: correctValue = currentData.fv; successNote = `¡Muy bien! Tiene ${currentData.fv} sonidos vocálicos.`; break;
        case 3: correctValue = currentData.stress; successNote = `¡Exacto! El acento o énfasis está en la sílaba ${currentData.stress}.`; break;
      }
      isCorrect = (value === correctValue);
    } 
    // CASO B: EVALUACIÓN DE LA PREGUNTA 5
    else if (currentQuestionIndex === 4) {
      if (currentPractice === '3') {
        if (value === "") { setErrorMessage("⚠️ Escribe tu respuesta antes de comprobar."); setShowFeedback(false); return; }
        const dbValue = currentData.posVocal;
        if (dbValue.length === 2) {
          const digitoA = dbValue.charAt(0);
          const digitoB = dbValue.charAt(1);
          if (value === digitoA || value === digitoB) {
            isCorrect = true;
            successNote = `¡Felicidades! La vocal /${currentFonema}/ se ubica en la sílaba ${value}. Recuerda responder todos los lugares donde aparece pues en este caso también aparece en la sílaba ${value === digitoA ? digitoB : digitoA}.`;
          }
        } else {
          isCorrect = (value === dbValue);
          if (isCorrect) successNote = `¡Felicidades! La vocal /${currentFonema}/ se ubica en la posición: ${dbValue}.`;
        }
      } else {
        if (!valorBotonP5) return;
        const consonantLimpia = currentData.consonant.replace(/\\/g, "");
        isCorrect = (valorBotonP5 === consonantLimpia);
        if (isCorrect) {
          successNote = `¡Excelente elección! El fonema consonántico correcto de la palabra es ${consonantLimpia}.`;
        }
      }
    } 
    // CASO C: EVALUACIÓN DE LA PREGUNTA 6 (EXCLUSIVA PRÁCTICA 2 - CUADRÍCULA DE BOTONES)
    else if (currentQuestionIndex === 5 && currentPractice === '5') {
      if (studentSelectedVocals.length === 0) {
        setErrorMessage("⚠️ Selecciona al menos un fonema vocal de la cuadrícula antes de comprobar.");
        setShowFeedback(false);
        return;
      }
      setErrorMessage("");
      const vocalesLimpiasJson = currentData.vocalesIPA.replace(/\\/g, "").split(",").map(v => v.trim());
      
      const todosEstan = vocalesLimpiasJson.every(v => studentSelectedVocals.includes(v));
      const longitudIgual = vocalesLimpiasJson.length === studentSelectedVocals.length;
      
      isCorrect = (todosEstan && longitudIgual);
      if (isCorrect) {
        successNote = `¡Felicidades! Has identificado correctamente todos los fonemas vocales presentes: ${vocalesLimpiasJson.join(", ")}.`;
      }
    }

    setFeedbackIsCorrect(isCorrect);
    setFeedbackSuccessNote(successNote);
    setHasAnsweredCorrectly(isCorrect);
    setShowFeedback(true);
  };

  // --- NAVEGACIÓN Y DISPARADORES DE FLUJO ---
  const handleNextQuestion = (e) => {
    if (e) e.preventDefault();
    if (!hasAnsweredCorrectly) return;

    const maxPreguntas = currentPractice === '3' ? 5 : 6;

    if (currentQuestionIndex < maxPreguntas - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setStudentAnswer("");
      setStudentSelectedVocals([]);
      setShowFeedback(false);
      setHasAnsweredCorrectly(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const totalWordsInBlock = palabrasFiltradas.length;
      if (totalWordsInBlock > 0) {
        setCurrentWordIndex((currentWordIndex < totalWordsInBlock - 1) ? currentWordIndex + 1 : 0);
      }
      resetEntireExercise();
      alert(`📝 Siguiente reto cargado. Presiona 'Palabra' para practicar.`);
    }
  };

  const handlePreviousQuestion = (e) => {
    if (e) e.preventDefault();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setStudentAnswer("");
      setStudentSelectedVocals([]);
      setShowFeedback(false);
      setHasAnsweredCorrectly(false);
      setErrorMessage("");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const changeFonemaDropdown = (e) => {
    setCurrentFonema(e.target.value);
    setCurrentWordIndex(0);
    resetEntireExercise();
  };

  const toggleVocalSelection = (vocal) => {
    if (studentSelectedVocals.includes(vocal)) {
      setStudentSelectedVocals(studentSelectedVocals.filter(v => v !== vocal));
    } else {
      setStudentSelectedVocals([...studentSelectedVocals, vocal]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && currentQuestionIndex < 4) {
      if (!hasAnsweredCorrectly) {
        handleCheckAnswer(e);
      } else {
        handleNextQuestion(e);
      }
    }
  };

  // ==========================================================================
  // RENDER CONDICIONAL DE SEGURIDAD (CONECTADO 100% A GOOGLE)
  // ==========================================================================
  
  // 1. Pantalla de carga intermedia mientras Google valida la sesión del alumno
  if (status === "loading") {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#F2C83B]">
        <div className="text-xl font-bold text-black uppercase tracking-widest animate-pulse">
          Cargando plataforma...
        </div>
      </div>
    );
  }

  // 2. VISTA A: PANTALLA LOGIN COMPLETA CON BOTÓN DE GOOGLE MANDATORIO
  if (status === "unauthenticated" || !session) {
    return (
      <div 
        className="fixed inset-0 w-full h-full flex flex-col justify-between p-6 md:p-12 text-[#000000] overflow-hidden select-none"
        style={{ backgroundColor: '#F2C83B', fontFamily: 'var(--font-redondeada), sans-serif', zIndex: 9999 }}
      >
        {/* CÍRCULOS DECORATIVOS CON OPACIDAD */}
        <div className="absolute -right-40 top-1/4 w-[600px] h-[600px] rounded-full bg-white/10 pointer-events-none z-0" />
        <div className="absolute -left-20 -top-20 w-[400px] h-[400px] rounded-full bg-black/5 pointer-events-none z-0" />
        <div className="absolute left-10 -bottom-40 w-[500px] h-[500px] rounded-full bg-white/15 pointer-events-none z-0" />

        <div className="absolute top-8 left-8 bg-[#000000] text-[#F2C83B] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-md z-10">
          ★ 30+ AÑOS DE EXPERIENCIA
        </div>
        <div className="absolute top-8 right-8 text-[#000000]/40 text-sm font-bold tracking-widest z-10">1 / 7</div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full text-center my-10 z-10">
          <span className="text-xs md:text-sm font-extrabold uppercase tracking-[0.4em] text-[#000000]/60 mb-6">BIENVENIDO A</span>
          <h1 className="text-5xl sm:text-7xl md:text-[8rem] font-black tracking-tight leading-[0.95] mb-12 uppercase text-[#000000]" style={{ WebkitTextStroke: '8px #000000', paintOrder: 'stroke fill' }}>
            APRENDE INGLES <br /> EN ESPAÑOL
          </h1>
          <p className="text-base md:text-2xl font-bold text-[#000000]/80 max-w-2xl mx-auto mb-14 leading-relaxed tracking-tight">
            Desde cero absoluto hasta hablar con confianza — <br /> paso a paso, día a día.
          </p>
          <div className="w-full max-w-[360px] md:max-w-[440px] mx-auto">
            {/* BOTÓN INTERACTIVO QUE DISPARA EL POPUP REAL DE GOOGLE */}
            <button 
              onClick={() => signIn('google')} 
              className="w-full bg-[#000000] hover:bg-[#1E293B] text-white font-bold py-5 px-8 rounded-full transition-all shadow-xl flex items-center justify-center gap-3 tracking-wide text-base uppercase transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.13 1 1.15 5.925 1.15 12s4.98 11 11.09 11c6.38 0 10.614-4.474 10.614-10.794 0-.727-.078-1.282-.175-1.921H12.24z"/>
              </svg>
              <span>Ingresa con Google</span>
            </button>
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto flex flex-wrap justify-center items-center gap-3 md:gap-4 pt-5 border-t border-[#000000]/10 z-10">
          <div className="bg-white px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-sm uppercase tracking-wide border border-[#000000]/5">✓ Acceso Seguro</div>
          <div className="bg-white px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-sm uppercase tracking-wide border border-[#000000]/5">✓ Cuentas Verificadas</div>
          <div className="bg-white px-5 py-2.5 rounded-full text-xs md:text-sm font-bold shadow-sm uppercase tracking-wide border border-[#000000]/5">✓ Progreso Guardado</div>
        </div>
      </div>
    );
  }

  // 3. VISTA B: INTERFAZ INTERNA PARA ALUMNOS LOGUEADOS CORRECTAMENTE
  return (
    <div className="plataforma-body w-full min-h-screen text-[#1E293B]" style={{ fontFamily: 'var(--font-redondeada), sans-serif' }}>
      
      {/* HEADER DE LA PLATAFORMA */}
      <header className="app-header">
        <div className="header-left">
          <button id="menu-toggle" className="menu-toggle-btn" onClick={(e) => {
            e.stopPropagation();
            document.getElementById('sidebar')?.classList.toggle('open');
          }}>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          <div className="logo">English For All</div>
        </div>

        {/* BARRA DE PROGRESO */}
        <div className="progress-container">
          <div className="progress-bar-bg">
            <div id="progress-bar" className="progress-bar-fill" style={{ width: `${((currentQuestionIndex + 1) / (currentPractice === '3' ? 5 : 6)) * 100}%` }}></div>
          </div>
          <span id="progress-text" className="progress-text">Pregunta {currentQuestionIndex + 1} de {currentPractice === '3' ? 5 : 6}</span>
        </div>

        {/* AVATAR DINÁMICO: Muestra la inicial real del correo del alumno extraída de Google */}
        <div 
          className="avatar" 
          onClick={() => signOut()} 
          style={{ cursor: 'pointer', backgroundColor: '#F2C83B', color: '#000000', fontWeight: 'bold' }} 
          title="Haz clic para Cerrar Sesión"
        >
          {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </header>

      {/* CUERPO DEL LAYOUT EN REJILLA */}
      <div className="app-layout">
        
        {/* MENÚ LATERAL IZQUIERDO INTERACTIVO */}
        <aside id="sidebar" className="sidebar">
          <h3 className="sidebar-title">Ejercicios de Práctica</h3>
          <ul className="sidebar-menu">
            <li className="menu-item" id="menu-metodologia"><span className="menu-number">1</span><span className="menu-text">Metodología.</span></li>
            <li className="menu-item" id="menu-alfabeto"><span className="menu-number">2</span><span className="menu-text">Alfabeto de fonemas (sonidos).</span></li>
            
            <li 
              className={`menu-item ${currentPractice === '3' ? 'active' : ''}`} 
              id="menu-practica-1"
              onClick={() => setCurrentPractice('3')}
            >
              <span className="menu-number">3</span>
              <span className="menu-text">Práctica 1 Listening De Vocales Cortas.</span>
            </li>
            
            <li className="menu-item" id="menu-grafemas"><span className="menu-number">4</span><span className="menu-text">Primeros Grafemas.</span></li>

            <li 
              className={`menu-item ${currentPractice === '5' ? 'active' : ''}`} 
              id="menu-practica-2"
              onClick={() => setCurrentPractice('5')}
            >
              <span className="menu-number">5</span>
              <span className="menu-text">Práctica 2 Listening de Consonantes.</span>
            </li>
            
            <li className="menu-item" id="menu-diptongos"><span className="menu-number">6</span><span className="menu-text">Diptongos (i, u).</span></li>
            <li className="menu-item" id="menu-sopa"><span className="menu-number">7</span><span className="menu-text">Sopa de letras.</span></li>
            <li className="menu-item" id="menu-flashcards"><span className="menu-number">8</span><span className="menu-text">Flashcards significados.</span></li>
            <li className="menu-item" id="menu-frases"><span className="menu-number">9</span><span className="menu-text">Frases.</span></li>
          </ul>
        </aside>

        {/* CONTENEDOR CENTRAL DE TRABAJO */}
        <main className="main-container">
          
          <div className="instruction-card">
            <p id="instruction-text" className="instruction-text">{questionsTexts[currentQuestionIndex]}</p>
          </div>

          <div className="practice-card unified-media-card">
            <div className="w-full flex justify-center pb-2">
              {currentPractice === '3' ? (
                <select id="fonema-select" className="font-dropdown-top w-full max-w-[320px] text-center" value={currentFonema} onChange={changeFonemaDropdown}>
                  <option value="" disabled hidden>Elige un fonema</option>
                  <option value="ə">Fonema /ə/</option>
                  <option value="ɪ">Fonema /ɪ/</option>
                  <option value="ɛ">Fonema /ɛ/</option>
                  <option value="æ">Fonema /æ/</option>
                  <option value="ʌ">Fonema /ʌ/</option>
                </select>
              ) : (
                <select id="fonema-select" className="font-dropdown-top w-full max-w-[320px] text-center" value={currentFonema} onChange={changeFonemaDropdown}>
                  <option value="" disabled hidden>Elige un fonema</option>
                  <option value="1">Grafemas de /θ/ vs /ð/</option>
                  <option value="2">Grafemas de /ʧ/ vs /ʤ/</option>
                  <option value="3">Grafemas de /ʤ/ vs /j/</option>
                  <option value="4">Grafemas de /ʃ/ vs /ʒ/</option>
                </select>
              )}
            </div>

            <div className="media-buttons-row">
              <div className="media-column-left">
                <button id="play-word-btn" onClick={handlePlayWordAudio} className="audio-btn"><IconoBocina /><span>Palabra</span></button>
              </div>
              <div className="media-column-right">
                <button 
                  id="play-vocal-btn" 
                  onClick={handlePlayVocalAudio} 
                  className={`audio-btn vocal-btn ${currentPractice !== '3' ? 'btn-disabled opacity-40 cursor-not-allowed' : ''}`}
                  disabled={currentPractice !== '3'}
                >
                  <IconoNota /><span>Vocal</span>
                </button>
              </div>
            </div>

            <div className="media-slider-row">
              <div className="interactive-wave-box">
                <div className="wave-container"><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div></div>
                <input type="range" min="0.5" max="2.0" step="0.25" id="speed-slider" value={audioSpeed} onChange={(e) => setAudioSpeed(parseFloat(e.target.value))} className="over-wave-slider" />
                <span id="speed-bubble" className="speed-bubble-indicator">{audioSpeed.toFixed(2)}x</span>
              </div>
            </div>
          </div>

          {currentPractice === '5' && currentQuestionIndex === 4 ? (
            /* ========================================================
               PREGUNTA 5 DE PRÁCTICA 2: DOS BOTONES INTERACTIVOS DINÁMICOS
               ======================================================== */
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm text-center flex flex-col gap-4">
              <span className="response-title block mb-2">Selecciona el fonema correcto</span>
              <div className="flex gap-4 justify-center">
                {currentFonema === '1' && (
                  <>
                    <button onClick={(e) => handleCheckAnswer(e, "/θ/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/θ/</button>
                    <button onClick={(e) => handleCheckAnswer(e, "/ð/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/ð/</button>
                  </>
                )}
                {currentFonema === '2' && (
                  <>
                    <button onClick={(e) => handleCheckAnswer(e, "/ʧ/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/ʧ/</button>
                    <button onClick={(e) => handleCheckAnswer(e, "/ʤ/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/ʤ/</button>
                  </>
                )}
                {currentFonema === '3' && (
                  <>
                    <button onClick={(e) => handleCheckAnswer(e, "/ʤ/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/ʤ/</button>
                    <button onClick={(e) => handleCheckAnswer(e, "/j/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/j/</button>
                  </>
                )}
                {currentFonema === '4' && (
                  <>
                    <button onClick={(e) => handleCheckAnswer(e, "/ʃ/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/ʃ/</button>
                    <button onClick={(e) => handleCheckAnswer(e, "/ʒ/")} className="check-green-btn !bg-sky-600 hover:!bg-sky-700 !px-8" disabled={hasAnsweredCorrectly}>/ʒ/</button>
                  </>
                )}
              </div>
              {errorMessage && <p className="error-text text-center mt-2">{errorMessage}</p>}
            </div>
          ) : currentPractice === '5' && currentQuestionIndex === 5 ? (
            /* ========================================================
               PREGUNTA 6 CON CUADRÍCULA DE BOTONES ACTUALIZADA (21 FONEMAS)
               ======================================================== */
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col gap-4">
              <span className="response-title">Selecciona las vocales presentes</span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[180px] overflow-y-auto p-2 border border-zinc-100 rounded-xl bg-zinc-50">
                {vocalOptionsP2.map(vocal => (
                  <button 
                    key={vocal} type="button" onClick={() => !hasAnsweredCorrectly && toggleVocalSelection(`/${vocal}/`)}
                    className={`p-2 rounded-lg text-sm font-bold border transition-all ${studentSelectedVocals.includes(`/${vocal}/`) ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'} ${hasAnsweredCorrectly ? 'cursor-not-allowed opacity-70' : ''}`}
                    disabled={hasAnsweredCorrectly}
                  >
                    /{vocal}/
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-100">
                <div className="flex-1">{errorMessage && <p className="error-text">{errorMessage}</p>}</div>
                <button onClick={handleCheckAnswer} className={`check-green-btn ${hasAnsweredCorrectly ? 'btn-disabled' : ''}`} disabled={hasAnsweredCorrectly}>Comprobar Selección</button>
              </div>
            </div>
          ) : (
            /* ========================================================
               PREGUNTAS GENERALES 1 A 4 (Y PREGUNTA 5 DE LA PRÁCTICA 1)
               ======================================================== */
            <div className="response-card split-response-card">
              <div className="response-left-pane">
                <span className="response-title">Tu Respuesta</span>
                <input 
                  type="text" id="student-answer" ref={answerInputRef} value={studentAnswer} disabled={hasAnsweredCorrectly}
                  onChange={(e) => { setStudentAnswer(e.target.value); if (errorMessage !== "") setErrorMessage(""); }}
                  onKeyPress={handleKeyPress} placeholder="Escribe aquí..." className={`response-input ${errorMessage ? 'input-invalid' : ''}`}
                />
                <p id="error-message" className="error-text">{errorMessage}</p>
              </div>
              <div className="response-divider-line"></div>
              <div className="response-right-pane">
                <button id="check-answer-btn" onClick={handleCheckAnswer} className={`check-green-btn ${hasAnsweredCorrectly ? 'btn-disabled' : ''}`} disabled={hasAnsweredCorrectly}>Comprobar</button>
              </div>
            </div>
          )}

          {/* TARJETA DE RETROALIMENTACIÓN ORIGINAL (DINÁMICA) */}
          {showFeedback && (
            <div id="feedback-card" className="feedback-card">
              <span className="feedback-title">Resultado de la evaluación:</span>
              <div id="feedback-phrase" className="feedback-phrase">
                {feedbackIsCorrect ? (
                  <span className="word-correct">{feedbackSuccessNote}</span>
                ) : (
                  <>Tu respuesta no es correcta. ¡Inténtalo de nuevo!</>
                )}
              </div>
              <div id="tip-text" className="tip-box">
                {feedbackIsCorrect ? (
                  "Recuerda que esta práctica se trata de poner atención a los sonidos no a los grafemas."
                ) : (
                  currentQuestionIndex === 5 ? (
                    "Revisa con calma cada una de las sílabas de la palabra al escucharla de manera lenta con el deslizador."
                  ) : (
                    "Recuerda que los diptongos o las vocales compuestas cuentan como 1 sonido. Tampoco te olvides de utilizar la técnica de eliminación de sonidos."
                  )
                )}
              </div>
            </div>
          )}

          {/* NAVEGACIÓN INFERIOR DE RETOS */}
          <div className="navigation-buttons" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: '16px' }}>
            <button 
              id="prev-btn" 
              onClick={handlePreviousQuestion} 
              className={`back-question-btn ${currentQuestionIndex === 0 ? 'hidden' : ''}`} 
              style={{ flex: 1 }}
            >
              ← Anterior
            </button>
            <button 
              id="action-btn" 
              onClick={handleNextQuestion} 
              className={`next-btn ${!hasAnsweredCorrectly ? 'btn-disabled' : ''}`} 
              disabled={!hasAnsweredCorrectly} 
              style={{ flex: 2 }}
            >
              {currentQuestionIndex === (currentPractice === '3' ? 5 : 6) - 1 ? "SIGUIENTE PALABRA ➔" : "SIGUIENTE PREGUNTA ➔"}
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}
