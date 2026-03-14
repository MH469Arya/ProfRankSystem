import { useState } from 'react';
import { Table } from './ui/SharedComponents';

export default function RankingView() {
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedDiv, setSelectedDiv] = useState('');

    // Mock Data
    const rankings = [
        { rank: 1, teacher: 'Teacher 1', subject: 'Algorithms', score: 450, votes: 98 },
        { rank: 2, teacher: 'Teacher 2', subject: 'Database', score: 410, votes: 95 },
        { rank: 3, teacher: 'Teacher 3', subject: 'Networking', score: 380, votes: 90 },
    ];

    return (
        <div>
            <div className="flex gap-4 mb-6 bg-gray-50 p-4 border border-gray-200">
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase mb-1">Filter by Department</label>
                    <select
                        className="w-full p-2 border border-gray-300 focus:border-black rounded-none bg-white"
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                    >
                        <option value="">Select Department</option>
                        <option value="cs">Computer Engineering</option>
                        <option value="aiml">AIML</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase mb-1">Filter by Year</label>
                    <select
                        className="w-full p-2 border border-gray-300 focus:border-black rounded-none bg-white"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="">Select Year</option>
                        <option value="fe">FE</option>
                        <option value="se">SE</option>
                        <option value="te">TE</option>
                        <option value="be">BE</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase mb-1">Filter by Division</label>
                    <select
                        className="w-full p-2 border border-gray-300 focus:border-black rounded-none bg-white"
                        value={selectedDiv}
                        onChange={(e) => setSelectedDiv(e.target.value)}
                    >
                        <option value="">Select Division</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                    </select>
                </div>
            </div>

            <h2 className="text-lg font-bold uppercase tracking-wide mb-4">Ranking Results</h2>

            <Table
                headers={['Rank', 'Teacher Name', 'Subject', 'Score']}
                data={selectedDept && selectedYear && selectedDiv ? rankings : []}
                renderRow={(row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 border-r border-gray-200 font-bold">#{row.rank}</td>
                        <td className="p-3 border-r border-gray-200">{row.teacher}</td>
                        <td className="p-3 border-r border-gray-200">{row.subject}</td>
                        <td className="p-3 font-mono">{row.score} pts</td>
                    </tr>
                )}
            />

            {selectedDept && selectedYear && selectedDiv && (
                <div className="text-center mt-6 text-sm font-medium text-gray-600">
                    Number of students gave feedback: 58
                </div>
            )}

            {(!selectedDept || !selectedDiv) && (
                <p className="text-center text-gray-500 mt-8 italic text-sm">Please select a department and division to view rankings.</p>
            )}
        </div>
    );

    const data = await res.json();

    setAcademicYears(data);

    if (data.length > 0 && !selectedAcademicYear) {
      setSelectedAcademicYear(data[0]);
    }
  };

  useEffect(() => {
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

  useEffect(() => {
    if (!selectedDept || !selectedYear || !selectedDiv) return;

    const interval = setInterval(() => {
      fetchAcademicYears(); // check if first vote created academic year
      fetchRankings(); // update rankings
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedDept, selectedYear, selectedDiv, selectedAcademicYear]);

  const handleDownloadReport = (row) => {
    const total = totalVotes;
    const dist = row.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, "5plus": 0 };
    
    const getPercent = (count) => total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professor Ranking Report - ${row.teacher}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #000; background: #fff; line-height: 1.6; }
        .container { max-width: 700px; margin: 0 auto; padding: 30px; border: 1px solid #000; }
        h1 { text-align: center; font-size: 22px; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h2 { font-size: 16px; margin: 25px 0 10px 0; border-bottom: 1px solid #000; padding-bottom: 5px; }
        .row { display: flex; margin: 12px 0; font-size: 15px; }
        .label { width: 260px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 10px; text-align: center; }
        th { background: #f0f0f0; }
        .note { font-size: 13px; margin-top: 30px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>PROFESSOR RANKING REPORT</h1>
        <h2>Teacher Details</h2>
        <div class="row"><span class="label">Name:</span> ${row.teacher}</div>
        <div class="row"><span class="label">Subject:</span> ${row.subject}</div>
        <h2>Class Details</h2>
        <div class="row"><span class="label">Department:</span> ${selectedDept.toUpperCase()}</div>
        <div class="row"><span class="label">Year / Semester:</span> ${selectedYear.toUpperCase()}</div>
        <div class="row"><span class="label">Division:</span> ${selectedDiv.toUpperCase()}</div>
        <h2>Ranking Summary</h2>
        <div class="row"><span class="label">Final Rank:</span> #${row.rank}</div>
        <div class="row"><span class="label">Total Points:</span> ${row.score}</div>
        <div class="row"><span class="label">Total Number of Votes Given:</span> ${total}</div>
        <h2>How Many Students Gave Which Rank</h2>
        <table>
            <tr><th>Rank Given by Student</th><th>Number of Students</th><th>Percentage</th></tr>
            <tr><td>1st Rank</td><td>${dist[1]}</td><td>${getPercent(dist[1])} %</td></tr>
            <tr><td>2nd Rank</td><td>${dist[2]}</td><td>${getPercent(dist[2])} %</td></tr>
            <tr><td>3rd Rank</td><td>${dist[3]}</td><td>${getPercent(dist[3])} %</td></tr>
            <tr><td>4th Rank</td><td>${dist[4]}</td><td>${getPercent(dist[4])} %</td></tr>
            <tr><td>5th Rank & below</td><td>${dist["5plus"]}</td><td>${getPercent(dist["5plus"])} %</td></tr>
        </table>
        <div class="note">Report generated from website • Academic Year: ${selectedAcademicYear}</div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Report_${row.teacher.replace(/\s+/g, "_")}_${selectedAcademicYear}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


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
        headers={["Rank", "Teacher Name", "Subject", "Score", "Actions"]}
        data={rankings || []}
        renderRow={(row, i) => (
          <tr key={i} className="hover:bg-gray-50">
            <td className="p-3 border-r border-gray-200 font-bold">
              #{row.rank}
            </td>
            <td className="p-3 border-r border-gray-200">{row.teacher}</td>
            <td className="p-3 border-r border-gray-200">{row.subject}</td>
            <td className="p-3 border-r border-gray-200 font-mono">{row.score} pts</td>
            <td className="p-3">
              <button
                onClick={() => handleDownloadReport(row)}
                className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1 hover:bg-gray-800 transition-colors"
              >
                Download
              </button>
            </td>
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
  );
}
