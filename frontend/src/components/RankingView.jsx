import { useState, useEffect } from 'react';
import { Table } from './ui/SharedComponents';

export default function RankingView() {
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedDiv, setSelectedDiv] = useState('');
    const [rankings, setRankings] = useState([]);
    const [totalVotes, setTotalVotes] = useState(0);

    const fullDivision = `${selectedDept}-${selectedYear}${selectedDiv}`;

    const fetchRankings = async () => {
    if (!selectedDept || !selectedYear || !selectedDiv) return;

    try {
        const response = await fetch(
            `/api/results?department=${selectedDept}&year=${selectedYear}&division=${selectedDiv}`
        );

        const data = await response.json();

        setRankings(data.rankings);
        setTotalVotes(data.totalVotes);

    } catch (error) {
        console.error("Error fetching rankings:", error);
    }
};

useEffect(() => {
    if (selectedDept && selectedYear && selectedDiv) {
        fetchRankings();
    } else {
        setRankings([]);
        setTotalVotes(0);
    }
}, [selectedDept, selectedYear, selectedDiv]);


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
                        <option value="a">A</option>
                        <option value="b">B</option>
                        <option value="c">C</option>
                    </select>
                </div>
            </div>

            <h2 className="text-lg font-bold uppercase tracking-wide mb-4">Ranking Results</h2>

            <Table
                headers={['Rank', 'Teacher Name', 'Subject', 'Score']}
                data={rankings || []}
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
                    Number of students gave feedback: {totalVotes}
                </div>
            )}

            {(!selectedDept || !selectedDiv) && (
                <p className="text-center text-gray-500 mt-8 italic text-sm">Please select a department and division to view rankings.</p>
            )}
        </div>
    );
}
