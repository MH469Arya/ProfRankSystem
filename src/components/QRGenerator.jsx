import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from './ui/SharedComponents';

export default function QRGenerator() {
    const [dept, setDept] = useState('');
    const [classroom, setClassroom] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

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
        if (dept && classroom) {
            setShowQR(true);
            setTimeLeft(300);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const [year, div] = classroom ? classroom.split('-') : ['', ''];
    const votingUrl = `https://ranking-system.com/vote/${dept}/${year}/${div}`;

    return (
        <div className="max-w-xl mx-auto border border-black p-8 bg-white">
            <h2 className="text-lg font-bold uppercase tracking-wide mb-6 text-center">Generate Voting Session</h2>

            <div className="space-y-4 mb-8">
                <div>
                    <label className="block text-sm font-bold uppercase mb-1">Choose Department</label>
                    <select
                        className="w-full p-2 border border-black rounded-none focus:outline-none focus:ring-1 focus:ring-black"
                        value={dept}
                        onChange={e => setDept(e.target.value)}
                    >
                        <option value="">Select...</option>
                        <option value="cs">Computer Engineering</option>
                        <option value="aiml">AIML</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold uppercase mb-1">Choose Classroom</label>
                    <select
                        className="w-full p-2 border border-black rounded-none focus:outline-none focus:ring-1 focus:ring-black"
                        value={classroom}
                        onChange={e => setClassroom(e.target.value)}
                        disabled={!dept}
                    >
                        <option value="">Select...</option>
                        <optgroup label="First Year">
                            <option value="FE-A">FE A</option>
                            <option value="FE-B">FE B</option>
                            <option value="FE-C">FE C</option>
                        </optgroup>
                        <optgroup label="Second Year">
                            <option value="SE-A">SE A</option>
                            <option value="SE-B">SE B</option>
                            <option value="SE-C">SE C</option>
                        </optgroup>
                        <optgroup label="Third Year">
                            <option value="TE-A">TE A</option>
                            <option value="TE-B">TE B</option>
                            <option value="TE-C">TE C</option>
                        </optgroup>
                        <optgroup label="Final Year">
                            <option value="BE-A">BE A</option>
                            <option value="BE-B">BE B</option>
                            <option value="BE-C">BE C</option>
                        </optgroup>
                    </select>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={!dept || !classroom || showQR}
                    className={`w-full ${showQR ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {showQR ? 'Session Active' : 'Generate QR Code'}
                </Button>
            </div>

            {showQR && (
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200">
                    <QRCodeCanvas value={votingUrl} size={200} level="H" />
                    <p className="mt-4 text-xs tracking-widest uppercase text-gray-500">Scan to Vote</p>
                    <div className="mt-4 text-2xl font-bold font-mono">
                        Time Remaining: {formatTime(timeLeft)}
                    </div>
                    <p className="text-xs text-red-600 font-bold mt-2 uppercase">Do not refresh</p>
                </div>
            )}

            {timeLeft === 0 && !showQR && dept && classroom && (
                <p className="text-center text-sm text-gray-500 mt-4">Session expired. Generate a new code.</p>
            )}
        </div>
    );
}
