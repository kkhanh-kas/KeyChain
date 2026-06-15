"use client";

// Global search query shared between the Navbar input and the Store/Marketplace
// pages so typing in the navbar filters the current gallery.

import { createContext, useContext, useState } from "react";

interface SearchValue {
  query: string;
  setQuery: (q: string) => void;
}

const SearchContext = createContext<SearchValue>({ query: "", setQuery: () => {} });

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchValue {
  return useContext(SearchContext);
}
