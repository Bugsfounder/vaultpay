"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ClientProfile } from "@/lib/mockDb";

export interface UserSession {
  name: string;
  email: string;
  role: "admin" | "client";
  clientProfile?: ClientProfile;
}

interface AuthContextType {
  user: UserSession | null;
  login: (email: string, role: "admin" | "client", clientProfileId?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user session exists in localStorage
    const savedSession = localStorage.getItem("vaultpay_session");
    if (savedSession) {
      try {
        setUser(JSON.parse(savedSession));
      } catch (e) {
        console.error("Failed to parse saved session", e);
        localStorage.removeItem("vaultpay_session");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, role: "admin" | "client", clientProfileId?: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    let session: UserSession | null = null;

    if (role === "admin") {
      session = {
        name: "Evelyn Croft",
        email: email || "admin@nexus.com",
        role: "admin",
      };
    } else {
      let clientProfile: ClientProfile = {
        id: "client-acme",
        name: "Acme Corporation",
        email: "billing@acme.com",
        address: "123 Industrial Way, Suite A, New York, NY 10001",
      };

      if (clientProfileId === "client-globex" || email.includes("globex")) {
        clientProfile = {
          id: "client-globex",
          name: "Globex Corp",
          email: "billing@globex.com",
          address: "456 Innovation Blvd, Tech Center, San Francisco, CA 94107",
        };
      }

      session = {
        name: clientProfile.name,
        email: clientProfile.email,
        role: "client",
        clientProfile,
      };
    }

    setUser(session);
    localStorage.setItem("vaultpay_session", JSON.stringify(session));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("vaultpay_session");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
