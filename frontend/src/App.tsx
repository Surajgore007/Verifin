import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBanner } from "./components/layout/TopBanner";
import { HomeScreen } from "./screens/HomeScreen";
import { ResearchSplitScreen } from "./screens/ResearchSplitScreen";
import { DocumentsScreen } from "./screens/DocumentsScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { ReliabilityScreen } from "./screens/ReliabilityScreen";
import { ReviewModal } from "./components/layout/ReviewModal";
import { ActivityDrawer } from "./components/layout/ActivityDrawer";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState<boolean>(false);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);

  const [activeCompany, setActiveCompany] = useState<string>("AAPL");
  const [caseData, setCaseData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [busMessages, setBusMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadCaseData = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/case/current");
      const data = await res.json();
      setCaseData(data);
      if (data.company) setActiveCompany(data.company);
    } catch (e) {
      console.error("Failed to load case data:", e);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (e) {
      console.error("Failed to load documents:", e);
    }
  };

  useEffect(() => {
    loadCaseData();
    loadDocuments();

    // Setup SSE connection for live multi-agent activity stream
    const eventSource = new EventSource("http://localhost:8000/api/stream/events");
    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.sender) {
          setBusMessages((prev) => [msg, ...prev]);
        }
      } catch (e) {
        // keep-alive or ack
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleRunResearch = async (question: string, company: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/research/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, company_name: company })
      });
      await res.json();
      await loadCaseData();
      await loadDocuments();
      setCurrentView("research");
    } catch (e) {
      console.error("Research query error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteDraft = async (draftText: string, title: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/draft/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_text: draftText, title })
      });
      await res.json();
      await loadCaseData();
      setCurrentView("research");
    } catch (e) {
      console.error("Paste draft error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const res = await fetch("http://localhost:8000/api/documents/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status === "rejected") {
        alert(`Document upload notice: ${data.message}`);
      } else {
        await loadDocuments();
        await loadCaseData();
      }
    } catch (e) {
      console.error("File upload error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: "xlsx" | "docx" | "md") => {
    window.open(`http://localhost:8000/api/export/${format}`, "_blank");
  };

  const handleSwitchAuthority = async (conflictId: string, chosenFactId: string) => {
    try {
      await fetch("http://localhost:8000/api/authority/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflict_id: conflictId, chosen_fact_id: chosenFactId })
      });
      await loadCaseData();
    } catch (e) {
      console.error("Authority switch error:", e);
    }
  };

  const handleReviewAction = async (actionType: string, reason: string, flagId?: string, claimId?: string) => {
    try {
      await fetch("http://localhost:8000/api/flags/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_type: actionType, reason, flag_id: flagId, claim_id: claimId })
      });
      await loadCaseData();
    } catch (e) {
      console.error("Review action error:", e);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenActivityDrawer={() => setActivityDrawerOpen(true)}
        activityCount={busMessages.length}
        activeCompany={activeCompany}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBanner
          confidence={caseData?.confidence}
          activeCompany={activeCompany}
          onExport={handleExport}
          onOpenReview={() => setReviewModalOpen(true)}
          summaryStats={caseData?.summary}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === "home" && (
            <HomeScreen
              onRunResearch={handleRunResearch}
              onPasteDraft={handlePasteDraft}
              onFileUpload={handleFileUpload}
              activeCompany={activeCompany}
              setActiveCompany={setActiveCompany}
              isLoading={isLoading}
            />
          )}

          {currentView === "research" && (
            <ResearchSplitScreen
              claims={caseData?.claims || []}
              verdicts={caseData?.verdicts || []}
              omissions={caseData?.omissions || []}
              debates={caseData?.debates || []}
              draftTitle={caseData?.draft_title || "Research Tie-Out"}
              draftText={caseData?.draft_text || ""}
              companyName={activeCompany}
              onSelectClaimForReview={() => setReviewModalOpen(true)}
            />
          )}

          {currentView === "documents" && (
            <DocumentsScreen
              documents={documents}
              xbrlChecks={caseData?.xbrl_checks || []}
              onUploadFile={handleFileUpload}
              onRefresh={loadDocuments}
            />
          )}

          {currentView === "report" && (
            <ReportScreen
              companyName={activeCompany}
              draftTitle={caseData?.draft_title || "Financial Report"}
              draftText={caseData?.draft_text || ""}
              verdicts={caseData?.verdicts || []}
              omissions={caseData?.omissions || []}
              onExport={handleExport}
            />
          )}

          {currentView === "reliability" && (
            <ReliabilityScreen />
          )}
        </main>
      </div>

      {/* Focused Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        flags={caseData?.flags || []}
        conflicts={caseData?.conflicts || []}
        onTakeAction={handleReviewAction}
        onSwitchAuthority={handleSwitchAuthority}
      />

      {/* Slide-over Activity Drawer */}
      <ActivityDrawer
        isOpen={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        messages={busMessages}
      />
    </div>
  );
};

export default App;
