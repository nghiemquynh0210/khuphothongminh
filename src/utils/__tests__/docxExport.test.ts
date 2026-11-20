// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { downloadOfficialDocx, DocxOfficialFormOptions } from "../docxExport";

describe("docxExport Utility (Nghị định 30/2020/NĐ-CP & docx Skill)", () => {
  it("khởi tạo và đóng gói thành công file .docx chuẩn hành chính", async () => {
    // Mock URL.createObjectURL and HTML anchor click for jsdom environment
    const revokeMock = vi.fn();
    const createObjectUrlMock = vi.fn(() => "blob:http://localhost:3000/mock-docx");
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");

    globalThis.URL.createObjectURL = createObjectUrlMock;
    globalThis.URL.revokeObjectURL = revokeMock;

    const options: DocxOfficialFormOptions = {
      title: "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ (CT01)",
      rawContent: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
------------------
Kính gửi: Công an Phường An Phú, TP. Hồ Chí Minh
1. Họ và tên người kê khai: Nguyễn Văn A
2. Nơi cư trú hiện nay: Khu phố 3, Phường An Phú, TP. Hồ Chí Minh
3. Nội dung đề nghị: Đăng ký thường trú theo quy định`,
      signerLeftTitle: "NGƯỜI KÊ KHAI",
      signerLeftName: "Nguyễn Văn A",
      signerRightTitle: "TM. BAN ĐIỀU HÀNH KHU PHỐ 3",
      signerRightName: "Nguyễn Trung Huy",
      documentNumber: "Mẫu CT01/KP3",
    };

    await expect(downloadOfficialDocx(options, "CT01_Test.docx")).resolves.not.toThrow();

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(revokeMock).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it("xử lý an toàn khi nội dung văn bản chứa các dòng trống hoặc ký tự đặc biệt", async () => {
    const options: DocxOfficialFormOptions = {
      title: "GIẤY XÁC NHẬN TẠM TRÚ (CT08)",
      rawContent: "\n\nĐIỀU 1. XÁC NHẬN CƯ TRÚ\n\nNội dung chi tiết...\n\n",
    };

    await expect(downloadOfficialDocx(options)).resolves.not.toThrow();
  });
});
