"use client";

import { useState } from "react";
import { useStore } from "./store";

type Recognition = {
  lang: string;
  onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void;
  onend: () => void;
  start: () => void;
};

/** Browser speech-to-text. Says so when the browser doesn't support it. */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);

  const dictate = () => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      useStore.getState().toast("Voice input isn't supported in this browser", "warn");
      return;
    }
    const sr = new Ctor();
    sr.lang = "en-US";
    sr.onresult = (e) => onText(e.results[0][0].transcript);
    sr.onend = () => setListening(false);
    setListening(true);
    sr.start();
  };

  return { listening, dictate };
}
