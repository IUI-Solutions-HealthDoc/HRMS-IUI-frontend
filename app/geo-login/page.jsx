"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  FlipHorizontal2,
  Clock3,
  LockKeyhole,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import { apiFetch, backendAssetUrl } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import styles from "./page.module.css";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 5;
const MAX_TOTAL_PHOTO_BYTES = 25 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatClock(value) {
  if (!value) return "—";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value);
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeRecords(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.records)) return result.records;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function locationErrorMessage(error) {
  if (error.code === 1) return "Location access was denied. Allow location access in your browser and retry.";
  if (error.code === 2) return "Your location could not be determined. Check your device GPS and retry.";
  if (error.code === 3) return "Location request timed out. Try again in an open area.";
  return error.message || "Location could not be captured.";
}

async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
    addressdetails: "1",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: { "Accept-Language": "en" },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!response.ok) {
    throw new Error("The address lookup service is unavailable. Refresh your location to retry.");
  }

  const result = await response.json();
  if (typeof result.display_name !== "string" || !result.display_name.trim()) {
    throw new Error("No street address was found for this location. Refresh your location to retry.");
  }
  return result.display_name;
}

function LocationPageHeader({ loadingLogs, onRefresh, dateLabel, punchStatus }) {
  return (
    <header
      className="page-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 20,
        flexWrap: "wrap",
        padding: 24,
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, var(--surface2)), var(--surface2))",
        border: "1px solid var(--border)",
      }}
    >
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--accent)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          <MapPin size={14} /> Location intelligence
        </div>
        <h1 className="syne" style={{ margin: 0 }}>Geolocation Logs</h1>
        <p style={{ margin: "7px 0 0", color: "var(--text-2)" }}>
          Capture a verified location, attach a camera photo, and keep a clear activity history.
        </p>
        <div className={styles.headerMeta} style={{ justifyContent: "flex-start", marginTop: 12 }}>
          <span>{dateLabel}</span>
          <span className={styles.punchState}>{punchStatus}</span>
        </div>
      </div>
      <button type="button" className="btn-ghost" onClick={onRefresh} disabled={loadingLogs}>
        <RefreshCw size={15} className={loadingLogs ? "animate-spin" : ""} /> Refresh
      </button>
    </header>
  );
}

function LocationStats({ location, photosCount, maxPhotos, logsCount }) {
  return (
    <div className="grid-stats" style={{ marginBottom: 22 }}>
      <div className="stat-card" style={{ padding: 18 }}>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>Location status</div>
        <strong style={{ display: "block", fontSize: 20, marginTop: 8, color: location ? "var(--accent)" : "var(--text)" }}>
          {location
            ? photosCount && location.address && location.accuracy <= 200
              ? "Ready to submit"
              : location.address
                ? "Location captured"
                : "Address lookup pending"
            : "Not captured"}
        </strong>
        <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 5 }}>
          {location ? `${Math.round(location.accuracy)} m accuracy` : "Permission required"}
        </span>
      </div>
      <div className="stat-card" style={{ padding: 18 }}>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>Photos attached</div>
        <strong style={{ display: "block", fontSize: 20, marginTop: 8 }}>
          {photosCount} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {maxPhotos}</span>
        </strong>
        <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 5 }}>
          {photosCount ? "Ready for upload" : "Camera photos only"}
        </span>
      </div>
      <div className="stat-card" style={{ padding: 18 }}>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>History records</div>
        <strong style={{ display: "block", fontSize: 20, marginTop: 8 }}>{logsCount}</strong>
        <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 5 }}>Attendance records</span>
      </div>
    </div>
  );
}

