import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/SharedComponents";

export default function BulkUpload() {
  const { user } = useAuth();
  const isPrincipal = user?.role === "principal";

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [resultType, setResultType] = useState(""); // "success" | "error"
  const [createdAccounts, setCreatedAccounts] = useState([]);

  const copyCredentials = (username, password) => {
    const text = `Username: ${username}\nPassword: ${password}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      alert(`Credentials copied!\n\n${text}`);
    } catch (err) {
      console.error("Clipboard failed:", err);
      alert(text);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResultMsg("");
    setResultType("");
    setCreatedAccounts([]);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/bulk-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResultMsg(data.message || "Bulk upload completed successfully");
        setResultType("success");
        setCreatedAccounts(data.createdAccounts || []);
        setFile(null);
      } else {
        setResultMsg(data.message || "Bulk upload failed");
        setResultType("error");
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      setResultMsg("Server error. Please try again later.");
      setResultType("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto border border-black p-8 bg-white">
      <h2 className="text-lg font-bold uppercase tracking-wide mb-6 text-center">
        Bulk Upload
      </h2>

      <div className="border border-gray-200 bg-gray-50 p-4 mb-6 text-xs text-gray-700 space-y-2">
        <p className="font-bold uppercase text-gray-800">Sheet Format</p>
        {isPrincipal ? (
          <>
            <p>Column A = <span className="font-mono">DEPT</span>, Column B = department code. Wrap one or more divisions inside it.</p>
            <p>Column A = <span className="font-mono">DIV</span>, Column B = year (FE/SE/TE/BE), Column C = division letter.</p>
            <p>Then rows of Professor Name (Col A) / Subject Name (Col B).</p>
            <p>Close with <span className="font-mono">END_DIV</span>, then <span className="font-mono">END_DEPT</span>. Multiple departments allowed in one file.</p>
          </>
        ) : (
          <>
            <p>No department marker needed — this file only covers your own department.</p>
            <p>Column A = <span className="font-mono">DIV</span>, Column B = year (FE/SE/TE/BE), Column C = division letter.</p>
            <p>Then rows of Professor Name (Col A) / Subject Name (Col B).</p>
            <p>Close with <span className="font-mono">END_DIV</span>. Multiple divisions allowed in one file.</p>
          </>
        )}
        <p className="text-gray-500 italic">Uploading a division re-writes all its existing subject-professor assignments to match the sheet.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold uppercase mb-1">
            Select Excel File
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0] || null)}
            disabled={uploading}
            className="w-full p-2 border border-black rounded-none focus:outline-none focus:ring-1 focus:ring-black bg-white text-sm"
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full ${!file || uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {resultMsg && (
        <div className="mt-6">
          <p
            className={`p-2 border text-sm font-bold text-center ${
              resultType === "success"
                ? "bg-green-50 border-green-400 text-green-700"
                : "bg-red-50 border-red-400 text-red-700"
            }`}
          >
            {resultMsg}
          </p>
        </div>
      )}

      {createdAccounts.length > 0 && (
        <div className="mt-6 border border-gray-200 p-4">
          <h3 className="text-xs font-bold uppercase mb-3 text-gray-700">
            New Department Accounts Created
          </h3>
          <div className="space-y-2">
            {createdAccounts.map((acc) => (
              <div
                key={acc.dept}
                className="flex justify-between items-center bg-gray-50 p-3 border border-gray-100"
              >
                <div className="text-sm">
                  <span className="font-bold">{acc.dept}</span>{" "}
                  <span className="text-gray-500">({acc.username})</span>
                </div>
                <Button
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  onClick={() => copyCredentials(acc.username, acc.tempPassword)}
                >
                  Copy Credentials
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}