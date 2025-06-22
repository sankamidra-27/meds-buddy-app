import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Check, Calendar as CalendarIcon, Plus, User } from "lucide-react";
import MedicationTracker from "./MedicationTracker";
import { format, isToday } from "date-fns";

const PatientDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [takenDates, setTakenDates] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [statusByDate, setStatusByDate] = useState<
    Record<string, "taken" | "missed">
  >({});
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const userId = getUserIdFromToken(token);
    if (!userId) return;

    fetch("http://localhost:5000/medications/calendar-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((res) => res.json())
      .then((data) => setStatusByDate(data))
      .catch((err) => {
        console.error("Failed to load calendar summary", err);
        setStatusByDate({});
      });
  }, []);

  const [medication, setMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    time: "",
  });
  const [medications, setMedications] = useState([]);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isTodaySelected = isToday(selectedDate);
  const isSelectedDateTaken = takenDates.has(selectedDateStr);
  const [summary, setSummary] = useState({
    streak: 0,
    totalTaken: 0,
    totalMissed: 0,
    adherenceRate: "0.00%",
  });

  const handleMarkTaken = (date: string, updatedIds: number[]) => {
    setTakenDates((prev) => {
      const updated = new Set(prev);
      if (updatedIds.length > 0) updated.add(date);
      return updated;
    });
    fetchMedications(); // Reload from server
  };
  const fetchSummary = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const userId = getUserIdFromToken(token);
    if (!userId) return;

    const todayStr = format(new Date(), "yyyy-MM-dd");

    try {
      const res = await fetch("http://localhost:5000/medications/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, date: todayStr }),
      });

      if (!res.ok) throw new Error("Summary fetch failed");

      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error("❌ Error fetching summary:", err);
    }
  };
  useEffect(() => {
    fetchSummary();
  }, []);

  const getStreakCount = () => {
    let streak = 0;
    let currentDate = new Date(today);
    while (takenDates.has(format(currentDate, "yyyy-MM-dd")) && streak < 30) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    return streak;
  };

  function getUserIdFromToken(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id;
    } catch (err) {
      console.error("Token decode error:", err);
      return null;
    }
  }

  const fetchMedications = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`http://localhost:5000/medications?date=${selectedDateStr}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Fetch error");
        return res.json();
      })
      .then((data) => {
        setMedications(data);
        setError(null);
      })
      .catch(() => {
        setError("⚠️ Could not load medications.");
      });
  };

  useEffect(() => {
    fetchMedications();
  }, [selectedDateStr]);

  const handleSubmitMedication = async (e: any) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Not authenticated");

    const user_id = getUserIdFromToken(token);
    if (!user_id) return alert("Invalid token");

    const payload = {
      ...medication,
      date: selectedDateStr,
      user_id,
    };

    try {
      const res = await fetch("http://localhost:5000/medications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save medication");

      setMedication({ name: "", dosage: "", frequency: "", time: "" });
      setShowModal(false);
      fetchMedications();
    } catch (err) {
      alert("Failed to save medication");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative max-w-xl mx-auto text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="absolute top-1 right-2 text-red-500 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Hero Card */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">
              Good{" "}
              {new Date().getHours() < 12
                ? "Morning"
                : new Date().getHours() < 18
                ? "Afternoon"
                : "Evening"}
              !
            </h2>
            <p className="text-white/90 text-lg">
              Ready to stay on track with your medication?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{summary.streak}</div>
            <div className="text-white/80">Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{summary.totalTaken}</div>
            <div className="text-white/80">Total Taken</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{summary.totalMissed}</div>
            <div className="text-white/80">Total Missed</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{summary.adherenceRate}</div>
            <div className="text-white/80">Adherence Rate</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                  {isTodaySelected
                    ? "Today's Medication"
                    : `Medication for ${format(selectedDate, "MMMM d, yyyy")}`}
                </CardTitle>
                <Button
                  onClick={() => setShowModal(true)}
                  className="gap-1 bg-gradient-to-r from-blue-600 to-green-500 text-white shadow-md hover:shadow-lg hover:shadow-green-400/50 transition-all duration-300"
                >
                  <Plus className="w-4 h-4" /> Add Medication
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <MedicationTracker
                date={selectedDateStr}
                isTaken={isSelectedDateTaken}
                onMarkTaken={handleMarkTaken}
                isToday={isTodaySelected}
                medications={medications}
              />
            </CardContent>
          </Card>
        </div>

        {/* Calendar Column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Medication Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full scale-[1.2] text-base"
                modifiers={{
                  green: Object.entries(statusByDate)
                    .filter(([_, status]) => status === "taken")
                    .map(([date]) => new Date(date)),
                  red: Object.entries(statusByDate)
                    .filter(([_, status]) => status === "missed")
                    .map(([date]) => new Date(date)),
                }}
                components={{
                  DayContent: (props) => {
                    const dateStr = format(props.date, "yyyy-MM-dd");
                    const status = statusByDate[dateStr];

                    return (
                      <div className="relative flex items-center justify-center w-full h-full text-lg">
                        <span>{format(props.date, "d")}</span>
                        {status && (
                          <span
                            className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
                              status === "taken" ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                        )}
                      </div>
                    );
                  },
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              💊 Add Medication
            </h2>
            <form onSubmit={handleSubmitMedication} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={medication.name}
                onChange={(e) =>
                  setMedication({ ...medication, name: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Dosage"
                value={medication.dosage}
                onChange={(e) =>
                  setMedication({ ...medication, dosage: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Frequency"
                value={medication.frequency}
                onChange={(e) =>
                  setMedication({ ...medication, frequency: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="time"
                value={medication.time}
                onChange={(e) =>
                  setMedication({ ...medication, time: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
