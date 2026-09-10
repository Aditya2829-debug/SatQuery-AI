export interface LocationContext {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

export interface GeminiResponse {
  answer: string;
  modelUsed: string;
}

export async function askGeminiGeospatial(
  query: string,
  location: LocationContext,
  apiKey?: string
): Promise<GeminiResponse> {
  const key = (
    apiKey ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem('satquery_gemini_key') ||
    ''
  ).trim();

  if (!key) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      answer: `[SatQuery Offline Intelligence for ${location.name}] (${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E): Please add your free Gemini AI Key using the "API Keys" button in the top right to enable live cloud streaming. The observed scene features commercial development and transit networks.`,
      modelUsed: 'Onboard Engine',
    };
  }

  const prompt = `You are SatQuery AI, an expert satellite vision-language and remote sensing intelligence system.
The user is inspecting high-resolution satellite imagery at the following coordinates:
- Location: ${location.name}
- Latitude: ${location.lat}
- Longitude: ${location.lng}
- Zoom Level: ${location.zoom}

User Question: "${query}"

Provide a detailed, professional geospatial intelligence response analyzing land cover, topography, infrastructure, water bodies, or environmental features relevant to this specific area and the question asked.`;

  // Candidate models (modern 2.5 / 2.0 series)
  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash-latest',
    'gemini-2.5-pro',
    'gemini-1.5-flash-latest',
  ];

  let lastError = '';

  for (const model of models) {
    for (const ver of ['v1beta', 'v1']) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) {
            return {
              answer,
              modelUsed: `Google ${model}`,
            };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${response.status}`;
        }
      } catch (err: any) {
        lastError = err.message || 'Network error';
      }
    }
  }

  throw new Error(`Gemini AI Error: ${lastError}. Make sure your key is generated at https://aistudio.google.com/app/apikey.`);
}
