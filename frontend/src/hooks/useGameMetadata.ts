"use client";

// Loads IPFS metadata for a set of tokenIds via useGameToken.getMetadata and
// exposes it as a lookup map. Used by pages that render covers/genres.

import { useEffect, useState } from "react";
import { useGameToken } from "@/hooks/useGameToken";
import { resolveIpfsUrl } from "@/lib/ipfs";
import type { GameMetadata } from "@/lib/ipfs";

export interface GameDisplay {
  genre: string;
  description: string;
  cover: string | null; // resolved gateway URL
}

const EMPTY: GameDisplay = { genre: "Game", description: "", cover: null };

function toDisplay(meta: GameMetadata | null): GameDisplay {
  if (!meta) return EMPTY;
  return {
    genre: meta.attributes?.genre ?? "Game",
    description: meta.description ?? "",
    cover: meta.image ? resolveIpfsUrl(meta.image) : null,
  };
}

export function useGameMetadata(ids: number[]) {
  const { getMetadata } = useGameToken();
  const [map, setMap] = useState<Record<number, GameDisplay>>({});

  const key = ids.join(",");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => [id, toDisplay(await getMetadata(id))] as const)
      );
      if (!cancelled) setMap(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, getMetadata]);

  const get = (id: number): GameDisplay => map[id] ?? EMPTY;
  return { get };
}