export default function GeoLoginPage() {
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceHistoryCount, setAttendanceHistoryCount] = useState(0);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [distance, setDistance] = useState(null);
  const [showToast, toastNode] = useToast();
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const photosRef = useRef([]);
  const photoProcessingRef = useRef(false);

  const today = localDateString();
  const previewUrls = useMemo(
    () => photos.map((photo) => URL.createObjectURL(photo)),
    [photos]
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const records = normalizeRecords(await apiFetch("/attendance/me"));
      setAttendanceHistoryCount(records.length);
      setAttendance(records.find((record) => record.date === today) || null);
    } catch (error) {
      showToast(error.message || "Could not load today's attendance", "error");
    } finally {
      setAttendanceLoading(false);
    }
  }, [showToast, today]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const hasGeoAttendance = String(attendance?.punch_method || "").toLowerCase() === "geo login";
  const checkInTime = attendance?.punch_in || attendance?.check_in;
  const checkOutTime = attendance?.punch_out || attendance?.check_out;
  const canCheckOut = hasGeoAttendance && Boolean(checkInTime) && !checkOutTime;
  const alreadyCheckedOut = hasGeoAttendance && Boolean(checkOutTime);
  const otherAttendanceMethod = Boolean(attendance && checkInTime && !hasGeoAttendance);
  const attendanceUploaded = Boolean(checkInTime && (otherAttendanceMethod || alreadyCheckedOut));

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location access.");
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          address: "",
        };
        if (
          location
          && (location.latitude !== nextLocation.latitude
            || location.longitude !== nextLocation.longitude
            || location.accuracy !== nextLocation.accuracy)
        ) {
          photosRef.current = [];
          setPhotos([]);
          setPhotoError("Location refreshed. Add photos again so the GPS stamp matches.");
        }
        setLocation(nextLocation);
        setLocationLoading(false);
        setAddressLoading(true);
        reverseGeocode(nextLocation.latitude, nextLocation.longitude)
          .then((address) => {
            setLocation((current) => (
              current?.latitude === nextLocation.latitude
                && current?.longitude === nextLocation.longitude
                ? { ...current, address }
                : current
            ));
          })
          .catch((error) => {
            setLocationError(error.message || "Could not look up the street address.");
          })
          .finally(() => setAddressLoading(false));
      },
      (error) => {
        setLocation(null);
        setLocationError(locationErrorMessage(error));
        setLocationLoading(false);
        setAddressLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [location]);

  function stampPhoto(file) {
    return new Promise((resolve, reject) => {
      const sourceUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(sourceUrl);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not add the location stamp to the photo."));
          return;
        }

        context.drawImage(image, 0, 0);
        const fontSize = Math.max(10, Math.min(20, Math.round(canvas.width * 0.024)));
        const padding = Math.round(fontSize * 0.8);
        const lineHeight = Math.round(fontSize * 1.4);
        const maxTextWidth = canvas.width - padding * 2;
        const coords = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        const details = [
          `Location: ${location.address}`,
          `GPS: ${coords}`,
          `Accuracy: +/-${Math.round(location.accuracy)}m`,
          `Captured: ${new Date().toLocaleString()}`,
        ];
        context.font = `600 ${fontSize}px sans-serif`;
        const lines = details.flatMap((detail) => {
          const words = detail.split(/\s+/);
          const wrapped = [];
          let line = "";
          words.forEach((word) => {
            const candidate = line ? `${line} ${word}` : word;
            if (line && context.measureText(candidate).width > maxTextWidth) {
              wrapped.push(line);
              line = word;
            } else {
              line = candidate;
            }
          });
          if (line) wrapped.push(line);
          return wrapped;
        });
        const barHeight = padding * 2 + lineHeight * lines.length;
        context.fillStyle = "rgba(8, 15, 30, 0.78)";
        context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
        context.fillStyle = "#ffffff";
        context.textBaseline = "top";
        lines.forEach((line, index) => {
          context.fillText(line, padding, canvas.height - barHeight + padding + index * lineHeight);
        });

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Could not process the location-stamped photo."));
            return;
          }
          const stampedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + "-geotag.jpg",
            { type: "image/jpeg" }
          );
          if (stampedFile.size > MAX_PHOTO_BYTES) {
            reject(new Error("The location-stamped photo exceeds the 10 MB limit."));
            return;
          }
          resolve(stampedFile);
        }, "image/jpeg", 0.9);
      };
      image.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error("Could not read the selected photo."));
      };
      image.src = sourceUrl;
    });
  }

  async function addPhoto(file) {
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be 10 MB or smaller.");
      return;
    }
    if (!location) {
      setPhotoError("Capture your location first so it can be stamped on each photo.");
      return;
    }
    if (photosRef.current.length >= MAX_PHOTOS) {
      setPhotoError(`You can add up to ${MAX_PHOTOS} photos per check-in or check-out.`);
      return;
    }
    if (photosRef.current.reduce((total, item) => total + item.size, 0) + file.size > MAX_TOTAL_PHOTO_BYTES) {
      setPhotoError("Combined photo size must be 25 MB or smaller.");
      return;
    }

    if (photoProcessingRef.current) return;
    photoProcessingRef.current = true;
    setPhotoProcessing(true);
    try {
      const stampedPhoto = await stampPhoto(file);
      if (
        photosRef.current.reduce((total, item) => total + item.size, 0) + stampedPhoto.size
        > MAX_TOTAL_PHOTO_BYTES
      ) {
        setPhotoError("Combined location-stamped photo size must be 25 MB or smaller.");
        return;
      }
      const nextPhotos = [...photosRef.current, stampedPhoto];
      photosRef.current = nextPhotos;
      setPhotos(nextPhotos);
      setPhotoError("");
    } catch (error) {
      setPhotoError(error.message || "Could not prepare the photo.");
    } finally {
      photoProcessingRef.current = false;
      setPhotoProcessing(false);
    }
  }

  function removePhoto(index) {
    const nextPhotos = photosRef.current.filter((_, photoIndex) => photoIndex !== index);
    photosRef.current = nextPhotos;
    setPhotos(nextPhotos);
  }

  async function startWebcam(facing = cameraFacing) {
    if (!location?.address) {
      setPhotoError(
        addressLoading
          ? "Wait for the location address lookup to finish before taking photos."
          : "Capture your location and wait for its address before taking photos."
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhotoError("Webcam access is unavailable. Use a secure browser connection or upload a photo.");
      return;
    }

    setCameraLoading(true);
    setPhotoError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing } },
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraFacing(facing);
    } catch (error) {
      const message = error.name === "NotAllowedError" || error.name === "PermissionDeniedError"
        ? "Camera access was denied. Allow camera access in your browser and try again."
        : error.name === "NotFoundError" || error.name === "DevicesNotFoundError"
          ? "No camera was found. Connect a camera or upload a photo instead."
          : error.message || "Could not start the webcam.";
      setPhotoError(message);
    } finally {
      setCameraLoading(false);
    }
  }

  function stopWebcam() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
  }

  async function flipCamera() {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    stopWebcam();
    await startWebcam(nextFacing);
  }

  async function captureWebcamPhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setPhotoError("The camera is still starting. Please try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setPhotoError("Could not capture the photo. Please try again.");
        return;
      }
      addPhoto(new File([blob], `geo-login-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  async function submitGeoPunch() {
    if (!location || !photos.length || attendanceLoading || submitting || photoProcessing) return;
    if (location.accuracy > 200) {
      setLocationError("GPS accuracy is too low. Move to an open area and refresh your location.");
      return;
    }
    if (otherAttendanceMethod || alreadyCheckedOut) return;

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("latitude", String(location.latitude));
      payload.append("longitude", String(location.longitude));
      payload.append("accuracy", String(location.accuracy));
      photos.forEach((item) => payload.append("photos", item));
      const result = await apiFetch("/attendance/geo-login", {
        method: "POST",
        body: payload,
      });
      setDistance(result?.distance_m ?? null);
      showToast(result?.message || "Geo attendance recorded");
      stopWebcam();
      photosRef.current = [];
      setPhotos([]);
      setPhotoError("");
      await loadAttendance();
    } catch (error) {
      showToast(error.message || "Could not submit geo attendance", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const punchStatus = attendanceLoading
    ? "Checking attendance..."
    : attendanceUploaded
      ? "Attendance uploaded"
      : canCheckOut
        ? `Checked in at ${formatClock(checkInTime)}`
        : "Not checked in yet";
  const isReady = Boolean(location?.address && photos.length) && location.accuracy <= 200;
  const actionLabel = submitting
    ? "Submitting..."
    : attendanceUploaded
      ? "Attendance uploaded"
      : canCheckOut
        ? "Check out"
        : "Check in";
  const canSubmit = isReady
    && !attendanceLoading
    && !submitting
    && !photoProcessing
    && !otherAttendanceMethod
    && !alreadyCheckedOut;

  return (
    <div className={styles.page}>
      <LocationPageHeader
        loadingLogs={attendanceLoading}
        onRefresh={loadAttendance}
        dateLabel={dateLabel}
        punchStatus={punchStatus}
      />
      <LocationStats
        location={location}
        photosCount={photos.length}
        maxPhotos={MAX_PHOTOS}
        logsCount={attendanceHistoryCount}
      />

      <div className={styles.steps}>
        <section className={`card ${styles.panel}`}>
          <div className={styles.panelTitle}>
            <span className={styles.step}>Step 1</span>
            <h2>Your location</h2>
          </div>

          <div className={styles.mapPreview} aria-label="Location capture preview">
            <div className={styles.mapRoadOne} />
            <div className={styles.mapRoadTwo} />
            <div className={styles.mapRoadThree} />
            <div className={styles.mapMarker}>
              <MapPin size={28} fill="currentColor" />
            </div>
            <span className={styles.mapCaption}>
              {location ? "Current location captured" : "Capture your current location"}
            </span>
          </div>

          <div className={styles.locationStats}>
            <div>
              <span>Coordinates</span>
              <strong>
                {location
                  ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : "Not captured"}
              </strong>
            </div>
            <div>
              <span>GPS accuracy</span>
              <strong>{location ? `${Math.round(location.accuracy)} m` : "—"}</strong>
            </div>
            <div className={styles.fullStat}>
              <span>Exact location</span>
              <strong>
                {!location
                  ? "Not captured"
                  : addressLoading
                    ? "Looking up address..."
                    : location.address || "Address unavailable"}
              </strong>
            </div>
            {distance != null && (
              <div className={styles.fullStat}>
                <span>Distance from office</span>
                <strong>{distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`}</strong>
              </div>
            )}
          </div>

          <p style={{ margin: 0, color: "var(--muted)", fontSize: 11 }}>
            Address lookup by{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>
            ; GPS coordinates are sent to its geocoding service.
          </p>

          {location && (
            <div className={`${styles.notice} ${location.accuracy <= 200 ? styles.noticeSuccess : styles.noticeWarning}`}>
              <Check size={15} />
              {location.accuracy <= 200
                ? "Location captured. Your office distance is verified when you submit."
                : "GPS accuracy is too low. Refresh from an open area."}
            </div>
          )}
          {locationError && <p className={styles.error}>{locationError}</p>}

          <button
            type="button"
            className="btn-ghost"
            onClick={captureLocation}
            disabled={locationLoading || addressLoading || photoProcessing}
          >
            <RefreshCw size={15} className={locationLoading || addressLoading ? styles.spin : ""} />
            {locationLoading ? "Getting location..." : addressLoading ? "Looking up address..." : "Refresh location"}
          </button>
        </section>

        <section className={`card ${styles.panel}`}>
          <div className={styles.panelTitle}>
            <span className={styles.step}>Step 2</span>
            <h2>Your photo</h2>
          </div>

          <div className={styles.photoBox}>
            {cameraStream && (
              <div className={styles.webcamPreview}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  aria-label="Live webcam preview"
                  className={cameraFacing === "user" ? styles.frontCamera : ""}
                />
                <div className={styles.webcamActions}>
                  <button type="button" className="btn-primary" onClick={captureWebcamPhoto} disabled={photoProcessing || photos.length >= MAX_PHOTOS}>
                    <Camera size={15} /> {photoProcessing ? "Saving photo..." : photos.length ? "Capture another" : "Capture photo"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={flipCamera} disabled={cameraLoading || photoProcessing}>
                    <FlipHorizontal2 size={15} /> Flip camera
                  </button>
                  <button type="button" className="btn-ghost" onClick={stopWebcam}>
                    <X size={15} /> Cancel
                  </button>
                </div>
              </div>
            )}
            {!cameraStream && (
              <div className={styles.photoEmpty}>
                <span className={styles.cameraIcon}><Camera size={23} /></span>
                <strong>{photos.length ? `${photos.length} of ${MAX_PHOTOS} geotagged photos added` : "Capture geotagged photos with your webcam"}</strong>
                <span>Each photo is stamped with its address, GPS coordinates, accuracy, and capture time. Up to 5 photos, 10 MB each.</span>
                <div className={styles.photoActions}>
                  <button type="button" className="btn-primary" onClick={() => startWebcam()} disabled={cameraLoading || photoProcessing || photos.length >= MAX_PHOTOS || !location?.address || addressLoading}>
                    <Camera size={15} /> {cameraLoading ? "Starting camera..." : "Open webcam"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => startWebcam()} disabled={cameraLoading || photoProcessing || photos.length >= MAX_PHOTOS || !location?.address || addressLoading}>
                    <Camera size={15} /> Add photos
                  </button>
                </div>
              </div>
            )}
            {photos.length > 0 && (
              <div className={styles.photoGallery}>
                {photos.map((item, index) => (
                  <figure key={`${item.name}-${index}`} className={styles.photoTile}>
                    <img src={previewUrls[index]} alt={`Geotagged attendance photo ${index + 1}`} />
                    <figcaption>Photo {index + 1} · GPS stamped</figcaption>
                    <button
                      type="button"
                      className={styles.removePhoto}
                      onClick={() => removePhoto(index)}
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </figure>
                ))}
                {photos.length < MAX_PHOTOS && !cameraStream && (
                  <div className={styles.addPhotoTile}>
                    <button type="button" className="btn-ghost" onClick={() => startWebcam()} disabled={cameraLoading || photoProcessing || !location?.address || addressLoading}>
                      <Camera size={15} /> {cameraLoading ? "Starting..." : "Capture more"}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => startWebcam()} disabled={cameraLoading || photoProcessing || !location?.address || addressLoading}>
                      <Camera size={15} /> Add photos
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {photoError && <p className={styles.error}>{photoError}</p>}
        </section>
      </div>

      <section className={`card ${styles.actionBar}`}>
        <div className={styles.privacy}>
          <LockKeyhole size={15} />
          <span>Your location and photo are visible only to you, HR, and your manager.</span>
        </div>
        <div className={styles.actionControls}>
          {checkInTime && (
            <span className={styles.timeInfo}>
              <Clock3 size={15} />
              In {formatClock(checkInTime)}
              {checkOutTime ? ` · Out ${formatClock(checkOutTime)}` : ""}
            </span>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={submitGeoPunch}
            disabled={!canSubmit}
            title={!location ? "Capture your location first" : !photos.length ? "Add a photo to continue" : ""}
          >
            {actionLabel}
          </button>
        </div>
      </section>

      {otherAttendanceMethod && (
        <p className={styles.attendanceNote}>
          Today&apos;s attendance is uploaded{attendance?.punch_method ? ` using ${attendance.punch_method}` : ""}. Geo Login cannot create a second attendance entry.
        </p>
      )}
      {alreadyCheckedOut && (
        <p className={styles.attendanceNote}>
          Your Geo Login attendance is uploaded. Your check-in and check-out for today are complete.
        </p>
      )}

      {toastNode}
    </div>
  );
}
