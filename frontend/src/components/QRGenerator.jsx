import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "./ui/SharedComponents";

export default function QRGenerator() {
  const [dept, setDept] = useState("");
  const [classroom, setClassroom] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [qrUrl, setQrUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

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
        console.error("Failed to fetch data", err);
      }
    };

    fetchData();
  }, []);

  const groupClassesByYear = (classList) => {
    const groups = {};

    classList.forEach((cls) => {
      if (!groups[cls.year]) {
        groups[cls.year] = [];
      }
      groups[cls.year].push(cls);
    });

    return groups;
  };

  const filteredClasses = classes.filter((cls) => cls.dept === dept);
  const classesByYear = groupClassesByYear(filteredClasses);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (showQR && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setShowQR(false);
    }
    return () => clearInterval(interval);
  }, [showQR, timeLeft]);

  const handleGenerate = () => {
    if (!dept || !classroom) return;

    setIsGenerating(true);

    // Short fake delay to simulate generation
    setTimeout(() => {
      // Build divKey: aiml-se-a (remove '-' from classroom code like SE-A → se-a)
      const cleanClassroom = classroom.toLowerCase();
      const divKey = `${dept.toLowerCase()}-${cleanClassroom}`;

      // Fake token with timestamp for expiration simulation
      const fakeToken = `dev-${Date.now().toString(36).slice(-8)}`;

      // Final short URL
      const generatedUrl = `${window.location.origin}/v?div=${divKey}&t=${fakeToken}`;

      setQrUrl(generatedUrl);
      setShowQR(true);
      setTimeLeft(300); // 5 minutes
      setIsGenerating(false);
    }, 400);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-xl mx-auto border border-black p-8 bg-white">
      <h2 className="text-lg font-bold uppercase tracking-wide mb-6 text-center">
        Generate Voting Session
      </h2>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-bold uppercase mb-1">
            Choose Department
          </label>
          <select
            className="w-full p-2 border border-black rounded-none focus:outline-none focus:ring-1 focus:ring-black"
            value={dept}
            onChange={(e) => {
              setDept(e.target.value);
              setClassroom(""); // reset classroom when dept changes
              setShowQR(false);
            }}
          >
            <option value="">Select...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.code}>
                {d.code.toUpperCase()}
              </option>
            ))}
            {/* Add more departments as needed */}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold uppercase mb-1">
            Choose Classroom
          </label>
          <select
            className="w-full p-2 border border-black rounded-none focus:outline-none focus:ring-1 focus:ring-black"
            value={classroom}
            onChange={(e) => setClassroom(e.target.value)}
            disabled={!dept}
          >
            {Object.entries(classesByYear).map(([year, clsList]) => (
              <optgroup key={year} label={year}>
                {clsList.map((cls) => (
                  <option key={cls.id} value={`${cls.year}-${cls.division}`}>
                    {cls.year}-{cls.division}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!dept || !classroom || showQR || isGenerating}
          className={`w-full ${showQR || isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isGenerating
            ? "Generating..."
            : showQR
              ? "Session Active"
              : "Generate QR Code (5 min)"}
        </Button>
      </div>

      {showQR && timeLeft > 0 && (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200">
          <QRCodeSVG
            value={qrUrl}
            size={200}
            fgColor="#000000"
            bgColor="#ffffff"
            level="H"
          />
          <p className="mt-4 text-xs tracking-widest uppercase text-gray-500">
            Scan to Vote
          </p>
          <div className="mt-4 text-2xl font-bold font-mono text-black">
            Time Remaining: {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-red-600 font-bold mt-2 uppercase">
            Do not refresh or share
          </p>
        </div>
      )}

      {timeLeft === 0 && showQR && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Session expired. Generate a new QR code.
        </p>
      )}
    </div>
  );
}
