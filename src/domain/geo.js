// Distância em linha reta entre dois pontos (fórmula de Haversine), em km com 1 casa.
const RAIO_TERRA_KM = 6371;
const rad = (graus) => (graus * Math.PI) / 180;

export function distanciaKm(a, b) {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  const km = 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
  return Math.round(km * 10) / 10;
}
