import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import jsQR from "jsqr";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug, getCampusByCode } from "../modules/campus/catalog";

type LookupResult = Awaited<ReturnType<typeof api.lookupPaymentByRef>>;

type ScanState = "idle" | "scanning" | "found" | "manual_lookup" | "not_found" | "error";

export function StaffPaymentScannerPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [manualRef, setManualRef] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lastScannedRaw, setLastScannedRaw] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const processFrame = useCallback(
    (token: string) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => processFrame(token));
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code) {
        try {
          const payload = JSON.parse(code.data);
          if (payload?.type === "UGCLEAR_PAYMENT" && payload.txRef) {
            stopCamera();
            setLastScannedRaw(code.data);
            setScanState("found");
            doLookup(token, payload.txRef);
            return;
          }
        } catch {
        }
      }
      rafRef.current = requestAnimationFrame(() => processFrame(token));
    },
    [stopCamera]
  );

  const startCamera = useCallback(async () => {
    setScanState("scanning");
    setCameraError(null);
    setResult(null);
    setLookupError(null);
    setLastScannedRaw(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (token) rafRef.current = requestAnimationFrame(() => processFrame(token));
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Camera access denied.");
      setScanState("idle");
    }
  }, [token, processFrame]);

  async function doLookup(tok: string, ref: string) {
    setLookupLoading(true);
    setLookupError(null);
    try {
      const data = await api.lookupPaymentByRef(tok, ref);
      setResult(data);
      setScanState("found");
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Not found";
      if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
        setScanState("not_found");
      } else {
        setScanState("error");
        setLookupError(msg);
      }
    } finally {
      setLookupLoading(false);
    }
  }

  function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !manualRef.trim()) return;
    stopCamera();
    setScanState("found");
    doLookup(token, manualRef.trim());
  }

  function handleReset() {
    setResult(null);
    setLookupError(null);
    setLastScannedRaw(null);
    setManualRef("");
    setScanState("idle");
  }

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const statusMeta = result
    ? result.status === "VERIFIED"
      ? { label: t("paymentVerified"), color: "bg-green-100 text-green-800", icon: "verified", ring: "ring-green-400" }
      : result.status === "PENDING"
      ? { label: t("pendingVerification"), color: "bg-amber-100 text-amber-800", icon: "hourglass_top", ring: "ring-amber-400" }
      : { label: result.status, color: "bg-surface-container text-on-surface-variant", icon: "info", ring: "ring-outline-variant" }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background font-body text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant/20 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="w-px h-6 bg-outline-variant/40" />
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">{t("scanQrTitle")}</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {campus?.name ?? t("paymentVerification")}
              </p>
            </div>
          </div>
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">

        {/* ── Idle state ── */}
        {scanState === "idle" && (
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="flex size-24 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[48px]">qr_code_scanner</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-on-surface">{t("scanQrTitle")}</h2>
              <p className="mt-1 text-sm text-on-surface-variant max-w-sm">{t("scanQrDesc")}</p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              {t("startCamera")}
            </button>

            <div className="w-full max-w-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/30" />
                <span className="text-xs text-on-surface-variant">{t("orEnterManually")}</span>
                <div className="h-px flex-1 bg-outline-variant/30" />
              </div>
              <form onSubmit={handleManualLookup} className="flex gap-2">
                <input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder={t("enterTxRefOrReceipt")}
                  className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!manualRef.trim() || !token}
                  className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-on-secondary disabled:opacity-40"
                >
                  {t("lookup")}
                </button>
              </form>
            </div>

            {cameraError && (
              <div className="w-full max-w-sm rounded-xl bg-error-container px-4 py-3 text-sm text-error">
                <span className="font-bold">{t("cameraError")}: </span>{cameraError}
              </div>
            )}
          </div>
        )}

        {/* ── Scanning state ── */}
        {scanState === "scanning" && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black shadow-lg">
              <video
                ref={videoRef}
                className="h-auto w-full"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="size-48 rounded-2xl border-4 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center text-xs font-bold text-white/80 tracking-wider uppercase">
                {t("alignQrInBox")}
              </div>
            </div>

            <p className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              {t("scanningForQr")}
            </p>

            <div className="w-full max-w-md">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/30" />
                <span className="text-xs text-on-surface-variant">{t("orEnterManually")}</span>
                <div className="h-px flex-1 bg-outline-variant/30" />
              </div>
              <form onSubmit={(e) => { stopCamera(); handleManualLookup(e); }} className="flex gap-2">
                <input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder={t("enterTxRefOrReceipt")}
                  className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!manualRef.trim() || !token}
                  className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-on-secondary disabled:opacity-40"
                >
                  {t("lookup")}
                </button>
              </form>
            </div>

            <button type="button" onClick={() => { stopCamera(); setScanState("idle"); }} className="text-sm text-on-surface-variant underline">
              {t("cancel")}
            </button>
          </div>
        )}

        {/* ── Found / loading result ── */}
        {(scanState === "found") && (
          <div className="flex flex-col gap-4">
            {lookupLoading ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <span className="material-symbols-outlined animate-spin text-[48px] text-primary">progress_activity</span>
                <p className="text-sm text-on-surface-variant">{t("verifyingPayment")}</p>
              </div>
            ) : result ? (
              <>
                <div className={`rounded-2xl ring-2 ${statusMeta?.ring} bg-surface-container-lowest p-5 shadow-sm`}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className={`flex size-12 items-center justify-center rounded-xl ${
                      result.status === "VERIFIED" ? "bg-green-100" : "bg-amber-100"
                    }`}>
                      <span className={`material-symbols-outlined text-[26px] ${
                        result.status === "VERIFIED" ? "text-green-700" : "text-amber-700"
                      }`}>{statusMeta?.icon}</span>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${statusMeta?.color}`}>
                        {statusMeta?.label}
                      </span>
                      <p className="mt-0.5 text-[11px] text-on-surface-variant">
                        {result.receiptNumber ?? result.txRef}
                      </p>
                    </div>
                  </div>

                  {result.student && (
                    <div className="mb-4 rounded-xl bg-primary-fixed/10 p-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t("studentInfo")}</p>
                      <p className="text-lg font-black text-on-surface">{result.student.fullName}</p>
                      <p className="font-mono text-sm text-primary">{result.student.studentId}</p>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                        <span>{t("program")}: <span className="font-semibold text-on-surface">{result.student.program}</span></span>
                        <span>{t("academicYear")}: <span className="font-semibold text-on-surface">{result.student.academicYear}</span></span>
                        <span className="col-span-2">{t("email")}: <span className="font-semibold text-on-surface">{result.student.email}</span></span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-surface-container p-3">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t("amount")}</p>
                      <p className="text-xl font-black text-on-surface">
                        {result.currency} {result.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t("method")}</p>
                      <p className="text-sm font-bold text-on-surface capitalize">{result.provider.toLowerCase()}</p>
                      {result.providerReference && (
                        <p className="mt-0.5 text-[11px] text-on-surface-variant">{result.providerReference}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t("txRef")}</p>
                      <p className="font-mono text-xs text-on-surface break-all">{result.txRef}</p>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t("receiptNumber")}</p>
                      <p className="font-mono text-xs text-on-surface">{result.receiptNumber ?? "—"}</p>
                    </div>
                    {result.verifiedAt && (
                      <div className="col-span-2 rounded-xl bg-surface-container p-3">
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t("verifiedAt")}</p>
                        <p className="text-xs text-on-surface">{new Date(result.verifiedAt).toLocaleString()}</p>
                      </div>
                    )}
                    {result.departmentCheckCode && (
                      <div className="col-span-2 rounded-xl bg-surface-container p-3">
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t("department")}</p>
                        <p className="text-sm font-bold text-on-surface">{result.departmentCheckCode}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface hover:bg-primary-fixed/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                    {t("scanAnother")}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    {t("done")}
                  </button>
                </div>
              </>
            ) : lookupError ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-error-container">
                  <span className="material-symbols-outlined text-[32px] text-error">error</span>
                </div>
                <p className="text-center text-sm text-on-surface-variant">{lookupError}</p>
                <button type="button" onClick={handleReset} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-on-primary">
                  {t("tryAgain")}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Not found ── */}
        {scanState === "not_found" && (
          <div className="flex flex-col items-center gap-5 py-14">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-error-container">
              <span className="material-symbols-outlined text-[40px] text-error">search_off</span>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-black text-on-surface">{t("paymentNotFound")}</h2>
              <p className="mt-1 text-sm text-on-surface-variant max-w-xs">{t("paymentNotFoundDesc")}</p>
              {lastScannedRaw && (
                <p className="mt-2 font-mono text-[10px] text-outline break-all max-w-xs">{lastScannedRaw.slice(0, 120)}</p>
              )}
            </div>
            <button type="button" onClick={handleReset} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {t("tryAgain")}
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {scanState === "error" && (
          <div className="flex flex-col items-center gap-5 py-14">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-error-container">
              <span className="material-symbols-outlined text-[40px] text-error">cloud_off</span>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-black text-on-surface">{t("lookupFailed")}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">{lookupError}</p>
            </div>
            <button type="button" onClick={handleReset} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {t("tryAgain")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
