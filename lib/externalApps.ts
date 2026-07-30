// Other apps in the tuandv.id.vn ecosystem, embedded via WebView so they're
// reachable from inside ConnectDoctor ("Dịch vụ khác" in the user menu).

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
    basicAuth: { username: "tuandv", password: "123456" },
  },
];

export function getExternalApp(slug: string): ExternalApp | undefined {
  return EXTERNAL_APPS.find((a) => a.slug === slug);
}
