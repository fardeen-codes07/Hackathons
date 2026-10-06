import type { Building, CampusMetrics, Room } from "@/types"

const roomNames = ["Studio", "Lecture", "Seminar", "Lab", "Workshop", "Forum"]

function createRooms(buildingId: string, count: number, totalCapacity: number, scheduledStudents: number): Room[] {
  const baseCapacity = Math.floor(totalCapacity / count)
  const remainingCapacity = totalCapacity - baseCapacity * count
  const baseScheduled = Math.floor(scheduledStudents / count)
  const remainingScheduled = scheduledStudents - baseScheduled * count

  return Array.from({ length: count }, (_, index) => ({
    id: `${buildingId}-room-${String(index + 1).padStart(2, "0")}`,
    buildingId,
    name: `${roomNames[index % roomNames.length]} ${String(index + 1).padStart(2, "0")}`,
    capacity: baseCapacity + (index < remainingCapacity ? 1 : 0),
    scheduledStudents: baseScheduled + (index < remainingScheduled ? 1 : 0),
  }))
}

export const buildings: Building[] = [
  {
    id: "tt-block",
    code: "TT",
    name: "TT Block",
    zone: "Central academic zone",
    status: "operational",
    capacity: 5900,
    scheduledStudents: 4820,
    roomCount: 68,
    facultyCount: 112,
    footprint: { x: 148, y: 116, width: 188, height: 108, rotation: -3 },
    accent: "blue",
    description: "High-density teaching block with the largest concentration of scheduled classes.",
  },
  {
    id: "library",
    code: "LIB",
    name: "Learning Commons",
    zone: "North knowledge zone",
    status: "operational",
    capacity: 5200,
    scheduledStudents: 4300,
    roomCount: 44,
    facultyCount: 68,
    footprint: { x: 482, y: 72, width: 174, height: 116, rotation: 2 },
    accent: "green",
    description: "Flexible learning space with spare capacity for controlled reallocation.",
  },
  {
    id: "innovation-hub",
    code: "INNO",
    name: "Innovation Hub",
    zone: "East collaboration zone",
    status: "operational",
    capacity: 4700,
    scheduledStudents: 3850,
    roomCount: 36,
    facultyCount: 54,
    footprint: { x: 526, y: 272, width: 202, height: 108, rotation: -2 },
    accent: "amber",
    description: "Project rooms and studios that absorb some displaced activity.",
  },
  {
    id: "north-quad",
    code: "NQ",
    name: "North Quad",
    zone: "North residential edge",
    status: "operational",
    capacity: 5600,
    scheduledStudents: 4650,
    roomCount: 46,
    facultyCount: 62,
    footprint: { x: 120, y: 294, width: 196, height: 112, rotation: 3 },
    accent: "neutral",
    description: "Distributed classrooms with lower baseline pressure and longer walking routes.",
  },
  {
    id: "science-court",
    code: "SCI",
    name: "Science Court",
    zone: "South research zone",
    status: "operational",
    capacity: 5400,
    scheduledStudents: 4356,
    roomCount: 42,
    facultyCount: 76,
    footprint: { x: 352, y: 330, width: 154, height: 92, rotation: -1 },
    accent: "neutral",
    description: "Specialist rooms that are available only for compatible classes.",
  },
]

export const rooms: Room[] = buildings.flatMap((building) =>
  createRooms(building.id, building.roomCount, building.capacity, building.scheduledStudents),
)

export const baselineMetrics: CampusMetrics = {
  activeStudents: 18420,
  roomUtilization: 82,
  facultyLoad: 68,
  transportLoad: 64,
  campusStability: 87,
  affectedStudents: 0,
  conflicts: 0,
  recoveryHours: 0,
  personHoursDisrupted: 0,
  estimatedOperationalCost: 0,
  transportImpact: 0,
  energyImpact: 0,
  carbonImpact: 0,
  roomPressure: "normal",
  transportPressure: "normal",
}

export const campusBaseline = {
  metrics: baselineMetrics,
  buildings,
  rooms,
  totalStudents: 18420,
}
