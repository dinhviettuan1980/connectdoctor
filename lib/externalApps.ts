// Other apps in the tuandv.id.vn ecosystem, embedded via WebView as tiles in
// the top-level app hub (app/(hub)) alongside ConnectDoctor itself.

export interface ExternalApp {
  slug: string;
  title: string;
  icon: string;
  url: string;
  basicAuth?: { username: string; password: string };
}

export const EXTERNAL_APPS: ExternalApp[] = [
  {
    slug: "kinhdich",
    title: "Kinh Dịch",
    icon: "☯️",
    url: "https://tuandv.id.vn/kinhdich/",
  },
  {
    slug: "xsmb",
    title: "XSMB",
    icon: "🎯",
    url: "https://tuandv.id.vn/xsmb/",
  },
  {
    slug: "meeting",
    title: "Meeting Assistant",
    icon: "🗒️",
    url: "https://tuandv.id.vn/meeting/",
  },
  {
    slug: "jobs",
    title: "Job Search",
    icon: "💼",
    url: "https://tuandv.id.vn/jobs/",
  },
  {
    slug: "ai-director",
    title: "AI Director",
    icon: "🎬",
    url: "https://ksbvapi.tuandv.id.vn/ai-director/",
  },
];

export function getExternalApp(slug: string): ExternalApp | undefined {
  return EXTERNAL_APPS.find((a) => a.slug === slug);
}
