"use client";
import { useEffect } from "react";
import { validateFile, countWords, WORD_LIMITS } from "@/lib/limits";

// Global guard: any <input type="file"> selection containing a file over the
// upload limit is cleared and blocked before page handlers run. No UI changes.
export default function UploadGuard() {
  useEffect(() => {
    function onChange(event) {
      const el = event.target;
      if (!(el instanceof HTMLInputElement) || el.type !== "file" || !el.files) return;
      for (const file of Array.from(el.files)) {
        const error = validateFile(file);
        if (error) {
          event.stopImmediatePropagation();
          el.value = "";
          window.alert(error);
          return;
        }
      }
    }
    // Word limits: textarea = 500 words; subject/title text inputs = 15 words.
    function limitFor(el) {
      if (el instanceof HTMLTextAreaElement) return WORD_LIMITS.description;
      if (el instanceof HTMLInputElement && (el.type === "text" || el.type === "")) {
        const hint = `${el.name} ${el.id} ${el.placeholder}`.toLowerCase();
        if (/subject|title/.test(hint)) return WORD_LIMITS.subject;
      }
      return 0;
    }
    let lastAlert = 0;
    function onBeforeInput(event) {
      const el = event.target;
      const limit = limitFor(el);
      if (!limit || !event.data || el.selectionStart == null) return;
      const next = el.value.slice(0, el.selectionStart) + event.data + el.value.slice(el.selectionEnd);
      if (countWords(next) > limit && countWords(next) > countWords(el.value)) {
        event.preventDefault();
        if (Date.now() - lastAlert > 2000) { lastAlert = Date.now(); window.alert(`Maximum ${limit} words allowed here.`); }
      }
    }
    document.addEventListener("change", onChange, true);
    document.addEventListener("beforeinput", onBeforeInput, true);
    return () => {
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("beforeinput", onBeforeInput, true);
    };
  }, []);
  return null;
}
