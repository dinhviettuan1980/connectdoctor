// Linking helpers — used when patient taps email / phone in a doctor profile.

import * as Linking from "expo-linking";

export async function openEmail(to: string, subject?: string, body?: string) {
  const params = new URLSearchParams();
  if (subject) params.append("subject", subject);
  if (body) params.append("body", body);
  const qs = params.toString();
  const url = `mailto:${to}${qs ? `?${qs}` : ""}`;
  await Linking.openURL(url);
}

export async function openPhone(number: string) {
  const clean = number.replace(/[^+\d]/g, "");
  await Linking.openURL(`tel:${clean}`);
}
