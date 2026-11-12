import { Household, Resident, TargetGisItem } from "../types";
import { generateDefaultCoordinatesForAddress, parseCoordinates as parseGisCoords } from "./gisUtils";

export const isForeignResident = (r: Resident): boolean => {
  return (
    r.isForeigner === true ||
    (Boolean(r.nationality) && r.nationality !== "Việt Nam") ||
    Boolean(r.passportNumber)
  );
};

export const getCountryFlag = (nationality?: string): string => {
  if (!nationality) return "🇻🇳";
  const nat = nationality.toLowerCase();
  if (nat.includes("hàn quốc") || nat.includes("korea")) return "🇰🇷";
  if (nat.includes("anh") || nat.includes("uk") || nat.includes("britain")) return "🇬🇧";
  if (nat.includes("nhật") || nat.includes("japan")) return "🇯🇵";
  if (nat.includes("mỹ") || nat.includes("hoa kỳ") || nat.includes("usa") || nat.includes("united states")) return "🇺🇸";
  if (nat.includes("pháp") || nat.includes("france")) return "🇫🇷";
  if (nat.includes("đức") || nat.includes("germany")) return "🇩🇪";
  if (nat.includes("trung quốc") || nat.includes("china")) return "🇨🇳";
  if (nat.includes("đài loan") || nat.includes("taiwan")) return "🇹🇼";
  if (nat.includes("úc") || nat.includes("australia")) return "🇦🇺";
  if (nat.includes("singapore")) return "🇸🇬";
  if (nat.includes("nga") || nat.includes("russia")) return "🇷🇺";
  if (nat.includes("canada")) return "🇨🇦";
  if (nat.includes("việt nam") || nat.includes("vietnam")) return "🇻🇳";
  return "🌍";
};

export const getVisaExpiryStatus = (validUntil?: string) => {
  if (!validUntil) {
    return {
      status: "unknown",
      daysLeft: null,
      label: "Chưa rõ thời hạn",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }
  const parts = validUntil.split("/");
  if (parts.length !== 3) {
    return {
      status: "unknown",
      daysLeft: null,
      label: validUntil,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }
  const targetDate = new Date(
    parseInt(parts[2]),
    parseInt(parts[1]) - 1,
    parseInt(parts[0])
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      status: "expired",
      daysLeft,
      label: `Đã hết hạn (${Math.abs(daysLeft)} ngày trước)`,
      badgeClass: "bg-rose-50 text-rose-700 border-rose-300 font-bold",
    };
  }
  if (daysLeft <= 30) {
    return {
      status: "expiring_soon",
      daysLeft,
      label: `Sắp hết hạn (${daysLeft} ngày)`,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
    };
  }
  return {
    status: "valid",
    daysLeft,
    label: `Còn hạn đến ${validUntil}`,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
  };
};

export function buildResidentGisTarget(
  res: Resident,
  households: Household[] = []
): TargetGisItem {
  const hh = households.find(
    (h) => h.code === res.householdId || h.id === res.householdId
  );
  let coords = hh?.coordinates;
  if (!coords || !parseGisCoords(coords)) {
    const autoGeo = generateDefaultCoordinatesForAddress(res.address, res.id);
    coords = autoGeo.dms;
  }
  return {
    id: res.id,
    type: "household",
    name: `${res.fullName} (${isForeignResident(res) ? res.nationality || "Nước ngoài" : res.status})`,
    address: res.address,
    coordinates: coords,
    navigateRoute: true,
  };
}

