import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Image, Camera, Clock, Trash } from "lucide-react";
import { format } from "date-fns";

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  time?: string;
  taken: number;
}

interface MedicationTrackerProps {
  date: string;
  isTaken: boolean;
  onMarkTaken: (date: string, updatedIds: number[], imageFile?: File) => void;
  isToday: boolean;
  medications: Medication[];
}

const MedicationTracker = ({
  date,
  isTaken,
  onMarkTaken,
  isToday,
  medications,
}: MedicationTrackerProps) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSelection = (id: number) => {
    if (!isToday) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const markSelectedAsTaken = async () => {
    const token = localStorage.getItem("token");
    if (!token || selectedIds.length === 0) return;

    for (const id of selectedIds) {
      await fetch(`http://localhost:5000/medications/${id}/taken`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const updatedIds = [...selectedIds];
    setSelectedIds([]);
    onMarkTaken(date, updatedIds, selectedImage || undefined);
  };

  const deleteMedication = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    await fetch(`http://localhost:5000/medications/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    onMarkTaken(date, []);
  };

  return (
    <div className="space-y-6">
      {medications.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center">
          No medications for this date.
        </p>
      ) : (
        <div className="space-y-4">
          {medications.map((med, index) => {
            const isSelected = selectedIds.includes(med.id);
            const isTaken = !!med.taken;
            const formattedTime = med.time
              ? format(new Date(`1970-01-01T${med.time}`), "hh:mm a")
              : "N/A";

            return (
              <Card
                key={med.id}
                onClick={() => !isTaken && toggleSelection(med.id)}
                className={`group flex items-center justify-between cursor-pointer transition-all px-4 py-3 border-2
                  ${
                    isTaken
                      ? "bg-green-50 border-green-500 hover:shadow-green-200"
                      : isSelected
                      ? "border-blue-400 bg-blue-50 shadow hover:shadow-blue-200"
                      : "border-gray-300 hover:shadow-md"
                  }`}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-black font-semibold">{med.name}</h4>
                    <p className="text-sm text-gray-600">
                      Dosage ({med.dosage}) · Frequency ({med.frequency})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Badge
                    variant="secondary"
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs whitespace-nowrap
                      ${
                        isTaken
                          ? "bg-green-600 text-white"
                          : isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="whitespace-nowrap">{formattedTime}</span>
                  </Badge>

                  {!isTaken && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden group-hover:inline-flex p-0 h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMedication(med.id);
                      }}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Optional Image Upload */}
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="p-6">
          <div className="text-center">
            <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Add Proof Photo (Optional)</h3>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mb-4"
            >
              <Camera className="w-4 h-4 mr-2" />
              {selectedImage ? "Change Photo" : "Take Photo"}
            </Button>
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Medication proof"
                  className="max-w-full h-32 object-cover rounded-lg mx-auto border-2 border-border"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedImage?.name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Button */}
      <Button
        onClick={markSelectedAsTaken}
        className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 text-white"
        disabled={!isToday || selectedIds.length === 0}
      >
        <Check className="w-5 h-5 mr-2" />
        {isToday ? "Mark Selected as Taken" : "Only today's meds can be marked"}
      </Button>

      {!isToday && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          You can only mark today's medication as taken
        </p>
      )}
    </div>
  );
};

export default MedicationTracker;
