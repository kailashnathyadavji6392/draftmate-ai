import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X, AlertCircle, Globe, RefreshCw } from 'lucide-react';

export default function VoiceInputButton({
  onTranscriptAccepted,
  language = 'en-IN',
  onLanguageChange,
  buttonLabel = 'Voice Dictation',
  placeholder = 'Speak clearly into your microphone...',
  showToast
}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [speechLang, setSpeechLang] = useState(language);
  const [errorNotice, setErrorNotice] = useState(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    setSpeechLang(language);
  }, [language]);

  const startListening = () => {
    setErrorNotice(null);
    setTranscript('');
    setInterimText('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (showToast) showToast('Speech Recognition is not supported by your current browser environment. Use keyboard input.', 'warning');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setShowModal(true);
      };

      recognition.onresult = (event) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        if (finalStr) {
          setTranscript(prev => (prev + finalStr).trim() + ' ');
        }
        setInterimText(interimStr);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorNotice('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error === 'no-speech') {
          setErrorNotice('No speech was detected. Please try speaking again.');
        } else {
          setErrorNotice(`Voice input notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setErrorNotice(err.message);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleAccept = () => {
    const combined = (transcript + ' ' + interimText).trim();
    if (combined && onTranscriptAccepted) {
      onTranscriptAccepted(combined);
      if (showToast) showToast('Dictated text inserted.', 'success');
    }
    setShowModal(false);
    setTranscript('');
    setInterimText('');
    stopListening();
  };

  const handleCancel = () => {
    stopListening();
    setShowModal(false);
    setTranscript('');
    setInterimText('');
  };

  const toggleLanguage = () => {
    const nextLang = speechLang === 'hi-IN' ? 'en-IN' : 'hi-IN';
    setSpeechLang(nextLang);
    if (onLanguageChange) onLanguageChange(nextLang);
    if (isListening) {
      stopListening();
      if (showToast) showToast(`Switched language to ${nextLang === 'hi-IN' ? 'Hindi (हिंदी)' : 'English (India)'}. Restart dictation.`, 'info');
    }
  };

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`btn ${isListening ? 'btn-danger' : 'btn-outline'}`}
          title={isSupported ? 'Click to dictate instructions or draft text' : 'Speech recognition unavailable in this browser environment'}
          style={{
            fontSize: '0.72rem',
            padding: '0.3rem 0.6rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            borderColor: isListening ? '#EF4444' : 'var(--border-gold)',
            color: isListening ? '#FFF' : 'var(--gold-light)',
            boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {isListening ? (
            <>
              <Mic size={13} className="spin" color="#FFF" />
              <span>Listening...</span>
            </>
          ) : (
            <>
              <Mic size={13} color="var(--gold-primary)" />
              <span>{buttonLabel}</span>
            </>
          )}
        </button>

        {/* Language switch button */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="btn btn-outline"
          title={`Click to switch between Indian English and Hindi dictation`}
          style={{
            fontSize: '0.68rem',
            padding: '0.3rem 0.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-secondary)'
          }}
        >
          <Globe size={11} color="var(--gold-light)" />
          <span>{speechLang === 'hi-IN' ? 'हिन्दी (hi-IN)' : 'English (en-IN)'}</span>
        </button>
      </div>

      {/* Dictation Review Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 10, 18, 0.85)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '540px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Mic size={15} color={isListening ? '#EF4444' : 'var(--gold-primary)'} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFF' }}>
                    Voice Dictation Console
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: isListening ? '#34D399' : 'var(--text-muted)' }}>
                    {isListening ? `● Listening in ${speechLang === 'hi-IN' ? 'Hindi' : 'Indian English'}...` : 'Dictation paused'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCancel}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error banner if any */}
            {errorNotice && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#FCA5A5',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <AlertCircle size={14} color="#EF4444" />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* Editable Recognized Text Area */}
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                Review and edit recognized speech before inserting:
              </label>
              <textarea
                className="legal-textarea"
                rows={5}
                value={transcript + (interimText ? `[${interimText}]` : '')}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={placeholder}
                style={{
                  fontSize: '0.85rem',
                  lineHeight: '1.45',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderColor: isListening ? 'var(--gold-primary)' : 'var(--border-subtle)'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {isListening ? (
                  <button
                    onClick={stopListening}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', borderColor: '#EF4444', color: '#F87171' }}
                  >
                    <MicOff size={13} /> Pause Mic
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                  >
                    <Mic size={13} /> Resume Speaking
                  </button>
                )}
                <button
                  onClick={() => { setTranscript(''); setInterimText(''); }}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                >
                  <RefreshCw size={12} /> Clear
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCancel}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!transcript.trim() && !interimText.trim()}
                  className="btn btn-gold"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 1rem', fontWeight: 600 }}
                >
                  <Check size={14} /> Insert Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
