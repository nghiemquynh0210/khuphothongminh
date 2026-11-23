import React, { useEffect, useState } from "react";
import { CheckCircle2, QrCode } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function PublicHostelCheckinModal() {
  const [hostelInfo, setHostelInfo] = useState<{
    id: string;
    name: string;
    addr: string;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ">("Nam");
  const [birthDate, setBirthDate] = useState("");
  const [cccd, setCccd] = useState("");
  const [phone, setPhone] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneCode, setDoneCode] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("hostel_checkin");
    const name = params.get("hostel_name");
    const addr = params.get("hostel_addr") || "Khu phố 3, Phường An Phú, TP. Hồ Chí Minh";
    if (id && name) {
      setHostelInfo({ id, name, addr });
    }
  }, []);

  const handleClose = () => {
    setHostelInfo(null);
    if (typeof window !== "undefined") {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelInfo) return;
    setErrMsg(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "public_submit_hostel_checkin",
          hostelId: hostelInfo.id,
          hostelName: hostelInfo.name,
          hostelAddress: hostelInfo.addr,
          roomNumber,
          fullName,
          gender,
          birthDate,
          cccd,
          phone,
          permanentAddress,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setErrMsg(data?.error || "Gửi tờ khai chưa thành công, vui lòng kiểm tra lại thông tin.");
        return;
      }
      setDoneCode(data.id || "OK");
    } catch {
      setErrMsg("Không kết nối được máy chủ, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hostelInfo) return null;

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      size="md"
      title={`Khai báo Lưu trú Tạm thời — ${hostelInfo.name}`}
      description={hostelInfo.addr}
      footer={
        doneCode ? (
          <Button variant="emerald" onClick={handleClose}>
            Hoàn tất &amp; Đóng
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="public-hostel-checkin-form"
              variant="emerald"
              isLoading={isSubmitting}
            >
              Gửi Tờ Khai Lưu Trú
            </Button>
          </>
        )
      }
    >
      {doneCode ? (
        <div className="py-6 text-center space-y-2 text-xs">
          <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
          <h4 className="text-sm font-extrabold text-slate-900">
            Đã tiếp nhận tờ khai lưu trú thành công!
          </h4>
          <p className="text-slate-600 leading-relaxed">
            Mã tờ khai: <strong>{doneCode}</strong>. Chủ cơ sở <strong>{hostelInfo.name}</strong> và
            Cảnh sát khu vực Khu phố 3 đã nhận được thông tin để đối chiếu đăng ký tạm trú CT08 theo
            quy định.
          </p>
        </div>
      ) : (
        <form id="public-hostel-checkin-form" onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 font-medium">
            <QrCode size={15} className="shrink-0 text-emerald-700" />
            <span>
              Thông tin được bảo mật theo Luật Cư trú &amp; chỉ phục vụ đối chiếu tạm trú tại Khu
              phố 3, Phường An Phú.
            </span>
          </div>

          {errMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {errMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8">
              <label htmlFor="chk-fullname" className="font-semibold text-slate-700 block mb-1">
                Họ và tên khai sinh <span className="text-rose-600">*</span>
              </label>
              <input
                id="chk-fullname"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="NGUYỄN VĂN A"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <div className="sm:col-span-4">
              <label htmlFor="chk-gender" className="font-semibold text-slate-700 block mb-1">
                Giới tính
              </label>
              <select
                id="chk-gender"
                name="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as "Nam" | "Nữ")}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label htmlFor="chk-dob" className="font-semibold text-slate-700 block mb-1">
                Ngày/Tháng/Năm sinh <span className="text-rose-600">*</span>
              </label>
              <input
                id="chk-dob"
                name="birthDate"
                type="text"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="15/08/1998"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label htmlFor="chk-cccd" className="font-semibold text-slate-700 block mb-1">
                Số CCCD (12 số) <span className="text-rose-600">*</span>
              </label>
              <input
                id="chk-cccd"
                name="cccd"
                type="text"
                required
                value={cccd}
                onChange={(e) => setCccd(e.target.value)}
                placeholder="07909800xxxx"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="chk-room" className="font-semibold text-slate-700 block mb-1">
                Số phòng trọ
              </label>
              <input
                id="chk-room"
                name="roomNumber"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="VD: P.04"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="chk-phone" className="font-semibold text-slate-700 block mb-1">
              Số điện thoại liên hệ <span className="text-rose-600">*</span>
            </label>
            <input
              id="chk-phone"
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label htmlFor="chk-perm" className="font-semibold text-slate-700 block mb-1">
              Địa chỉ thường trú gốc (theo CCCD) <span className="text-rose-600">*</span>
            </label>
            <input
              id="chk-perm"
              name="permanentAddress"
              type="text"
              required
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              placeholder="Xã/Phường, Tỉnh/Thành phố..."
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
