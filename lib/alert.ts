import { Alert as RNAlert, Platform } from "react-native";

export interface AlertButton {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

/**
 * Drop-in replacement for RN's Alert.alert that also works on web.
 * react-native-web ships Alert.alert as a total no-op (no window.alert
 * fallback), so on web build every Alert.alert call — including
 * destructive-action confirms — silently did nothing. This falls back to
 * window.alert/confirm on web and delegates to the real Alert on native.
 */
function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const text = [title, message].filter(Boolean).join("\n\n");
  const list = buttons && buttons.length > 0 ? buttons : undefined;

  if (!list || list.length === 1) {
    window.alert(text);
    list?.[0]?.onPress?.();
    return;
  }

  const cancelBtn = list.find((b) => b.style === "cancel");
  const confirmBtn = list.find((b) => b !== cancelBtn) ?? list[list.length - 1];
  if (window.confirm(text)) {
    confirmBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}

/**
 * RN's Alert.prompt is iOS-only (it throws on Android) and doesn't exist on web.
 * Uses window.prompt on web, the real Alert.prompt on iOS, and no-ops with a
 * warning on Android rather than crashing.
 */
function prompt(
  title: string,
  message?: string,
  callback?: (text: string) => void,
  type?: "default" | "plain-text" | "secure-text" | "login-password",
  defaultValue?: string,
): void {
  if (Platform.OS === "web") {
    const result = window.prompt([title, message].filter(Boolean).join("\n\n"), defaultValue ?? "");
    if (result !== null) callback?.(result);
    return;
  }
  if (Platform.OS === "ios") {
    RNAlert.prompt(title, message, callback, type, defaultValue);
    return;
  }
  console.warn(`Alert.prompt("${title}") is not supported on Android — ignored.`);
}

export const Alert = { alert, prompt };
