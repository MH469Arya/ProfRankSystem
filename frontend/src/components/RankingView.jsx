import { useState, useEffect } from "react";
import { Table } from "./ui/SharedComponents";

export default function RankingView() {
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDiv, setSelectedDiv] = useState("");

  const [rankings, setRankings] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  const deptClasses = classes.filter((c) => c.dept === selectedDept);

  const years = [...new Set(deptClasses.map((c) => c.year))];

  const yearClasses = deptClasses.filter((c) => c.year === selectedYear);

  const divisions = [...new Set(yearClasses.map((c) => c.division))];

  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [academicYears, setAcademicYears] = useState([]);

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

  useEffect(() => {
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

    fetchAcademicYears();
  }, [selectedDept, selectedYear, selectedDiv]);

  const fetchRankings = async () => {
    if (!selectedDept || !selectedYear || !selectedDiv) return;

    try {
      const response = await fetch(
        `/api/results?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}&academic_year=${selectedAcademicYear}`,
      );

      const data = await response.json();

      setRankings(data.rankings);
      setTotalVotes(data.totalVotes);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    }
  };

  useEffect(() => {
    if (selectedDept && selectedYear && selectedDiv && selectedAcademicYear) {
      fetchRankings();
    } else {
      setRankings([]);
      setTotalVotes(0);
    }
  }, [selectedDept, selectedYear, selectedDiv, selectedAcademicYear]);

  return (
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

      <h2 className="text-lg font-bold uppercase tracking-wide mb-4">
        Ranking Results
      </h2>

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
          Number of students gave feedback: {totalVotes}
        </div>
      )}

      {(!selectedDept || !selectedDiv) && (
        <p className="text-center text-gray-500 mt-8 italic text-sm">
          Please select a department and division to view rankings.
        </p>
      )}
    </div>
  );
}
