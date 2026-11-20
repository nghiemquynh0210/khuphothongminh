/**
 * Tự động suy luận trạng thái Tạm vắng cho cư dân Thường trú
 * có Nơi ở hiện tại ngoài địa bàn KP3 An Phú.
 * KHÔNG ghi đè CSDL — chỉ dùng cho hiển thị frontend.
 */

function normalizeAddress(addr: string): string {
  return addr.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
}

function isAddressInKP3AnPhu(address: string): boolean {
  if (!address) return false;
  const n = normalizeAddress(address);
  const hasKP3 =
    n.includes("khu phố 3") ||
    n.includes("khu phốn 3") ||
    n.includes("kp3") ||
    n.includes("khu pho 3");
  const hasAnPhu =
    n.includes("an phú") ||
    n.includes("an phu") ||
    n.includes("phường an phú");
  return hasKP3 && hasAnPhu;
}

export function isCurrentAddressOutsideKP3AnPhu(currentAddress: string): boolean {
  if (!currentAddress || currentAddress.trim() === "" || currentAddress === "Chưa cập nhật") return false;
  return !isAddressInKP3AnPhu(currentAddress);
}

export type EffectiveResidencyStatus = "Thường trú" | "Tạm trú" | "Tạm vắng";

export function getEffectiveResidencyStatus(resident: {
  status?: string;
  permanentAddress?: string;
  currentAddress?: string;
}): EffectiveResidencyStatus {
  const status = resident.status || "";
  if (status !== "Thường trú") return status as EffectiveResidencyStatus;

  const permAddr = resident.permanentAddress || "";
  if (!permAddr || !isAddressInKP3AnPhu(permAddr)) return "Thường trú";

  const curAddr = resident.currentAddress || "";
  if (curAddr && isCurrentAddressOutsideKP3AnPhu(curAddr)) return "Tạm vắng";

  return "Thường trú";
}

export function isResidentEffectivelyTamVang(resident: {
  status?: string;
  permanentAddress?: string;
  currentAddress?: string;
}): boolean {
  return getEffectiveResidencyStatus(resident) === "Tạm vắng";
}
