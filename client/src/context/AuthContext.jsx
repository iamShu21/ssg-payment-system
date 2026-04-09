import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "ssg_auth";

const getHomePathByRole = (role) => {
  if (role === "student") return "/student/dashboard";
  if (role === "ssg_officer") return "/officer/dashboard";
  if (role === "admin") return "/moderator/dashboard";
  return "/";
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setToken(parsed.token || null);
        setUser(parsed.user || null);
        setStudent(parsed.student || null);
      } catch (error) {
        console.error("Failed to parse saved auth state:", error);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const run = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      const u = parsed.user;
      const st = parsed.student;
      if (!parsed.token || !u || u.role !== "student" || !st?.student_id) return;
      if (st && Object.prototype.hasOwnProperty.call(st, "enrollment_status")) return;
      try {
        const { data } = await api.get("/students");
        const match = data.find((row) => Number(row.user_id) === Number(u.user_id));
        if (!match) return;
        const next = {
          ...parsed,
          student: {
            ...st,
            enrollment_status: match.enrollment_status ?? null,
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setStudent(next.student);
      } catch {
        /* ignore */
      }
    };
    run();
  }, []);

  const saveSession = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setToken(next.token || null);
    setUser(next.user || null);
    setStudent(next.student || null);
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setStudent(null);
  };

  const login = async ({ username, password }) => {
    const response = await api.post("/auth/login", { username, password });
    const payload = response.data;
    const next = {
      token: payload.token,
      user: payload.user,
      student: null,
    };

    if (payload.user?.role === "student") {
      // Reuse existing endpoint and map this logged-in user to student_id.
      const studentResponse = await api.get("/students");
      const match = studentResponse.data.find(
        (row) => Number(row.user_id) === Number(payload.user.user_id)
      );
      if (match) {
        next.student = {
          student_id: match.student_id,
          student_number: match.student_number,
          first_name: match.first_name,
          last_name: match.last_name,
          course: match.course,
          year_level: match.year_level,
          section: match.section,
          enrollment_status: match.enrollment_status ?? null,
        };
      }
    }

    saveSession(next);
    return next;
  };

  const logout = () => {
    clearSession();
  };

  const value = useMemo(
    () => ({
      token,
      user,
      student,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      getHomePathByRole,
    }),
    [token, user, student, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
