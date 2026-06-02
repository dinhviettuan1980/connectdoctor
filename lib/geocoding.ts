export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id?: string;
}

async function fetchNominatim(query: string): Promise<NominatimResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&accept-language=vi`,
    { headers: { "User-Agent": "ConnectDoctor/1.0" } },
  );
  return res.json();
}

export async function geocode(query: string): Promise<NominatimResult[]> {
  const q = query.trim();
  if (!q) return [];

  let results = await fetchNominatim(q);

  // Fallback for Vietnamese alley addresses like "3/59/43 Chùa Bộc"
  if (results.length === 0) {
    const streetOnly = q.replace(/^(\d+[/\-])+\d*\s+/, "").trim();
    if (streetOnly && streetOnly !== q) {
      const prefix = q.slice(0, q.length - streetOnly.length).trim();
      const fallback = await fetchNominatim(streetOnly);
      results = fallback.map((item) => ({
        ...item,
        display_name: prefix ? `${prefix} ${item.display_name}` : item.display_name,
      }));
    }
  }

  return results;
}
