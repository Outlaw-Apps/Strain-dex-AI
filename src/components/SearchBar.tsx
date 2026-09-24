import { useState, useCallback, useRef } from "react";
import { Search, Mic, MicOff, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { callFunction, FUNCTIONS } from "@/integrations/appwrite/client";
import { toast } from "@/hooks/use-toast";
import { WavRecorder } from "@/lib/wavRecorder";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const recorderRef = useRef<WavRecorder | null>(null);

  const startListening = useCallback(async () => {
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsListening(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Microphone access needed",
        description: "Enable microphone access to search by voice.",
      });
    }
  }, []);

  const stopListening = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setIsListening(false);

    let blob: Blob;
    try {
      blob = await recorder.stop();
    } catch {
      toast({ variant: "destructive", title: "Recording failed" });
      return;
    }

    if (blob.size < 2048) {
      toast({ title: "Didn't catch that", description: "Try speaking a bit longer." });
      return;
    }

    setIsTranscribing(true);
    try {
      // Appwrite function executions take a string body — send the WAV as base64.
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const data = await callFunction<{ text?: string }>(FUNCTIONS.voiceSearchTranscribe, {
        audio: btoa(binary),
        contentType: blob.type || "audio/wav",
        filename: "recording.wav",
      });
      const text = data?.text?.trim();
      if (text) {
        onChange(text.replace(/[.!?]+$/, ""));
      } else {
        toast({ title: "No speech detected" });
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Voice search failed", description: "Please try again." });
    } finally {
      setIsTranscribing(false);
    }
  }, [onChange]);

  const toggleVoice = useCallback(() => {
    if (isTranscribing) return;
    if (isListening) void stopListening();
    else void startListening();
  }, [isListening, isTranscribing, startListening, stopListening]);

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
          placeholder={isListening ? "Listening…" : "Search strains or tap the mic…"}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-body text-base"
        />
        <AnimatePresence>
          {value && !isListening && !isTranscribing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onChange("")}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
        <button
          onClick={toggleVoice}
          disabled={isTranscribing}
          className={`p-2 rounded-xl transition-all duration-200 ${
            isListening
              ? "bg-primary/20 text-primary animate-pulse-neon"
              : isTranscribing
              ? "bg-muted text-muted-foreground cursor-wait"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
          aria-label={isListening ? "Stop recording" : "Voice search"}
          title={isListening ? "Stop recording" : "Voice search"}
        >
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>
      {isListening && (
        <p className="text-xs text-primary/80 text-center mt-2 animate-pulse">
          Listening — tap the mic again to search
        </p>
      )}
    </div>
  );
}
