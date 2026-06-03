export interface OsrmStep {
  maneuver: { type: string; modifier?: string };
  name: string;
  distance: number;
}

export interface RouteResult {
  coords: [number, number][];
  steps: OsrmStep[];
  totalDistance: number;
  totalDuration: number;
}

export async function fetchRouteWithSteps(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
  const data = await (await fetch(url)).json();
  const route = data.routes?.[0];
  if (!route) return null;
  const coords = route.geometry.coordinates as [number, number][];
  const steps: OsrmStep[] = route.legs?.[0]?.steps ?? [];
  return {
    coords,
    steps,
    totalDistance: route.distance,
    totalDuration: route.duration,
  };
}

function manueverToVietnamese(s: OsrmStep, isLast: boolean): string {
  const m = s.maneuver;
  const into = s.name ? ` vào ${s.name}` : "";
  const dist = s.distance >= 1000
    ? `${(s.distance / 1000).toFixed(1)} km`
    : `${Math.round(s.distance)} mét`;

  if (m.type === "depart") {
    return `Xuất phát${into}, đi ${dist}.`;
  }
  if (m.type === "arrive" || isLast) {
    return "Đã đến nơi.";
  }

  const dir = (() => {
    switch (m.modifier) {
      case "left": return "rẽ trái";
      case "right": return "rẽ phải";
      case "slight left": return "chếch trái";
      case "slight right": return "chếch phải";
      case "sharp left": return "rẽ gắt sang trái";
      case "sharp right": return "rẽ gắt sang phải";
      case "uturn": return "quay đầu";
      case "straight": return "đi thẳng";
      default: return "đi tiếp";
    }
  })();

  if (m.type === "roundabout" || m.type === "rotary") {
    return `Vào vòng xuyến${into}, đi ${dist}.`;
  }
  if (m.type === "new name") {
    return `Tiếp tục${into}, đi ${dist}.`;
  }
  return `Sau đó ${dir}${into}, đi ${dist}.`;
}

export function stepsToVietnamese(result: RouteResult): string {
  const totalKm = (result.totalDistance / 1000).toFixed(1);
  const totalMin = Math.round(result.totalDuration / 60);
  const intro = `Bắt đầu chỉ đường về nhà, quãng đường ${totalKm} ki lô mét, khoảng ${totalMin} phút.`;
  const parts = result.steps.map((s, i) => manueverToVietnamese(s, i === result.steps.length - 1));
  return [intro, ...parts].join(" ");
}

export { speakVi, stopSpeaking } from "./voiceNav.platform";
