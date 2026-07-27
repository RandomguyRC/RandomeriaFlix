export interface ChatAttachmentData {
  id: string;
  kind: string;
  originalRef: string | null;
  assetId: string | null;
  url: string | null;
  downloadUrl: string | null;
  mimeType: string | null;
  originalName: string;
  sizeBytes: number | null;
}

export interface ChatMessageData {
  id: string;
  sortOrder: number;
  dateLabel: string | null;
  sender: string;
  senderType: string;
  text: string;
  attachments: ChatAttachmentData[];
}
