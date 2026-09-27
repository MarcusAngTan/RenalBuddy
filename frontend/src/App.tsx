import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { FeelPage } from "./pages/Feel";
import { JournalPage } from "./pages/Journal";
import { EditMedPage, MedsPage, NewMedPage } from "./pages/Meds";
import { ProfilePage } from "./pages/Profile";
import { QuestionsPage } from "./pages/Questions";
import { SetupPage } from "./pages/Setup";
import { SupportPage } from "./pages/Support";
import { NewTaperPage, TaperPage } from "./pages/Taper";
import { TodayPage } from "./pages/Today";
import { VisitPage } from "./pages/Visit";

function Private({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="mx-auto max-w-[430px] bg-paper p-6 text-sm text-ink">Loading…</p>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Private><TodayPage /></Private>} />
      <Route path="/setup" element={<Private><SetupPage /></Private>} />
      <Route path="/meds" element={<Private><MedsPage /></Private>} />
      <Route path="/meds/new" element={<Private><NewMedPage /></Private>} />
      <Route path="/meds/:id" element={<Private><EditMedPage /></Private>} />
      <Route path="/taper" element={<Private><TaperPage /></Private>} />
      <Route path="/taper/new" element={<Private><NewTaperPage /></Private>} />
      <Route path="/feel" element={<Private><FeelPage /></Private>} />
      <Route path="/journal" element={<Private><JournalPage /></Private>} />
      <Route path="/questions" element={<Private><QuestionsPage /></Private>} />
      <Route path="/support" element={<Private><SupportPage /></Private>} />
      <Route path="/visit" element={<Private><VisitPage /></Private>} />
      <Route path="/profile" element={<Private><ProfilePage /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
