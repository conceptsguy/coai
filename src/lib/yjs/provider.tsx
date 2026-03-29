"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Y from "yjs";
import YPartyKitProvider from "y-partykit/provider";
import type { Awareness } from "y-protocols/awareness";
import { observeYjsDoc } from "./bridge";
import { seedYjsDocIfEmpty } from "./seed";
import { useCanvasStore } from "@/lib/store/canvas-store";

interface YjsContextValue {
  doc: Y.Doc;
  provider: YPartyKitProvider | null;
  awareness: Awareness | null;
  synced: boolean;
  connected: boolean;
}

const YjsContext = createContext<YjsContextValue | null>(null);

export function useYjs(): YjsContextValue {
  const ctx = useContext(YjsContext);
  if (!ctx) throw new Error("useYjs must be used within a YjsProvider");
  return ctx;
}

export function useYjsDoc(): Y.Doc {
  return useYjs().doc;
}

const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

interface YjsProviderProps {
  projectId: string;
  children: ReactNode;
}

export function YjsProvider({ projectId, children }: YjsProviderProps) {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<YPartyKitProvider | null>(null);

  const [synced, setSynced] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let aborted = false;

    // Create a fresh doc for this effect lifecycle
    const doc = new Y.Doc();
    docRef.current = doc;

    // Set up Yjs → Zustand observers
    const detachObservers = observeYjsDoc(doc);

    // Connect to PartyKit
    const provider = new YPartyKitProvider(PARTYKIT_HOST, projectId, doc, {
      connect: true,
    });
    providerRef.current = provider;

    // Track connection state
    const onStatus = ({ status }: { status: string }) => {
      if (aborted) return;
      setConnected(status === "connected");
    };
    provider.on("status", onStatus);

    const onSync = async (isSynced: boolean) => {
      if (aborted) return;
      if (isSynced) {
        // Seed from Supabase if this is a pre-Yjs project with no doc data
        await seedYjsDocIfEmpty(doc, projectId);
        if (aborted) return;
        useCanvasStore.setState({ hydrated: true, projectId });
      }
      setSynced(isSynced);
    };
    provider.on("synced", onSync);

    return () => {
      aborted = true;
      provider.off("status", onStatus);
      provider.off("synced", onSync);
      provider.destroy();
      detachObservers();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      setSynced(false);
      setConnected(false);
    };
  }, [projectId]);

  // Don't render children until doc is initialized
  if (!docRef.current) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const value: YjsContextValue = {
    doc: docRef.current,
    provider: providerRef.current,
    awareness: providerRef.current?.awareness ?? null,
    synced,
    connected,
  };

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>;
}
