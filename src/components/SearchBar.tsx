import { useState, useCallback, useRef } from "react";
import { Search, Mic, MicOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onChange(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onChange]);

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto transition-all duration-300 ${
        isFocused ? "scale-[1.02]" : ""
      }`}
    >
      <div
        className={`flex items-center gap-3 px-5 py-4 rounded-2xl glass transition-all duration-300 ${
          isFocused ? "neon-border" : "border border-border"
        }`}
      >
        <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search strains..."
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-body text-base"
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onChange("")}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
        <button
          onClick={toggleVoice}
          className={`p-2 rounded-xl transition-all duration-200 ${
            isListening
              ? "bg-primary/20 text-primary animate-pulse-neon"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
          title="Voice search"
        >
          {isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
