// Utility functions for GIS coordinates, distance calculation, geocoding & directions in Khu phố 3, An Phú

export const KP3_CENTER = {
  lat: 10.936997,
  lng: 106.744645,
  name: "Văn phòng Ban Điều hành Khu phố 3",
  address: "Số 42 Lương Định Của, Phường An Phú, TP. Thủ Đức"
};

// Convert decimal degrees to DMS format (e.g., 10°56'07.5"N 106°44'38.0"E)
export function decimalToDMS(lat: number, lng: number): string {
  const convert = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? "N" : "S") : (val >= 0 ? "E" : "W");
    const absVal = Math.abs(val);
    const deg = Math.floor(absVal);
    const minDouble = (absVal - deg) * 60;
    const min = Math.floor(minDouble);
    const sec = ((minDouble - min) * 60).toFixed(1);
    return `${deg}°${min}'${sec}"${dir}`;
  };
  return `${convert(lat, true)} ${convert(lng, false)}`;
}

// Parse DMS or decimal coordinates string into { lat, lng }
export function parseCoordinates(coordStr?: string): { lat: number; lng: number } | null {
  if (!coordStr) return null;

  // Try simple decimal format first (e.g., "10.936997, 106.744645" or "10.936997 106.744645")
  if (!/[°'\"NSEWnsew]/i.test(coordStr)) {
    const cleanStr = coordStr.trim().replace(/[\[\]\(\)]/g, "");
    const partsDecimal = cleanStr.split(/[\s,;]+/);
    if (partsDecimal.length === 2) {
      const lat = parseFloat(partsDecimal[0]);
      const lng = parseFloat(partsDecimal[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  // Try DMS: e.g., 10°56'07.5"N 106°44'38.0"E
  try {
    const parseDMS = (dmsStr: string) => {
      const match = dmsStr.match(/(\d+)\s*[°d]\s*(\d+)\s*['m]\s*([0-9.]+)\s*["s]?\s*([NSEWnsew])/i);
      if (!match) return null;
      const deg = parseFloat(match[1]);
      const min = parseFloat(match[2]);
      const sec = parseFloat(match[3]);
      const dir = match[4].toUpperCase();
      let decimal = deg + min / 60 + sec / 3600;
      if (dir === "S" || dir === "W") decimal = -decimal;
      return decimal;
    };

    const parts = coordStr.trim().split(/(?<=[NSEWnsew])\s+/);
    if (parts.length >= 2) {
      const lat = parseDMS(parts[0]);
      const lng = parseDMS(parts[1]);
      if (lat !== null && lng !== null) {
        return { lat, lng };
      }
    }
  } catch (err) {
    console.error("Error parsing coordinates:", err);
  }

  return null;
}

// Calculate Haversine distance in meters
export function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Generate deterministic coordinates for address inside Khu phố 3, An Phú boundary
export function generateDefaultCoordinatesForAddress(address: string, seed: string = ""): { lat: number; lng: number; dms: string } {
  // Use hash of address + seed to place within KP3 bounds (lat: ~10.934 to 10.939, lng: ~106.743 to 106.747)
  let hash = 0;
  const str = address + seed;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 10000) / 10000;
  const normalized2 = Math.abs((hash >> 4) % 10000) / 10000;

  // Center around 10.936997, 106.744645 with jitter inside KP3
  const latOffset = (normalized - 0.5) * 0.0035;
  const lngOffset = (normalized2 - 0.5) * 0.0035;

  const lat = Number((KP3_CENTER.lat + latOffset).toFixed(6));
  const lng = Number((KP3_CENTER.lng + lngOffset).toFixed(6));
  const dms = decimalToDMS(lat, lng);

  return { lat, lng, dms };
}

// Construct Google Maps Direct Navigation URL
export function getGoogleMapsDirectionUrl(lat: number, lng: number, address?: string): string {
  const destination = `${lat},${lng}`;
  const query = address ? encodeURIComponent(address) : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${query}&travelmode=driving`;
}

// Generate realistic turn-by-turn route steps inside Khu phố 3
export function generateRouteSteps(
  targetName: string, 
  targetAddress: string, 
  distanceMeters: number
): { instruction: string; distance: string; icon: "straight" | "turn-right" | "turn-left" | "destination" }[] {
  const steps: { instruction: string; distance: string; icon: "straight" | "turn-right" | "turn-left" | "destination" }[] = [];

  const part1 = Math.round(distanceMeters * 0.35);
  const part2 = Math.round(distanceMeters * 0.45);
  const part3 = distanceMeters - part1 - part2;

  steps.push({
    instruction: "Xuất phát từ Văn phòng Ban Điều hành KP3 (42 Lương Định Của), di chuyển theo trục đường chính",
    distance: `${part1}m`,
    icon: "straight"
  });

  if (targetAddress.toLowerCase().includes("hẻm") || targetAddress.includes("/")) {
    steps.push({
      instruction: `Rẽ vào đường nội bộ/hẻm dẫn đến khu dân cư (${targetAddress.split(",")[0]})`,
      distance: `${part2}m`,
      icon: "turn-right"
    });
  } else {
    steps.push({
      instruction: "Tiếp tục chạy thẳng theo đường Lương Định Của hướng về phía điểm ghim",
      distance: `${part2}m`,
      icon: "straight"
    });
  }

  steps.push({
    instruction: `Đến vị trí điểm ghim: ${targetName} (${targetAddress}) - Điểm đến ở bên phải`,
    distance: `${part3}m`,
    icon: "destination"
  });

  return steps;
}

// Calculate polygon perimeter in meters
export function calculatePolygonPerimeterMeters(coords: { lat: number; lng: number }[]): number {
  if (!coords || coords.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < coords.length; i++) {
    const next = (i + 1) % coords.length;
    perimeter += calculateDistanceMeters(coords[i].lat, coords[i].lng, coords[next].lat, coords[next].lng);
  }
  return Math.round(perimeter);
}

// Calculate spherical polygon area in square meters using planar/spherical approximation
export function calculatePolygonAreaMeters(coords: { lat: number; lng: number }[]): number {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137; // Earth's radius in meters
  let total = 0;

  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lng1 = (p1.lng * Math.PI) / 180;
    const lng2 = (p2.lng * Math.PI) / 180;

    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  const area = Math.abs((total * R * R) / 4);
  return Math.round(area);
}

// Check if a point is inside a polygon using ray-casting algorithm
export function isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;

    const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
      (point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Format area to readable string (m² and ha)
export function formatArea(sqMeters: number): string {
  if (sqMeters >= 10000) {
    const ha = (sqMeters / 10000).toFixed(2);
    return `${sqMeters.toLocaleString("vi-VN")} m² (~${ha} ha)`;
  }
  return `${sqMeters.toLocaleString("vi-VN")} m²`;
}

// Format distance in meters
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters} m`;
}

// Calculate geometric center/centroid of an array of points
export function calculateCentroid(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
  if (!points || points.length === 0) return KP3_CENTER;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

// Sort polygon vertices in clockwise order around their centroid to prevent self-intersecting lines
export function sortPointsClockwise(points: { lat: number; lng: number }[]): { lat: number; lng: number }[] {
  if (!points || points.length < 3) return [...points];
  const center = calculateCentroid(points);
  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.lat - center.lat, a.lng - center.lng);
    const angleB = Math.atan2(b.lat - center.lat, b.lng - center.lng);
    return angleA - angleB;
  });
}
