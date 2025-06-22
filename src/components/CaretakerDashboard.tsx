import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { DayContentProps } from "react-day-picker"; // ✅ import for typing

import {
  Users,
  Bell,
  Calendar as CalendarIcon,
  Mail,
  AlertTriangle,
  Check,
  Clock,
  Camera,
} from "lucide-react";
import NotificationSettings from "./NotificationSettings";
import { format, subDays, isToday, isBefore, startOfDay } from "date-fns";

type Medication = {
  id: number;
  name: string;
  date: string;
  time: string;
  taken: number;
};

const CaretakerDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [patients, setPatients] = useState<{ id: number; username: string }[]>(
    []
  );
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null
  );
  const [patientName, setPatientName] = useState<string>("");
  const [todaysMeds, setTodaysMeds] = useState<Medication[]>([]);
  const [summary, setSummary] = useState<{
    streak: number;
    totalTaken: number;
    totalMissed: number;
    adherenceRate: string;
  } | null>(null);
  const [statusByDate, setStatusByDate] = useState<
    Record<string, "taken" | "missed">
  >({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/patients", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const capitalized = data.map((p: any) => ({
          ...p,
          username: p.username.charAt(0).toUpperCase() + p.username.slice(1),
        }));
        setPatients(capitalized);
      })
      .catch((err) => console.error("❌ Could not load patients:", err));
  }, []);

  const handlePatientChange = (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const selected = patients.find((p) => p.id === id);
    setSelectedPatientId(id);
    setPatientName(selected?.username ?? "");

    const today = format(new Date(), "yyyy-MM-dd");
    // Fetch calendar overview for past 30 days
    fetch("http://localhost:5000/medications/calendar-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: id,
      }),
    })
      .then((res) => res.json())
      .then((data) => setStatusByDate(data)) // Expected format: { "2025-06-21": "taken", "2025-06-20": "missed" }
      .catch((err) => {
        console.error("Failed to fetch calendar summary", err);
        setStatusByDate({});
      });

    // Fetch today’s meds
    fetch("http://localhost:5000/caretaker/medications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: id,
        date: today,
      }),
    })
      .then((res) => res.json())
      .then((data) => setTodaysMeds(data))
      .catch((err) => {
        console.error("Failed to fetch patient meds", err);
        setTodaysMeds([]);
      });

    // Fetch summary
    fetch("http://localhost:5000/medications/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: id,
        date: today,
      }),
    })
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => {
        console.error("Failed to fetch medication summary", err);
        setSummary(null);
      });
  };

  const handleSendReminderEmail = () => {
    alert("Reminder email sent to " + patientName);
  };

  const handleConfigureNotifications = () => setActiveTab("notifications");
  const handleViewCalendar = () => setActiveTab("calendar");

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Caretaker Dashboard</h2>
            <p className="text-white/90 text-lg">
              Monitoring {patientName}'s medication adherence
            </p>
          </div>
        </div>
        {summary && (
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
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-4">
          <label htmlFor="patientSelect" className="font-medium">
            Select Patient:
          </label>
          <select
            id="patientSelect"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-foreground bg-background"
            value={selectedPatientId ?? ""}
            onChange={(e) => handlePatientChange(parseInt(e.target.value))}
          >
            <option value="" disabled>
              Select a patient
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Today's Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todaysMeds.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    No medications found for today.
                  </div>
                ) : (
                  todaysMeds.map((med) => {
                    const medTime = new Date(`${med.date}T${med.time}`);
                    const now = new Date();
                    const status =
                      med.taken === 1
                        ? "taken"
                        : now < medTime
                        ? "pending"
                        : "missed";

                    const chipColor =
                      status === "taken"
                        ? "bg-green-500"
                        : status === "pending"
                        ? "bg-orange-500"
                        : "bg-red-500";

                    const borderColor =
                      status === "taken"
                        ? "hover:border-green-500"
                        : status === "pending"
                        ? "hover:border-orange-500"
                        : "hover:border-red-500";

                    return (
                      <div
                        key={med.id}
                        className={`p-3 border rounded-lg transition-all ${borderColor}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{med.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(
                                new Date(`2020-01-01T${med.time}`),
                                "h:mm a"
                              )}
                            </p>
                          </div>
                          <span
                            className={`text-white px-2 py-1 rounded-full text-xs ${chipColor}`}
                          >
                            {status === "taken"
                              ? "Taken"
                              : status === "pending"
                              ? "Pending"
                              : "Missed"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleSendReminderEmail}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminder Email
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleConfigureNotifications}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Configure Notifications
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleViewCalendar}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  View Full Calendar
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Recent Medication Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todaysMeds.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No medications found for today.
                </div>
              ) : (
                todaysMeds
                  .filter(
                    (med) =>
                      med.taken === 1 ||
                      new Date() > new Date(`${med.date}T${med.time}`)
                  )
                  .map((med) => {
                    const medDateTime = new Date(`${med.date}T${med.time}`);
                    const now = new Date();
                    const diffMs = now.getTime() - medDateTime.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const timeAgo =
                      diffMins >= 60
                        ? `${Math.floor(diffMins / 60)} hour${
                            Math.floor(diffMins / 60) > 1 ? "s" : ""
                          } ago`
                        : `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;

                    const status = med.taken === 1 ? "taken" : "missed";
                    const chipColor =
                      status === "taken" ? "bg-green-500" : "bg-red-500";
                    const borderColor =
                      status === "taken"
                        ? "hover:border-green-500"
                        : "hover:border-red-500";

                    return (
                      <div
                        key={med.id}
                        className={`p-3 border rounded-lg transition-all ${borderColor} flex items-center justify-between`}
                      >
                        <div>
                          <h4 className="font-medium">{med.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {status === "taken"
                              ? `Taken ${timeAgo}`
                              : `Missed ${timeAgo}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-white px-2 py-1 rounded-full text-xs ${chipColor}`}
                          >
                            {status === "taken" ? "Taken" : "Missed"}
                          </span>
                          {status === "missed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-100 transition"
                              onClick={() =>
                                alert(
                                  `Reminder sent for ${med.name} to ${patientName}`
                                )
                              }
                            >
                              <Bell className="w-4 h-4 mr-1" />
                              Remind
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                Calendar View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-center w-full min-h-[500px] p-6">
                <div className="w-full max-w-4xl flex justify-center">
                  <div className="scale-[1.4] text-base">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) setSelectedDate(date);
                    }}
                    modifiers={{
                      green: Object.entries(statusByDate)
                        .filter(([_, status]) => status === "taken")
                        .map(([date]) => new Date(date)),
                      red: Object.entries(statusByDate)
                        .filter(([_, status]) => status === "missed")
                        .map(([date]) => new Date(date)),
                    }}
                    components={{
                      DayContent: (props: DayContentProps) => {
                        const dateStr = format(props.date, "yyyy-MM-dd");
                        const status = statusByDate[dateStr];

                        return (
                          <div className="relative flex items-center justify-center w-full h-full text-lg">
                            <span>{format(props.date, "d")}</span>
                            {status && (
                              <span
                                className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
                                  status === "taken"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              />
                            )}
                          </div>
                        );
                      },
                    }}
                  />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CaretakerDashboard;
