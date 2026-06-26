import { useState, useEffect } from "react";
import { Table, Modal, Button, Input } from "./ui/SharedComponents";
import SearchSelect from "./SearchSelect";

export default function RankingView() {
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDiv, setSelectedDiv] = useState("");

  const [rankings, setRankings] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [professorName, setProfessorName] = useState("");

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  const deptClasses = classes.filter((c) => c.dept === selectedDept);

  const years = [...new Set(deptClasses.map((c) => c.year))];

  const yearClasses = deptClasses.filter((c) => c.year === selectedYear);

  const divisions = [...new Set(yearClasses.map((c) => c.division))];

  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [academicYears, setAcademicYears] = useState([]);

  const [professors, setProfessors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const deptRes = await fetch("/api/departments");
        const deptData = await deptRes.json();
        setDepartments(deptData);

        const classRes = await fetch("/api/principal/classes", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const classData = await classRes.json();
        setClasses(Array.isArray(classData) ? classData : []);
      } catch (err) {
        console.error("Failed to fetch ranking filters", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (departments.length > 0 && !selectedDept) {
      setSelectedDept(departments[0].code);
    }
  }, [departments]);

  useEffect(() => {
    setSelectedYear("");
    setSelectedDiv("");
  }, [selectedDept]);

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      setSelectedYear(years[0]);
    }
  }, [years]);

  useEffect(() => {
    setSelectedDiv("");
  }, [selectedYear]);

  useEffect(() => {
    if (divisions.length > 0 && !selectedDiv) {
      setSelectedDiv(divisions[0]);
    }
  }, [divisions]);

  const fetchAcademicYears = async () => {
    if (!selectedDept || !selectedYear || !selectedDiv) return;

    const res = await fetch(
      `/api/academic-years?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}`,
    );

    const data = await res.json();

    setAcademicYears(data);

    if (data.length > 0 && !selectedAcademicYear) {
      setSelectedAcademicYear(data[0]);
    }
  };

  const [subTab, setSubTab] = useState("historical");
  const [liveRankings, setLiveRankings] = useState([]);
  const [liveTotalVotes, setLiveTotalVotes] = useState(0);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveRemainingSeconds, setLiveRemainingSeconds] = useState(0);
  const [activeSessionsList, setActiveSessionsList] = useState([]);

  useEffect(() => {
    fetchAcademicYears();
  }, [selectedDept, selectedYear, selectedDiv]);

  const fetchRankings = async () => {
    if (!selectedDept || !selectedYear || !selectedDiv || !selectedAcademicYear) return;

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

  const fetchLiveRankings = async () => {
    if (!selectedDept || !selectedYear || !selectedDiv) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/live-results?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      setIsLiveActive(data.active);
      if (data.active) {
        setLiveRankings(data.rankings || []);
        setLiveTotalVotes(data.totalVotes || 0);
        setLiveRemainingSeconds(data.remaining_seconds || 0);
      } else {
        setLiveRankings([]);
        setLiveTotalVotes(0);
        setLiveRemainingSeconds(0);
      }
    } catch (error) {
      console.error("Error fetching live rankings:", error);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/live-sessions", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSessionsList(data || []);
      }
    } catch (error) {
      console.error("Error fetching active sessions list:", error);
    }
  };

  useEffect(() => {
    if (!selectedDept || !selectedYear || !selectedDiv) {
      setRankings([]);
      setTotalVotes(0);
      setLiveRankings([]);
      setLiveTotalVotes(0);
      return;
    }

    if (subTab === "historical") {
      if (selectedAcademicYear) {
        fetchRankings();
      }
      const interval = setInterval(() => {
        fetchAcademicYears();
        fetchRankings();
      }, 3000);
      return () => clearInterval(interval);
    } else {
      fetchLiveRankings();
      fetchLiveSessions();
      const interval = setInterval(() => {
        fetchLiveRankings();
        fetchLiveSessions();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedDept, selectedYear, selectedDiv, selectedAcademicYear, subTab]);

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

  useEffect(() => {
    fetchProfessorNames();
  }, []);

  const canDownloadReport =
    selectedDept &&
    selectedYear &&
    selectedDiv &&
    selectedAcademicYear &&
    years.length > 0 &&
    divisions.length > 0 &&
    academicYears.length > 0;

  const canDownloadProfessorReport = professorName.trim() !== "";

  return (
    <div>
      {/* Sub Tabs Selection */}
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

      {subTab === "historical" ? (
        <div>
          {/* Historical Filters */}
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
                    const url = `/api/reports/class?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}&academic_year=${selectedAcademicYear}`;
                    window.open(url, "_blank");

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
                    const url =
                      `/api/reports/professor?` +
                      `name=${encodeURIComponent(professorName)}`;

                    window.open(url, "_blank");

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
      ) : (
        <div>

          {selectedDept && selectedYear && selectedDiv ? (
            <div>
              {isLiveActive ? (
                <div>
                  {/* Live active session layout */}
                  <div className="flex items-center justify-between p-4 mb-6 border border-green-500 bg-green-50 text-green-800 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="font-bold uppercase tracking-wider text-xs">Live Feedback Session Active</span>
                    </div>
                    <div className="text-sm font-mono font-bold">
                      Time Remaining: {formatTime(liveRemainingSeconds)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold uppercase tracking-wide">
                      Live Rankings Results
                    </h2>
                  </div>

                  <Table
                    headers={["Rank", "Teacher Name", "Subject", "Score"]}
                    data={liveRankings || []}
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

                  <div className="text-center mt-6 text-sm font-medium text-gray-600">
                    Number of student responses received: {liveTotalVotes ?? 0}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Live inactive session layout */}
                  <div className="border border-gray-200 p-8 text-center bg-gray-50 mb-6 rounded-none">
                    <p className="font-bold uppercase text-gray-700 mb-2">No Active Voting Session</p>
                    <p className="text-xs text-gray-400">
                      Go to the "QR Generator" tab to start a session for this classroom.
                    </p>
                  </div>

                  {/* Other active sessions */}
                  {activeSessionsList.length > 0 ? (
                    <div className="border border-gray-200 p-6 rounded-none">
                      <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-700">
                        Active Sessions in Other Classrooms
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeSessionsList.map((session) => {
                          const [dept, yr, div] = session.division.split("-");
                          return (
                            <div key={session.id} className="border border-gray-300 p-4 flex justify-between items-center hover:border-black transition-colors rounded-none bg-white">
                              <div>
                                <p className="font-bold text-sm uppercase">{dept} - {yr} - {div}</p>
                                <p className="text-xs text-gray-500">Votes Cast: {session.votes_cast} / {session.max_votes || 70}</p>
                              </div>
                              <Button
                                variant="secondary"
                                className="text-xs py-1.5 px-3 font-bold uppercase"
                                onClick={() => {
                                  setSelectedDept(dept.toUpperCase());
                                  setSelectedYear(yr.toUpperCase());
                                  setSelectedDiv(div.toUpperCase());
                                }}
                              >
                                View Live Results
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 text-xs italic mt-4">
                      No active feedback sessions are running in any classroom.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-8 italic text-sm">
              Please select a department and division to view live rankings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
