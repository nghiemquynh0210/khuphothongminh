import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  Landmark,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  Association,
  ScheduleEvent,
  TaskItem,
} from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import {
  AnalyzedScheduleCandidate,
  ParsedWardScheduleDocument,
  SAMPLE_PARTY_WARD_SCHEDULE_45_LLV,
  SAMPLE_UBND_WARD_SCHEDULE_16_21_NOV,
  SuggestedFollowUpTask,
  analyzeWardDocumentsForKp3,
  extractWardScheduleFromFile,
  inferSessionPeriod,
  parseVietnameseWardScheduleText,
} from "../../utils/wardScheduleAnalyzer";

interface WardScheduleOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  associations: Association[];
  existingSchedules: ScheduleEvent[];
  existingTasksCount: number;
  creatorLabel: string;
  onConfirmImport: (payload: {
    newSchedules: ScheduleEvent[];
    newTasks: TaskItem[];
  }) => void;
}

export const WardScheduleOcrModal: React.FC<WardScheduleOcrModalProps> = ({
  isOpen,
  onClose,
  associations,
  existingSchedules,
  existingTasksCount,
  creatorLabel,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pastedTextA, setPastedTextA] = useState("");
  const [pastedTextB, setPastedTextB] = useState("");
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [parsedDocs, setParsedDocs] = useState<ParsedWardScheduleDocument[]>([]);
  const [candidates, setCandidates] = useState<AnalyzedScheduleCandidate[]>([]);
  const [reviewTab, setReviewTab] = useState<"kp3" | "tasks" | "ward_ref">("kp3");
  const [saveWardReferenceItems, setSaveWardReferenceItems] = useState(false);

  const allKp3RosterOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{
      name: string;
      role: string;
      associationId: string;
      phone?: string;
    }> = [];
    for (const assoc of associations) {
      for (const m of assoc.members || []) {
        const key = `${m.fullName.toLowerCase()}|${assoc.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            name: m.fullName,
            role: `${m.role} (${assoc.name})`,
            associationId: assoc.id,
            phone: m.phone,
          });
        }
      }
    }
    return list;
  }, [associations]);

  const runAnalysis = (docs: ParsedWardScheduleDocument[]) => {
    setParsedDocs(docs);
    const analyzed = analyzeWardDocumentsForKp3(
      docs,
      associations,
      existingSchedules
    );
    setCandidates(analyzed);
    setReviewTab("kp3");
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    e.target.value = "";

    setIsScanning(true);
    setScanError(null);
    setUploadedFileNames(files.map((f) => f.name));

    try {
      const results: ParsedWardScheduleDocument[] = [];
      for (const file of files) {
        const doc = await extractWardScheduleFromFile(file);
        if (doc && doc.entries.length > 0) {
          results.push(doc);
        }
      }

      if (results.length === 0) {
        setScanError(
          "Không đọc được nội dung lịch từ tệp tải lên. Vui lòng thử tệp rõ nét hơn hoặc chuyển sang tab 'Dán văn bản Lịch Đảng ủy / UBND'."
        );
      } else {
        runAnalysis(results);
      }
    } catch {
      setScanError("Không thể phân tích tệp tải lên. Vui lòng thử lại hoặc dán văn bản lịch.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyzePastedText = () => {
    setScanError(null);
    const docs: ParsedWardScheduleDocument[] = [];
    if (pastedTextA.trim()) {
      const d1 = parseVietnameseWardScheduleText(pastedTextA);
      if (d1.entries.length > 0) docs.push(d1);
    }
    if (pastedTextB.trim()) {
      const d2 = parseVietnameseWardScheduleText(pastedTextB);
      if (d2.entries.length > 0) docs.push(d2);
    }
    if (docs.length === 0) {
      setScanError(
        "Chưa phát hiện được cấu trúc Thứ / Ngày (VD: 'THỨ HAI 16/11/2026'). Vui lòng kiểm tra lại nội dung văn bản đã dán."
      );
      return;
    }
    runAnalysis(docs);
  };

  const handleLoadRealAnPhuSample = () => {
    setScanError(null);
    setUploadedFileNames([
      "45-LLV-DU_Dang_uy_Phuong_An_Phu_16-22_11_2026.pdf",
      "Lich_lam_viec_UBND_Phuong_An_Phu_16-21_11_2026.pdf",
    ]);
    const docParty = parseVietnameseWardScheduleText(
      SAMPLE_PARTY_WARD_SCHEDULE_45_LLV,
      "party_ward"
    );
    const docUbnd = parseVietnameseWardScheduleText(
      SAMPLE_UBND_WARD_SCHEDULE_16_21_NOV,
      "ubnd_ward"
    );
    runAnalysis([docParty, docUbnd]);
  };

  const handleReset = () => {
    setParsedDocs([]);
    setCandidates([]);
    setScanError(null);
    setUploadedFileNames([]);
  };

  const kp3Candidates = useMemo(
    () => candidates.filter((c) => c.relevanceTier !== "ward_reference"),
    [candidates]
  );
  const wardRefCandidates = useMemo(
    () => candidates.filter((c) => c.relevanceTier === "ward_reference"),
    [candidates]
  );
  const allSuggestedTasks = useMemo(
    () =>
      candidates.flatMap((c) =>
        c.suggestedTasks.map((t) => ({
          ...t,
          parentTempId: c.tempId,
          parentDate: c.date,
          parentTitle: c.title,
        }))
      ),
    [candidates]
  );

  const selectedKp3Count = kp3Candidates.filter((c) => c.selected).length;
  const selectedTasksCount = allSuggestedTasks.filter((t) => t.selected).length;

  const toggleCandidateSelected = (tempId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, selected: !c.selected } : c))
    );
  };

  const updateCandidateField = (
    tempId: string,
    patch: Partial<AnalyzedScheduleCandidate>
  ) => {
    setCandidates((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, ...patch } : c))
    );
  };

  const handleAddOfficerToCandidate = (tempId: string, encodedVal: string) => {
    if (!encodedVal) return;
    const found = allKp3RosterOptions.find(
      (o) => `${o.name}|${o.associationId}` === encodedVal
    );
    if (!found) return;
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.tempId !== tempId) return c;
        if (
          c.assignedOfficers.some(
            (x) => x.name.toLowerCase() === found.name.toLowerCase()
          )
        ) {
          return c;
        }
        return {
          ...c,
          assignedOfficers: [
            ...c.assignedOfficers,
            {
              name: found.name,
              role: found.role,
              associationId: found.associationId,
              phone: found.phone,
              attendanceRole: "primary",
            },
          ],
        };
      })
    );
  };

  const handleRemoveOfficerFromCandidate = (tempId: string, officerName: string) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.tempId === tempId
          ? {
              ...c,
              assignedOfficers: c.assignedOfficers.filter(
                (o) => o.name !== officerName
              ),
            }
          : c
      )
    );
  };

  const toggleSuggestedTask = (parentTempId: string, taskId: string) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.tempId === parentTempId
          ? {
              ...c,
              suggestedTasks: c.suggestedTasks.map((t) =>
                t.id === taskId ? { ...t, selected: !t.selected } : t
              ),
            }
          : c
      )
    );
  };

  const handleConfirmSyncAll = () => {
    const nowIso = new Date().toISOString();
    const todayIso = nowIso.slice(0, 10);
    const createdSchedules: ScheduleEvent[] = [];
    const createdTasks: TaskItem[] = [];
    let taskSeq = existingTasksCount + 1;

    const toImport = candidates.filter((c) =>
      c.relevanceTier === "ward_reference" ? saveWardReferenceItems && !c.existingDuplicateId : c.selected
    );

    toImport.forEach((cand, idx) => {
      const schId = `SCH-WARD-${cand.date.replace(/-/g, "")}-${idx + 1}-${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`;

      const linkedTaskIds: string[] = [];

      if (cand.relevanceTier !== "ward_reference") {
        cand.suggestedTasks
          .filter((t) => t.selected)
          .forEach((st) => {
            const newTaskId =
              typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `00000000-0000-4000-8000-${(Date.now() + taskSeq++).toString(16).padStart(12, "0").slice(-12)}`;
            linkedTaskIds.push(newTaskId);
            createdTasks.push({
              id: newTaskId,
              title: st.title,
              description: st.description,
              unit: st.unit,
              associationId: st.associationId,
              assignee: {
                name: st.assigneeName,
                role: st.assigneeRole,
                unit: st.unit,
                phone: st.assigneePhone,
              },
              creator: `${creatorLabel} (Từ AI OCR ${cand.sourceDocNumber})`,
              priority: st.priority,
              status: "Chờ xử lý",
              progressPercent: 0,
              startDate: todayIso,
              deadline: st.deadline,
              linkedScheduleId: schId,
              sourceDocNumber: cand.sourceDocNumber,
              notes: `Tự động trích xuất từ lịch công tác cấp trên (${cand.sourceDocNumber})`,
            });
          });
      }

      const attendeesSummary =
        cand.assignedOfficers.length > 0
          ? cand.assignedOfficers
              .map((o) => `${o.name} (${o.role})`)
              .join("; ")
          : cand.participantsRaw || "Theo thành phần triệu tập của Phường";

      const eventType =
        cand.sourceLevel === "party_ward"
          ? "Lịch Đảng ủy Phường"
          : cand.sourceLevel === "merged_ward"
          ? "Hội nghị Khu phố"
          : "Lịch UBND Phường";

      createdSchedules.push({
        id: schId,
        title: cand.title,
        type: eventType,
        date: cand.date,
        time: cand.timeRange,
        sessionPeriod: inferSessionPeriod(cand.startTime),
        location: cand.location,
        host: cand.hostLeader,
        attendees: attendeesSummary,
        status: "Sắp diễn ra",
        description: cand.description,
        content: cand.participantsRaw
          ? `Thành phần mời dự: ${cand.participantsRaw}`
          : cand.description,
        notes: cand.directiveNotes || `Nguồn: ${cand.sourceDocNumber}`,
        sourceLevel: cand.sourceLevel,
        sourceDocNumber: cand.sourceDocNumber,
        relevanceTier: cand.relevanceTier,
        assignedOfficers:
          cand.assignedOfficers.length > 0 ? cand.assignedOfficers : undefined,
        linkedTaskIds: linkedTaskIds.length > 0 ? linkedTaskIds : undefined,
        adjustmentLogs: [
          {
            id: `LOG-INIT-${Date.now()}-${idx}`,
            changedAt: nowIso,
            changedBy: creatorLabel,
            actionType: cand.mergedFromBothDocs ? "ocr_merge" : "ocr_import",
            newDate: cand.date,
            newTime: cand.timeRange,
            newLocation: cand.location,
            reason: cand.mergedFromBothDocs
              ? `Hợp nhất tự động từ Lịch Đảng ủy & UBND Phường (${cand.sourceDocNumber})`
              : `Trích xuất AI OCR từ ${cand.sourceDocNumber}`,
          },
        ],
      });
    });

    onConfirmImport({
      newSchedules: createdSchedules,
      newTasks: createdTasks,
    });
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="AI Đọc Lịch Công Tác Cấp Trên (Đảng ủy / UBND Phường) & Tự Lên Lịch KP3"
      description="Tự động phân tích PDF/Ảnh nhiều trang, khử trùng liên văn bản, phân công đúng cán bộ KP3 đương nhiệm & tách nhiệm vụ chuẩn bị"
      footer={
        candidates.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={handleReset}
            >
              Quét văn bản khác
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={selectedKp3Count === 0 && !saveWardReferenceItems}
                leftIcon={<CheckCircle2 size={16} />}
                onClick={handleConfirmSyncAll}
              >
                Đồng bộ {selectedKp3Count} Lịch KP3
                {selectedTasksCount > 0 ? ` & Giao ${selectedTasksCount} Việc` : ""}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end w-full">
            <Button variant="secondary" size="md" onClick={onClose}>
              Đóng
            </Button>
          </div>
        )
      }
    >
      {candidates.length === 0 ? (
        <div className="space-y-4">
          {/* Chế độ nạp dữ liệu */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInputMode("upload")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  inputMode === "upload"
                    ? "bg-white text-emerald-900 border border-slate-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileUp size={14} />
                <span>Tải tệp PDF / Ảnh lịch cấp trên</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  inputMode === "paste"
                    ? "bg-white text-emerald-900 border border-slate-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText size={14} />
                <span>Dán văn bản Lịch Đảng ủy / UBND</span>
              </button>
            </div>
          </div>

          {scanError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{scanError}</p>
            </div>
          )}

          {inputMode === "upload" ? (
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl p-7 text-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*,.txt"
                onChange={handleFilesSelected}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto">
                {isScanning ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <FileUp size={24} />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  {isScanning
                    ? "AI Gemini Vision đang đọc toàn bộ các trang lịch công tác..."
                    : "Chọn 1 hoặc nhiều tệp Lịch làm việc (PDF / Hình ảnh)"}
                </h4>
              </div>
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={isScanning}
                  leftIcon={<FileUp size={15} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Chọn tệp PDF / Hình ảnh từ máy
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isScanning}
                  leftIcon={<Sparkles size={15} />}
                  onClick={handleLoadRealAnPhuSample}
                >
                  Chạy thử 02 Lịch Phường An Phú (Tuần 16/11 – 22/11)
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Landmark size={13} />
                    <span>Văn bản 1: Lịch Đảng ủy Phường (hoặc lịch bất kỳ)</span>
                  </label>
                  <textarea
                    rows={8}
                    value={pastedTextA}
                    onChange={(e) => setPastedTextA(e.target.value)}
                    placeholder="Dán nội dung Lịch làm việc của Đảng ủy Phường (THỨ HAI 16/11/2026...)"
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Building2 size={13} />
                    <span>Văn bản 2 (Tùy chọn): Lịch UBND Phường cùng tuần để gộp trùng</span>
                  </label>
                  <textarea
                    rows={8}
                    value={pastedTextB}
                    onChange={(e) => setPastedTextB(e.target.value)}
                    placeholder="Dán nội dung Lịch làm việc của HĐND - UBND Phường (THỨ HAI – 16/11/2026...)"
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Sparkles size={15} />}
                  onClick={handleAnalyzePastedText}
                >
                  Phân tích & Lên lịch tự động cho KP3
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* KPI Kết quả bóc tách */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Nguồn văn bản đã đọc
              </span>
              <span className="text-base font-black text-slate-900">
                {parsedDocs.length} văn bản ({candidates.length} mục)
              </span>
              <span className="text-[11px] text-slate-600 truncate block">
                {uploadedFileNames.length > 0
                  ? uploadedFileNames.join(" + ")
                  : parsedDocs.map((d) => d.documentNumber).join(" + ")}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-800 block">
                Lịch triệu tập / liên quan KP3
              </span>
              <span className="text-base font-black text-emerald-950">
                {kp3Candidates.length} buổi họp
              </span>
              <span className="text-[11px] text-emerald-800 block">
                Đã gộp trùng:{" "}
                {kp3Candidates.filter((c) => c.mergedFromBothDocs).length} buổi
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-800 block">
                Nhiệm vụ chuẩn bị phát sinh
              </span>
              <span className="text-base font-black text-amber-950">
                {allSuggestedTasks.length} đầu việc
              </span>
              <span className="text-[11px] text-amber-800 block">
                Đang chọn giao: {selectedTasksCount} việc
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-800 block">
                Lịch nội bộ Lãnh đạo Phường
              </span>
              <span className="text-base font-black text-blue-950">
                {wardRefCandidates.length} mục riêng
              </span>
              <span className="text-[11px] text-blue-800 block">
                Tách riêng không làm rối lịch KP3
              </span>
            </div>
          </div>

          {/* Sub-tabs kết quả */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReviewTab("kp3")}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  reviewTab === "kp3"
                    ? "bg-emerald-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Lịch của Cán bộ KP3 ({kp3Candidates.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("tasks")}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  reviewTab === "tasks"
                    ? "bg-amber-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Nhiệm vụ phát sinh ({allSuggestedTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("ward_ref")}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                  reviewTab === "ward_ref"
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Lịch Lãnh đạo Phường tham khảo ({wardRefCandidates.length})
              </button>
            </div>

            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveWardReferenceItems}
                onChange={(e) => setSaveWardReferenceItems(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700"
              />
              <span>Lưu kèm lịch Lãnh đạo Phường vào ngăn Tra cứu</span>
            </label>
          </div>

          {/* Tab 1: Danh sách lịch KP3 */}
          {reviewTab === "kp3" && (
            <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
              {kp3Candidates.map((cand) => (
                <div
                  key={cand.tempId}
                  className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                    cand.selected
                      ? "bg-white border-emerald-300 shadow-2xs"
                      : "bg-slate-50/80 border-slate-200 opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={cand.selected}
                        onChange={() => toggleCandidateSelected(cand.tempId)}
                        className="mt-1 rounded border-slate-300 text-emerald-700"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px]">
                            {cand.dayOfWeekLabel} • {cand.date.split("-").reverse().join("/")} ({cand.sessionPeriod})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] border ${
                              cand.relevanceTier === "mandatory_kp3"
                                ? "bg-rose-50 text-rose-900 border-rose-200"
                                : "bg-amber-50 text-amber-900 border-amber-200"
                            }`}
                          >
                            {cand.relevanceTier === "mandatory_kp3"
                              ? "Triệu tập KP3"
                              : "Phối hợp địa bàn"}
                          </span>
                          {cand.mergedFromBothDocs && (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-[11px] inline-flex items-center gap-1">
                              <Layers size={11} /> Đã gộp Lịch Đảng ủy & UBND
                            </span>
                          )}
                          {cand.existingDuplicateId && (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[11px]">
                              Đã có trong lịch KP3
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {cand.title}
                        </h4>
                        <p className="text-[11.5px] text-slate-600">
                          {cand.relevanceReason} • Nguồn: <strong>{cand.sourceDocNumber}</strong>
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Chỉnh nhanh Giờ & Địa điểm ngay trước khi lưu */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-6">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <Clock size={13} className="text-emerald-700 shrink-0" />
                      <input
                        type="text"
                        aria-label="Khung giờ họp"
                        value={cand.timeRange}
                        onChange={(e) =>
                          updateCandidateField(cand.tempId, {
                            timeRange: e.target.value,
                          })
                        }
                        className="bg-transparent font-mono font-bold text-slate-900 w-full focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <MapPin size={13} className="text-slate-500 shrink-0" />
                      <input
                        type="text"
                        aria-label="Địa điểm họp"
                        value={cand.location}
                        onChange={(e) =>
                          updateCandidateField(cand.tempId, {
                            location: e.target.value,
                          })
                        }
                        className="bg-transparent font-medium text-slate-900 w-full focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Danh sách cán bộ KP3 được AI tự động phân công */}
                  <div className="pl-6 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1">
                        <UserCheck size={13} className="text-emerald-700" />
                        Phân công cán bộ KP3 tham dự:
                      </span>
                      {cand.assignedOfficers.map((off) => (
                        <span
                          key={off.name}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-200 font-bold text-[11.5px]"
                        >
                          <span>
                            {off.name} ({off.role})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveOfficerFromCandidate(cand.tempId, off.name)
                            }
                            aria-label={`Bỏ phân công ${off.name}`}
                            className="text-emerald-700 hover:text-rose-700 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <select
                        aria-label="Thêm cán bộ KP3 tham dự"
                        value=""
                        onChange={(e) =>
                          handleAddOfficerToCandidate(cand.tempId, e.target.value)
                        }
                        className="px-2 py-1 rounded-lg border border-dashed border-slate-300 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="">+ Thêm / Đổi cán bộ KP3...</option>
                        {allKp3RosterOptions.map((opt) => (
                          <option
                            key={`${opt.name}|${opt.associationId}`}
                            value={`${opt.name}|${opt.associationId}`}
                          >
                            {opt.name} — {opt.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {cand.namedPersonWarning && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-1.5">
                        <AlertTriangle size={13} className="text-amber-700 shrink-0 mt-0.5" />
                        <span>{cand.namedPersonWarning}</span>
                      </div>
                    )}

                    {cand.conflictWithIds && cand.conflictWithIds.length > 0 && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-900 font-semibold flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-rose-700 shrink-0" />
                        <span>
                          Trùng khung giờ với lịch hiện có ({cand.conflictWithIds.join(", ")}). Bạn có thể cử người đi thay sau khi đồng bộ.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Nhiệm vụ phát sinh */}
          {reviewTab === "tasks" && (
            <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
              {allSuggestedTasks.length === 0 ? (
                <p className="text-center py-8 text-slate-500">
                  Không có nhiệm vụ chuẩn bị phụ trợ nào phát sinh từ văn bản này.
                </p>
              ) : (
                allSuggestedTasks.map((t) => (
                  <label
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-2.5 cursor-pointer hover:border-amber-300"
                  >
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={() => toggleSuggestedTask(t.parentTempId, t.id)}
                      className="mt-1 rounded border-slate-300 text-amber-700"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {t.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold text-[11px]">
                          Hạn xong: {t.deadline.split("-").reverse().join("/")}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{t.description}</p>
                      <div className="text-[11px] font-semibold text-emerald-800">
                        Giao cho: {t.assigneeName} ({t.assigneeRole}) • Đơn vị: {t.unit}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Lịch lãnh đạo Phường tham khảo */}
          {reviewTab === "ward_ref" && (
            <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1">
              {wardRefCandidates.map((c) => (
                <div
                  key={c.tempId}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800">
                        {c.dayOfWeekLabel} ({c.date.split("-").reverse().join("/")}) • {c.startTime}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10.5px] font-semibold text-slate-600">
                        {c.sourceDocNumber}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="text-[11px] text-slate-600">
                      Chủ trì: {c.hostLeader} • Địa điểm: {c.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
