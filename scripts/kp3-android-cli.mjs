#!/usr/bin/env node
/**
 * KP3 Android UI Automator & Inspector CLI (ADB + UIAutomator XML + Logcat + Screenshot)
 * Cho phép kiểm thử tự động 100% phân hệ & phân hệ nhỏ trên Máy ảo Android 15 (KP3_Pixel_API35)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ADB = path.join(
  process.env.LOCALAPPDATA || "C:\\Users\\Admin\\AppData\\Local",
  "Android",
  "Sdk",
  "platform-tools",
  "adb.exe"
);

function runAdb(args, encoding = "utf8") {
  return execFileSync(ADB, args, { encoding, stdio: ["ignore", "pipe", "pipe"] });
}

function dumpUiNodes() {
  try {
    runAdb(["shell", "uiautomator", "dump", "/sdcard/kp3_ui.xml"]);
  } catch {
    // Ignore transient idle timeout warnings
  }
  const xml = runAdb(["shell", "cat", "/sdcard/kp3_ui.xml"]);
  const nodeRegex = /<node\s+([^>]+?)\/?>/g;
  const nodes = [];
  let match;
  while ((match = nodeRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const getAttr = (name) => {
      const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
      return m ? m[1] : "";
    };
    const text = getAttr("text") || getAttr("content-desc");
    const boundsStr = getAttr("bounds");
    const bMatch = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(boundsStr);
    if (bMatch) {
      const x1 = Number(bMatch[1]);
      const y1 = Number(bMatch[2]);
      const x2 = Number(bMatch[3]);
      const y2 = Number(bMatch[4]);
      nodes.push({
        text: text.trim(),
        cls: getAttr("class"),
        clickable: getAttr("clickable") === "true",
        bounds: { x1, y1, x2, y2, cx: Math.round((x1 + x2) / 2), cy: Math.round((y1 + y2) / 2), w: x2 - x1, h: y2 - y1 },
      });
    }
  }
  return nodes;
}

function tapByText(query) {
  const nodes = dumpUiNodes();
  const q = query.toLowerCase();
  const found =
    nodes.find((n) => n.text.toLowerCase() === q) ||
    nodes.find((n) => n.text.toLowerCase().includes(q));
  if (!found) {
    console.error(`[MISS] Không tìm thấy phần tử chứa text "${query}"`);
    return false;
  }
  runAdb(["shell", "input", "tap", String(found.bounds.cx), String(found.bounds.cy)]);
  console.log(`[TAP] "${found.text}" tại (${found.bounds.cx}, ${found.bounds.cy})`);
  return true;
}

function captureScreen(outPath) {
  const remote = "/sdcard/kp3_cli_shot.png";
  runAdb(["shell", "screencap", "-p", remote]);
  runAdb(["pull", remote, outPath]);
  console.log(`[SCREENSHOT] Đã lưu: ${outPath}`);
}

function checkHealth() {
  const nodes = dumpUiNodes();
  const visibleTexts = nodes.filter((n) => n.text.length > 0).map((n) => n.text);
  const hasErrorBoundary = visibleTexts.some((t) =>
    t.includes("Không thể tải phân hệ") || t.includes("Cannot read properties")
  );
  const crashLog = runAdb(["logcat", "-d", "-s", "AndroidRuntime:E"]).trim();
  const crashLines = crashLog
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("--------- beginning of"));
  return {
    nodeCount: nodes.length,
    visibleSample: visibleTexts.slice(0, 18),
    hasErrorBoundary,
    nativeCrashes: crashLines.length,
  };
}

const [, , cmd, arg1, arg2] = process.argv;
if (cmd === "inspect") {
  console.log(JSON.stringify(checkHealth(), null, 2));
} else if (cmd === "tap-text" && arg1) {
  tapByText(arg1);
} else if (cmd === "shot" && arg1) {
  captureScreen(arg1);
} else {
  console.log("Usage: node scripts/kp3-android-cli.mjs <inspect | tap-text <label> | shot <path>>");
}
