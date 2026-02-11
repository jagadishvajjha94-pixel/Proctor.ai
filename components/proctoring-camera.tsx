"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Camera,
  CameraOff,
  AlertTriangle,
  Eye,
  Shield,
} from "lucide-react"
import type { ViolationType } from "@/lib/types"

interface ProctoringCameraProps {
  sessionId: string
  onViolation: (type: ViolationType, description: string) => void
  totalViolations: number
  warningLevel: number
}

export function ProctoringCamera({
  sessionId,
  onViolation,
  totalViolations,
  warningLevel,
}: ProctoringCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const tabSwitchRef = useRef(0)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: true,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch {
      setPermissionDenied(true)
      onViolation("camera_off", "Camera permission denied")
    }
  }, [onViolation])

  useEffect(() => {
    startCamera()

    // Tab visibility monitoring
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchRef.current += 1
        onViolation("tab_switch", `Tab switch detected (count: ${tabSwitchRef.current})`)
      }
    }

    // Copy/paste detection
    const handleCopyPaste = (e: ClipboardEvent) => {
      if (e.type === "paste") {
        onViolation("copy_paste", "Paste event detected in code editor")
      }
    }

    // Right-click prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    document.addEventListener("paste", handleCopyPaste)
    document.addEventListener("contextmenu", handleContextMenu)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("paste", handleCopyPaste)
      document.removeEventListener("contextmenu", handleContextMenu)

      // Stop camera stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        for (const track of stream.getTracks()) {
          track.stop()
        }
      }
    }
  }, [onViolation, startCamera])

  const warningColors = [
    "border-border",
    "border-yellow-500",
    "border-orange-500",
    "border-destructive",
  ]

  return (
    <div className={`rounded-lg border-2 ${warningColors[warningLevel]} bg-card`}>
      {/* Camera Feed */}
      <div className="relative aspect-video overflow-hidden rounded-t-md bg-foreground/5">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : permissionDenied ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
            <CameraOff className="h-8 w-8 text-destructive" />
            <p className="text-center text-xs text-destructive">
              Camera access required for proctoring
            </p>
            <Button size="sm" variant="outline" onClick={startCamera}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Camera className="h-8 w-8 animate-pulse text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Starting camera...</p>
          </div>
        )}

        {/* Recording indicator */}
        {cameraActive && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-foreground/80 px-2 py-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            <span className="text-[10px] font-medium text-background">REC</span>
          </div>
        )}

        {/* Proctoring status */}
        {cameraActive && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-foreground/80 px-2 py-1">
            <Eye className="h-3 w-3 text-primary" />
            <span className="text-[10px] text-background">AI Active</span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Proctoring</span>
          </div>
          <Badge
            variant={warningLevel === 0 ? "secondary" : "destructive"}
            className="text-[10px]"
          >
            {totalViolations} violation{totalViolations !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Warning display */}
        {warningLevel > 0 && (
          <div
            className={`mt-2 flex items-center gap-2 rounded-md p-2 text-xs ${
              warningLevel >= 3
                ? "bg-destructive/10 text-destructive"
                : warningLevel >= 2
                  ? "bg-orange-500/10 text-orange-500"
                  : "bg-yellow-500/10 text-yellow-600"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {warningLevel >= 3
              ? "FINAL WARNING: Test will be auto-submitted"
              : warningLevel >= 2
                ? "Warning: Multiple violations detected"
                : "Caution: Suspicious activity detected"}
          </div>
        )}
      </div>
    </div>
  )
}
