import React, { useEffect, useRef, useState } from "react";
import styles from "./NotesTab.module.css";
import { getAttachmentUrl } from "@/features/reader/api/readerApi";
import { ReaderNote } from "@/types";

interface NotesTabProps {
  bookId: string;
  notes: ReaderNote[];
  currentPage: number;
  onNavigateToPage: (page: number) => void;
  onCreateNote: (
    content: string,
    pageNumber: number | null,
    imageFile?: File | null,
    audioBlob?: Blob | null,
    audioDuration?: number
  ) => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onDeleteAttachment: (noteId: string, attachmentId: string) => Promise<void>;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  bookId,
  notes,
  currentPage,
  onNavigateToPage,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onDeleteAttachment,
}) => {
  const [content, setContent] = useState("");
  const [pageNumber, setPageNumber] = useState<number | null>(currentPage);
  const [isGeneralNote, setIsGeneralNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attachment states for new note
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Edit mode for existing notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Keep pageNumber in sync with reader's currentPage if not in general note mode
  useEffect(() => {
    if (!isGeneralNote) {
      setPageNumber(currentPage);
    }
  }, [currentPage, isGeneralNote]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  });

  // Audio recording timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 600) {
            stopRecordingRef.current();
            return 600;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // Image paste support
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          setSelectedImage(file);
          const preview = URL.createObjectURL(file);
          setImagePreviewUrl(preview);
          break;
        }
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const startRecording = async () => {
    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        alert("Audio recording is not supported in this browser environment.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone permission was denied or not available.");
    }
  };

  const discardAudio = () => {
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordingSeconds(0);
  };

  const discardImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleSaveNote = async () => {
    if (!content.trim() && !selectedImage && !recordedAudioBlob) return;
    setIsSubmitting(true);
    try {
      await onCreateNote(
        content.trim(),
        isGeneralNote ? null : pageNumber,
        selectedImage,
        recordedAudioBlob,
        recordingSeconds > 0 ? recordingSeconds : undefined
      );

      // Reset form
      setContent("");
      discardImage();
      discardAudio();
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim()) return;
    try {
      await onUpdateNote(noteId, editContent.trim());
      setEditingNoteId(null);
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.notesContainer}>
      {/* New Note Composer */}
      <div className={styles.composerCard}>
        <div className={styles.composerTitle}>
          <span>📝 Add Note</span>
        </div>

        <div className={styles.pageSelectionRow}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isGeneralNote}
              onChange={(e) => {
                setIsGeneralNote(e.target.checked);
                if (!e.target.checked) setPageNumber(currentPage);
              }}
            />
            General Book Note
          </label>

          {!isGeneralNote && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Page:</span>
              <input
                type="number"
                min={1}
                value={pageNumber || currentPage}
                onChange={(e) => setPageNumber(parseInt(e.target.value, 10) || 1)}
                className={styles.pageNumberInput}
              />
            </div>
          )}
        </div>

        <textarea
          className={styles.noteTextarea}
          placeholder="Write thoughts, insights, quotes... (Paste image directly or use buttons below)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
        />

        {/* Attachment Previews */}
        {imagePreviewUrl && (
          <div className={styles.attachmentPreviewBox}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreviewUrl} alt="Preview" className={styles.previewThumb} />
              <span>{selectedImage?.name || "Pasted image"}</span>
            </div>
            <button type="button" onClick={discardImage} className={styles.removeAttBtn}>
              ✕ Remove
            </button>
          </div>
        )}

        {recordedAudioUrl && (
          <div className={styles.attachmentPreviewBox}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "80%" }}>
              <span>🎙️ Voice memo ({formatSeconds(recordingSeconds)})</span>
              <audio src={recordedAudioUrl} controls style={{ height: "28px", width: "160px" }} />
            </div>
            <button type="button" onClick={discardAudio} className={styles.removeAttBtn}>
              ✕ Discard
            </button>
          </div>
        )}

        {/* Action Row */}
        <div className={styles.attachmentActionsRow}>
          <input
            type="file"
            ref={imageInputRef}
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={handleImageFileChange}
          />
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => imageInputRef.current?.click()}
            title="Attach image (PNG, JPG, WebP)"
          >
            📷 Image
          </button>

          {!isRecording ? (
            <button
              type="button"
              className={styles.toolButton}
              onClick={startRecording}
              title="Record voice memo (max 10 min)"
            >
              🎙️ Record Audio
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.toolButton} ${styles.recordingButton}`}
              onClick={stopRecording}
              title="Stop recording"
            >
              ⏹️ Stop ({formatSeconds(recordingSeconds)})
            </button>
          )}

          <button
            type="button"
            className={styles.saveNoteBtn}
            onClick={handleSaveNote}
            disabled={isSubmitting || (!content.trim() && !selectedImage && !recordedAudioBlob)}
          >
            {isSubmitting ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className={styles.emptyNotes}>
          <p>No notes for this book yet.</p>
          <p>Capture key concepts, paste diagrams, or record audio thoughts.</p>
        </div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className={styles.noteCard}>
            <div className={styles.cardHeader}>
              <div>
                {n.page_number ? (
                  <span
                    className={styles.pageBadge}
                    onClick={() => onNavigateToPage(n.page_number!)}
                    title={`Jump to page ${n.page_number}`}
                  >
                    Page {n.page_number}
                  </span>
                ) : (
                  <span className={styles.pageBadge} style={{ background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                    General Note
                  </span>
                )}
              </div>

              <div className={styles.cardActions}>
                <span className={styles.dateStamp}>
                  {new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
                <button
                  className={styles.iconActionBtn}
                  onClick={() => {
                    setEditingNoteId(n.id);
                    setEditContent(n.content);
                  }}
                  title="Edit note text"
                >
                  ✏️
                </button>
                <button
                  className={styles.iconActionBtn}
                  onClick={() => onDeleteNote(n.id)}
                  title="Delete note"
                >
                  🗑️
                </button>
              </div>
            </div>

            {editingNoteId === n.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <textarea
                  className={styles.noteTextarea}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ minHeight: "60px" }}
                />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className={styles.toolButton}
                    onClick={() => setEditingNoteId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.saveNoteBtn}
                    onClick={() => handleSaveEdit(n.id)}
                  >
                    Update
                  </button>
                </div>
              </div>
            ) : (
              n.content && <p className={styles.noteBody}>{n.content}</p>
            )}

            {/* Attachments Display */}
            {n.attachments && n.attachments.length > 0 && (
              <div className={styles.attachmentsGrid}>
                {/* Images */}
                <div className={styles.imageGallery}>
                  {n.attachments
                    .filter((a) => a.attachment_type === "image")
                    .map((a) => (
                      <div key={a.id} className={styles.imageWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getAttachmentUrl(bookId, n.id, a.id)}
                          alt={a.original_name}
                          className={styles.noteImageThumb}
                          onClick={() => window.open(getAttachmentUrl(bookId, n.id, a.id), "_blank")}
                          title="Click to view image"
                        />
                        <button
                          type="button"
                          className={styles.deleteAttachmentBtn}
                          onClick={() => onDeleteAttachment(n.id, a.id)}
                          title="Delete image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>

                {/* Audio */}
                {n.attachments
                  .filter((a) => a.attachment_type === "audio")
                  .map((a) => (
                    <div key={a.id} className={styles.audioPlayerRow}>
                      <span style={{ fontSize: "0.8rem" }}>🎙️</span>
                      <audio
                        src={getAttachmentUrl(bookId, n.id, a.id)}
                        controls
                        className={styles.audioPlayer}
                      />
                      <button
                        type="button"
                        className={styles.iconActionBtn}
                        onClick={() => onDeleteAttachment(n.id, a.id)}
                        title="Delete voice memo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
