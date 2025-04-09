// @/lib/message-utils.ts
import { ref, update } from "firebase/database";
import { firebaseDb } from "./firebase";

export async function updateMessageStatus(
  messageId: string, 
  status: 'sent' | 'delivered' | 'read'
) {
  try {
    await update(ref(firebaseDb, `messages/${messageId}`), {
      status,
      ...(status === 'read' ? { readAt: Date.now() } : {})
    });
  } catch (error) {
    console.error("Error updating message status:", error);
    throw error;
  }
}

export function formatMessageForFirebase(
  sender: string,
  recipient: string,
  message: string
) {
  return {
    text: message,
    sender,
    recipient,
    participants: [sender, recipient].sort().join('_'),
    status: 'sent',
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
  };
}