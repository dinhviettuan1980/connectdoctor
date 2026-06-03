import * as Speech from "expo-speech";

export function speakVi(text: string): void {
  Speech.stop();
  Speech.speak(text, { language: "vi-VN", rate: 1.0 });
}

export function stopSpeaking(): void {
  Speech.stop();
}
