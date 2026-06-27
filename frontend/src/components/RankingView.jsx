import { useState, useEffect } from "react";
import { Table, Modal, Button } from "./ui/SharedComponents";
import SearchSelect from "./SearchSelect";

export default function RankingView() {
  // ── Historical tab state ──
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDiv, setSelectedDiv] = useState("");
  const [rankings, setRankings] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [professorName, setProfessorName] = useState("");
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [professors, setProfessors] = useState([]);

  // ── Live tab state ──
  const [liveSession, setLiveSession] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [liveRankings, setLiveRankings] = useState([]);
  const [liveTotalVotes, setLiveTotalVotes] = useState(0);
  const [liveRemainingSeconds, setLiveRemainingSeconds] = useState(0);
  const [liveEndTime, setLiveEndTime] = useState(null);

  // ── Shared ──
  const [subTab, setSubTab] = useState("historical");

  const deptClasses = classes.filter((c) => c.dept === selectedDept);
  const years = [...new Set(deptClasses.map((c) => c.year))];
  const yearClasses = deptClasses.filter((c) => c.year === selectedYear);
  const divisions = [...new Set(yearClasses.map((c) => c.division))];

  // ── On mount ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const deptRes = await fetch("/api/departments");
        const deptData = await deptRes.json();
        setDepartments(deptData);

        const classRes = await fetch("/api/principal/classes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const classData = await classRes.json();
        setClasses(Array.isArray(classData) ? classData : []);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };

    fetchData();
    fetchProfessorNames();
  }, []);

  // ── Historical: auto-select first dept ──
  useEffect(() => {
    if (departments.length > 0 && !selectedDept) {
      setSelectedDept(departments[0].code);
    }
  }, [departments]);

  // ── Historical: reset on dept change ──
  useEffect(() => {
    setSelectedYear("");
    setSelectedDiv("");
    setSelectedAcademicYear("");
    setAcademicYears([]);
  }, [selectedDept]);

  // ── Historical: auto-select first year ──
  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[0]);
    }
  }, [years]);

  // ── Historical: reset on year change ──
  useEffect(() => {
    setSelectedDiv("");
    setSelectedAcademicYear("");
    setAcademicYears([]);
  }, [selectedYear]);

  // ── Historical: auto-select first division ──
  useEffect(() => {
    if (divisions.length > 0 && !selectedDiv) {
      setSelectedDiv(divisions[0]);
    }
  }, [divisions]);

  // ── Historical: fetch academic years whenever division is ready ──
  // This is the key effect that was in the original code — keeps initial load fast
  useEffect(() => {
    if (!selectedDept || !selectedYear || !selectedDiv) return;

    const run = async () => {
      const res = await fetch(
        `/api/academic-years?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}`,
      );
      const data = await res.json();
      setAcademicYears(data);
      if (data.length > 0) {
        setSelectedAcademicYear(data[0]);
      }
    };

    run();
  }, [selectedDept, selectedYear, selectedDiv]);

  // ── Historical: fetch rankings whenever academic year is ready ──
  const fetchRankings = async () => {
    if (!selectedDept || !selectedYear || !selectedDiv || !selectedAcademicYear)
      return;
    try {
      const response = await fetch(
        `/api/results?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}&academic_year=${selectedAcademicYear}`,
      );
      const data = await response.json();
      setRankings(data.rankings || []);
      setTotalVotes(data.totalVotes || 0);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    }
  };

  // ── Live: fetch active session then rankings scoped to that session ID ──
  // const fetchLiveData = async () => {
  //   try {
  //     const token = localStorage.getItem("token");

  //     // Use the already-existing active session endpoint
  //     const sessionRes = await fetch("/api/voting-sessions/active", {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     const sessionData = await sessionRes.json();

  //     if (!sessionData.active) {
  //       setLiveSession(null);
  //       setLiveRankings([]);
  //       setLiveTotalVotes(0);
  //       setLiveRemainingSeconds(0);
  //       return;
  //     }

  //     const session = sessionData.session;
  //     setLiveSession(session);
  //     setLiveEndTime(Date.now() + (session.remaining_seconds || 0) * 1000);

  //     // Fetch rankings scoped strictly to this session's ID
  //     // so we never mix votes from a different older session
  //     const rankRes = await fetch(`/api/sessions/${session.id}/rankings`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     const rankData = await rankRes.json();

  //     setLiveRankings(rankData.rankings || []);
  //     setLiveTotalVotes(rankData.totalVotes || 0);
  //   } catch (error) {
  //     console.error("Error fetching live data:", error);
  //   }
  // };

  // ── Live: fetch active session (or last session) then rankings scoped to that session ID ──
  const fetchLiveData = async () => {
    try {
      const token = localStorage.getItem("token");

      const sessionRes = await fetch("/api/voting-sessions/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessionData = await sessionRes.json();

      if (sessionData.active) {
        // There is a live session running
        const session = sessionData.session;
        setLiveSession(session);
        setLastSession(null);
        setLiveEndTime(Date.now() + (session.remaining_seconds || 0) * 1000);

        const rankRes = await fetch(`/api/sessions/${session.id}/rankings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rankData = await rankRes.json();

        setLiveRankings(rankData.rankings || []);
        setLiveTotalVotes(rankData.totalVotes || 0);
      } else {
        // No active session — clear live session and timer
        setLiveSession(null);
        setLiveRemainingSeconds(0);
        setLiveEndTime(null);

        if (sessionData.lastSession) {
          // Show rankings from the most recent completed session
          setLastSession(sessionData.lastSession);

          const rankRes = await fetch(
            `/api/sessions/${sessionData.lastSession.id}/rankings`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const rankData = await rankRes.json();

          setLiveRankings(rankData.rankings || []);
          setLiveTotalVotes(rankData.totalVotes || 0);
        } else {
          // No sessions have ever been run
          setLastSession(null);
          setLiveRankings([]);
          setLiveTotalVotes(0);
        }
      }
    } catch (error) {
      console.error("Error fetching live data:", error);
    }
  };

  // ── Polling: historical tab ──
  useEffect(() => {
    if (subTab !== "historical") return;
    if (!selectedAcademicYear) return;

    fetchRankings();

    const interval = setInterval(fetchRankings, 3000);
    return () => clearInterval(interval);
  }, [selectedDept, selectedYear, selectedDiv, selectedAcademicYear, subTab]);

  // ── Polling: live tab — server sync every 3s ──
  useEffect(() => {
    if (subTab !== "live") return;

    fetchLiveData();

    const interval = setInterval(fetchLiveData, 3000);
    return () => clearInterval(interval);
  }, [subTab]);

  // ── Local countdown: ticks every second from liveEndTime ──
  // Runs independently of the server poll so display is always smooth
  useEffect(() => {
    if (!liveEndTime || subTab !== "live") return;

    const tick = setInterval(() => {
      const seconds = Math.floor((liveEndTime - Date.now()) / 1000);
      if (seconds <= 0) {
        setLiveRemainingSeconds(0);
        clearInterval(tick);
      } else {
        setLiveRemainingSeconds(seconds);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [liveEndTime, subTab]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const fetchProfessorNames = async () => {
    const res = await fetch("/api/reports/professors");
    const data = await res.json();
    setProfessors(data);
  };

  const canDownloadReport =
    selectedDept &&
    selectedYear &&
    selectedDiv &&
    selectedAcademicYear &&
    years.length > 0 &&
    divisions.length > 0 &&
    academicYears.length > 0;

  const canDownloadProfessorReport = professorName.trim() !== "";

  const parsedLiveDivision = liveSession
    ? liveSession.division.split("-").join(" · ").toUpperCase()
    : "";

  return (
    <div>
      {/* ── Tab switcher ── */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setSubTab("historical")}
          className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            subTab === "historical"
              ? "border-black text-black"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Historical Rankings
        </button>
        <button
          onClick={() => setSubTab("live")}
          className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            subTab === "live"
              ? "border-black text-black"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Live Rankings
        </button>
      </div>

      {/* ════════════════════════════════
          HISTORICAL TAB
      ════════════════════════════════ */}
      {subTab === "historical" && (
        <div>
          <div className="flex gap-4 mb-6 bg-gray-50 p-4 border border-gray-200">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase mb-1">
                Filter by Department
              </label>
              <select
                className="w-full p-2 border border-gray-300 focus:border-black rounded-none bg-white"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold uppercase mb-1">
                Filter by Year
              </label>
              <select
                className="w-full p-2 border border-gray-300 focus:border-black rounded-none bg-white"
                value={years.length === 0 ? "" : selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!selectedDept || years.length === 0}
              >
                {years.length === 0 && (
                  <option value="">Create classes first</option>
                )}
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold uppercase mb-1">
                Filter by Division
              </label>
              <select
                className="w-full p-2 border border-gray-300 focus:border-black rounded-none bg-white"
                value={divisions.length === 0 ? "" : selectedDiv}
                onChange={(e) => setSelectedDiv(e.target.value)}
                disabled={!selectedYear || divisions.length === 0}
              >
                {divisions.length === 0 && (
                  <option value="">Create classes first</option>
                )}
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold uppercase mb-1">
                Filter by Academic Year
              </label>
              <select
                className="w-full p-2 border border-gray-300 focus:border-black rounded-none bg-white"
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                disabled={!selectedDiv || academicYears.length === 0}
              >
                {academicYears.length === 0 && (
                  <option value="">No data available</option>
                )}
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              Ranking Results
            </h2>
            <Button
              variant="primary"
              onClick={() => {
                if (!canDownloadReport) return;
                setIsDownloadModalOpen(true);
              }}
              className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canDownloadReport}
            >
              Download Report
            </Button>
          </div>

          <Modal
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            title="Download Report"
          >
            <div className="space-y-6">
              <div className="p-4 border border-black bg-gray-50 flex flex-col items-center">
                <p className="text-xs font-bold uppercase mb-4 text-center">
                  Generate report for current selected class
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    window.open(
                      `/api/reports/class?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}&academic_year=${selectedAcademicYear}`,
                      "_blank",
                    );
                    setIsDownloadModalOpen(false);
                  }}
                >
                  Download By Class
                </Button>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase font-bold">
                  <span className="bg-white px-2 text-gray-500">OR</span>
                </div>
              </div>

              <div className="p-4 border border-black bg-gray-50">
                <SearchSelect
                  label="Professor"
                  items={professors}
                  onSelect={(p) => setProfessorName(p.name)}
                />
                <Button
                  variant="primary"
                  className="w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canDownloadProfessorReport}
                  onClick={() => {
                    if (!canDownloadProfessorReport) return;
                    window.open(
                      `/api/reports/professor?name=${encodeURIComponent(professorName)}`,
                      "_blank",
                    );
                    setIsDownloadModalOpen(false);
                    setProfessorName("");
                  }}
                >
                  Download By Professor
                </Button>
              </div>
            </div>
          </Modal>

          <Table
            headers={["Rank", "Teacher Name", "Subject", "Score"]}
            data={rankings || []}
            renderRow={(row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3 border-r border-gray-200 font-bold">
                  #{row.rank}
                </td>
                <td className="p-3 border-r border-gray-200">{row.teacher}</td>
                <td className="p-3 border-r border-gray-200">{row.subject}</td>
                <td className="p-3 font-mono">{row.score} pts</td>
              </tr>
            )}
          />

          {selectedDept && selectedYear && selectedDiv && (
            <div className="text-center mt-6 text-sm font-medium text-gray-600">
              Number of students gave feedback: {totalVotes ?? 0}
            </div>
          )}

          {(!selectedDept || !selectedDiv) && (
            <p className="text-center text-gray-500 mt-8 italic text-sm">
              Please select a department and division to view rankings.
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          LIVE TAB
      ════════════════════════════════ */}
      {subTab === "live" && (
        <div>
          {liveSession ? (
            /* ── Active session banner ── */
            <div className="flex items-center justify-between p-4 mb-6 border border-green-500 bg-green-50 text-green-800">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-xs">
                    Live Feedback Session Active
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    Class: {parsedLiveDivision}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase font-bold text-green-700 mb-0.5">
                  Time Remaining
                </p>
                <p className="text-2xl font-mono font-bold">
                  {formatTime(liveRemainingSeconds)}
                </p>
              </div>
            </div>
          ) : (
            /* ── No active session notice ── */
            <div className="flex items-center gap-3 p-4 mb-6 border border-gray-300 bg-gray-50 text-gray-600">
              <div className="relative flex h-3 w-3 flex-shrink-0">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
              </div>
              <div className="flex-1">
                <p className="font-bold uppercase tracking-wider text-xs text-gray-700">
                  No Active Voting Session
                </p>
                {lastSession ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing results from the most recent session —{" "}
                    <span className="font-semibold uppercase">
                      {lastSession.division.split("-").join(" · ")}
                    </span>{" "}
                    on{" "}
                    {new Date(lastSession.start_time).toLocaleDateString(
                      undefined,
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}{" "}
                    at{" "}
                    {new Date(lastSession.start_time).toLocaleTimeString(
                      undefined,
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      },
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5">
                    No sessions have been run yet. Go to the{" "}
                    <strong>QR Generator</strong> tab to start one.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Rankings table — shown for both active and last session ── */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              {liveSession ? "Live Rankings" : "Most Recent Session Rankings"}
            </h2>
            <span className="text-sm text-gray-500 font-medium">
              Responses received: <strong>{liveTotalVotes}</strong>
            </span>
          </div>

          {liveRankings.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center bg-gray-50">
              <p className="font-bold uppercase text-gray-700 mb-2">
                {liveSession ? "Waiting for votes..." : "No data available"}
              </p>
              <p className="text-xs text-gray-400">
                {liveSession
                  ? "Rankings will appear here as students submit their feedback."
                  : "No votes were recorded in the most recent session."}
              </p>
            </div>
          ) : (
            <Table
              headers={["Rank", "Teacher Name", "Subject", "Score"]}
              data={liveRankings}
              renderRow={(row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-3 border-r border-gray-200 font-bold">
                    #{row.rank}
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    {row.teacher}
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    {row.subject}
                  </td>
                  <td className="p-3 font-mono">{row.score} pts</td>
                </tr>
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
