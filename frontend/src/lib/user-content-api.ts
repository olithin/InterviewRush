/**
 * Client-side API functions for personal answers/notes (UserContent).
 * All calls include X-User-Id: <email> from the NextAuth session.
 * MVP: the backend trusts this header. Harden later with JWT validation.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export type UserContentData = {
  myAnswer: string;
  myNotes: string;
  exists: boolean;
};

export type ItemType = "interview-question" | "problem";

function userHeaders(userId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-User-Id": userId
  };
}

export async function getUserContent(
  userId: string,
  itemType: ItemType,
  itemId: number
): Promise<UserContentData> {
  const res = await fetch(
    `${API_BASE_URL}/api/user-content/${itemType}/${itemId}`,
    {
      headers: { "X-User-Id": userId },
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to load personal content (${res.status})`);
  }

  const json = await res.json();
  const d = json.data ?? json.Data ?? {};
  return {
    myAnswer: d.myAnswer ?? "",
    myNotes: d.myNotes ?? "",
    exists: d.exists ?? false
  };
}

export async function saveUserContent(
  userId: string,
  itemType: ItemType,
  itemId: number,
  data: { myAnswer: string; myNotes: string }
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/user-content/${itemType}/${itemId}`,
    {
      method: "PUT",
      headers: userHeaders(userId),
      body: JSON.stringify(data),
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to save personal content (${res.status})`);
  }
}

export async function createSharedLink(
  userId: string,
  itemType: ItemType,
  itemId: number
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/shared-links`, {
    method: "POST",
    headers: userHeaders(userId),
    body: JSON.stringify({ itemType, itemId }),
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Failed to create share link (${res.status})`);
  }

  const json = await res.json();
  const token: string = json.data?.token ?? json.Data?.token ?? "";
  if (!token) {
    throw new Error("No token in share link response");
  }
  return token;
}

export type SharedContentItem = {
  itemType: string;
  itemId: number;
  /** From catalog (interview question / problem title). Empty if the item was removed. */
  itemTitle?: string;
  myAnswer: string;
  myNotes: string;
  updatedAtUtc: string;
};

export type SharedContent = {
  ownerUserId: string;
  itemType: string;
  itemId: number;
  items: SharedContentItem[];
};

export async function getSharedContent(token: string): Promise<SharedContent> {
  const res = await fetch(`${API_BASE_URL}/api/shared/${token}`, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Share link not found or expired (${res.status})`);
  }

  const json = await res.json();
  const d = json.data ?? json.Data;
  return d as SharedContent;
}
