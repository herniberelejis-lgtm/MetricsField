async function fetchGooglePlaceStats(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount",
    },
  });

  if (!res.ok) {
    console.error(`Places API respondió ${res.status} para place_id ${placeId}`);
    return null;
  }

  const data = await res.json();
  if (typeof data.rating !== "number") return null;
  return { rating: data.rating, totalReseñas: data.userRatingCount ?? 0 };
}

async function searchGooglePlace(query) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !query.trim()) return null;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "AR", languageCode: "es" }),
  });

  if (!res.ok) {
    console.error(`Places API (searchText) respondió ${res.status}`);
    return null;
  }

  const data = await res.json();
  return (data.places ?? []).map((p) => ({
    placeId: p.id,
    nombre: p.displayName?.text ?? "(sin nombre)",
    direccion: p.formattedAddress ?? "",
  }));
}

module.exports = { fetchGooglePlaceStats, searchGooglePlace };
