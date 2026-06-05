import { create } from "zustand";

export interface Trust {
  id: string;
  name: string;
  location: string;
}

export interface User {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface DashboardState {
  isSidebarExpanded: boolean;
  isMobileSidebarOpen: boolean;
  currentTrust: Trust;
  trusts: Trust[];
  currentUser: User;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (isOpen: boolean) => void;
  setCurrentTrust: (trust: Trust) => void;
  setTrusts: (trusts: Trust[]) => void;
}

const mockUser: User = {
  name: "Sardar Jaspreet Singh",
  email: "jaspreet.singh@gursewa.online",
  role: "Head Administrator",
};

export const useDashboardStore = create<DashboardState>((set) => ({
  isSidebarExpanded: true,
  isMobileSidebarOpen: false,
  currentTrust: { id: "", name: "Loading...", location: "" },
  trusts: [],
  currentUser: mockUser,
  toggleSidebar: () =>
    set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
  setCurrentTrust: (trust) => set({ currentTrust: trust }),
  setTrusts: (trusts) => set({ trusts }),
}));
