import { useState } from "react";

export default function Signup({ onSignupSuccess }: { onSignupSuccess: () => void }) {
  const [role, setRole] = useState<"patient" | "caretaker" | "">("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Signup successful. Please login.");
      onSignupSuccess();
    } else {
      setMessage(data.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm mx-auto mt-10 p-4 bg-white rounded shadow"
    >
      <h2 className="text-xl font-bold mb-4">Signup</h2>
      <div className="mb-2 flex gap-4">
        <button
          type="button"
          onClick={() => setRole("patient")}
          className={`p-2 border rounded ${
            role === "patient" ? "bg-blue-100" : ""
          }`}
        >
          Patient
        </button>
        <button
          type="button"
          onClick={() => setRole("caretaker")}
          className={`p-2 border rounded ${
            role === "caretaker" ? "bg-blue-100" : ""
          }`}
        >
          Caretaker
        </button>
      </div>
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full p-2 border mb-2 rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border mb-2 rounded"
        required
      />
      <button
        type="submit"
        className="w-full text-white px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-green-500 bg-[length:200%_200%] hover:animate-gradient-x transition-all"
      >
        Signup
      </button>
      {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
    </form>
  );
}
