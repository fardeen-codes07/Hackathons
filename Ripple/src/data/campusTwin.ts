import { buildings, rooms } from "@/data/campusData"
import type { CampusTwin } from "@/types"

const roomIdFor = (buildingId: string, index: number) => rooms.find((room) => room.buildingId === buildingId && room.id.endsWith(String(index).padStart(2, "0")))?.id ?? rooms.find((room) => room.buildingId === buildingId)?.id ?? `${buildingId}-room-01`

const ttClasses = [
  ["tt-101", "TT-101", "Systems foundations", 640, 1],
  ["tt-102", "TT-102", "Applied mathematics", 620, 2],
  ["tt-201", "TT-201", "Digital systems", 610, 3],
  ["tt-202", "TT-202", "Operations design", 600, 4],
  ["tt-301", "TT-301", "Decision methods", 590, 5],
  ["tt-302", "TT-302", "Infrastructure studio", 580, 6],
  ["tt-401", "TT-401", "Campus systems lab", 590, 7],
  ["tt-402", "TT-402", "Mobility and networks", 590, 8],
] as const

const scienceClasses = [
  ["sci-101", "SCI-101", "Materials science", 360, 1],
  ["sci-201", "SCI-201", "Environmental systems", 340, 2],
  ["sci-301", "SCI-301", "Research methods", 320, 3],
  ["sci-401", "SCI-401", "Applied laboratory", 300, 4],
] as const

const otherClasses = [
  ["lib-101", "LIB-101", "Information systems", "library", 420, 1],
  ["lib-201", "LIB-201", "Open learning seminar", "library", 380, 2],
  ["inno-101", "INNO-101", "Prototype practice", "innovation-hub", 360, 1],
  ["inno-201", "INNO-201", "Collaborative studio", "innovation-hub", 340, 2],
  ["nq-101", "NQ-101", "Community systems", "north-quad", 420, 1],
  ["nq-201", "NQ-201", "Urban operations", "north-quad", 380, 2],
] as const

const classes = [
  ...ttClasses.map(([id, courseCode, title, studentCount, roomIndex]) => ({
    id,
    courseCode,
    title,
    studentCount,
    facultyPopulationId: "faculty-tt",
    buildingId: "tt-block",
    roomId: roomIdFor("tt-block", roomIndex),
  })),
  ...scienceClasses.map(([id, courseCode, title, studentCount, roomIndex]) => ({
    id,
    courseCode,
    title,
    studentCount,
    facultyPopulationId: "faculty-science",
    buildingId: "science-court",
    roomId: roomIdFor("science-court", roomIndex),
  })),
  ...otherClasses.map(([id, courseCode, title, buildingId, studentCount, roomIndex]) => ({
    id,
    courseCode,
    title,
    studentCount,
    facultyPopulationId: buildingId === "library" ? "faculty-learning" : buildingId === "innovation-hub" ? "faculty-innovation" : "faculty-community",
    buildingId,
    roomId: roomIdFor(buildingId, roomIndex),
  })),
]

export const campusTwin: CampusTwin = {
  campus: {
    id: "ripple-campus",
    name: "RIPPLE synthetic campus",
    timezone: "Asia/Kolkata",
    buildingIds: buildings.map((building) => building.id),
    routeIds: ["shuttle-loop", "north-campus-route", "east-connect"],
    sourceIds: ["academic-scheduling", "room-occupancy", "student-mobility", "faculty-allocation", "transport", "facilities", "weather", "events"],
  },
  studentPopulations: [
    { id: "students-tt", label: "TT Block scheduled cohort", count: 4820, primaryBuildingIds: ["tt-block"] },
    { id: "students-science", label: "Science Court scheduled cohort", count: 4356, primaryBuildingIds: ["science-court"] },
    { id: "students-distributed", label: "Distributed campus cohort", count: 9244, primaryBuildingIds: ["library", "innovation-hub", "north-quad"] },
  ],
  facultyPopulations: [
    { id: "faculty-tt", label: "Teaching faculty / TT", count: 112, department: "Teaching and learning", primaryBuildingIds: ["tt-block"] },
    { id: "faculty-science", label: "Research faculty / Science", count: 76, department: "Science and research", primaryBuildingIds: ["science-court"] },
    { id: "faculty-learning", label: "Learning services", count: 68, department: "Learning commons", primaryBuildingIds: ["library"] },
    { id: "faculty-innovation", label: "Innovation faculty", count: 54, department: "Applied collaboration", primaryBuildingIds: ["innovation-hub"] },
    { id: "faculty-community", label: "Community faculty", count: 62, department: "Community systems", primaryBuildingIds: ["north-quad"] },
  ],
  classes,
  timetableAllocations: classes.map((courseClass, index) => ({
    id: `allocation-${courseClass.id}`,
    classId: courseClass.id,
    roomId: courseClass.roomId,
    startTime: index % 2 === 0 ? "10:00" : "11:00",
    endTime: index % 2 === 0 ? "11:00" : "12:00",
    status: "scheduled" as const,
  })),
  transportRoutes: [
    { id: "shuttle-loop", name: "Shuttle loop", zone: "Central / east corridor", capacity: 1000, baselineLoad: 64, connectedBuildingIds: ["tt-block", "library", "innovation-hub"] },
    { id: "north-campus-route", name: "North campus routes", zone: "North residential edge", capacity: 720, baselineLoad: 58, connectedBuildingIds: ["north-quad", "library"] },
    { id: "east-connect", name: "East connect", zone: "Research / collaboration corridor", capacity: 540, baselineLoad: 62, connectedBuildingIds: ["science-court", "innovation-hub"] },
  ],
  infrastructureAssets: [
    { id: "asset-core-network", name: "Core network spine", type: "network", status: "operational", connectedBuildingIds: buildings.map((building) => building.id) },
    { id: "asset-central-power", name: "Central power loop", type: "power", status: "operational", connectedBuildingIds: ["tt-block", "library", "innovation-hub"] },
    { id: "asset-water-loop", name: "South water loop", type: "water", status: "monitored", connectedBuildingIds: ["science-court", "north-quad"] },
    { id: "asset-access-control", name: "Access control network", type: "access", status: "standby", connectedBuildingIds: ["tt-block", "science-court"] },
  ],
  campusEvents: [
    { id: "event-midday-forum", name: "Midday forum", area: "Central quad", startTime: "12:00", endTime: "14:00", demandMultiplier: 1.12 },
    { id: "event-research-open-day", name: "Research open day", area: "Science Court", startTime: "15:00", endTime: "17:00", demandMultiplier: 1.08 },
  ],
  weatherConditions: [
    { id: "weather-clear", label: "Clear conditions", affectedArea: "All campus routes", severity: 12, routeIds: ["shuttle-loop", "north-campus-route", "east-connect"] },
    { id: "weather-heavy-rain", label: "Heavy rain", affectedArea: "North campus routes", severity: 55, routeIds: ["north-campus-route", "shuttle-loop"] },
  ],
  occupancySignals: [
    { id: "occupancy-tt", buildingId: "tt-block", observedUtilization: 82, capturedAt: "10:00 synthetic snapshot", quality: 90 },
    { id: "occupancy-science", buildingId: "science-court", observedUtilization: 81, capturedAt: "10:00 synthetic snapshot", quality: 88 },
    { id: "occupancy-library", buildingId: "library", observedUtilization: 83, capturedAt: "10:00 synthetic snapshot", quality: 91 },
  ],
  dependencies: [
    { id: "dependency-tt-classes", sourceType: "building", sourceId: "tt-block", targetType: "class", targetId: "tt-101", relationship: "hosts" },
    { id: "dependency-tt-shuttle", sourceType: "building", sourceId: "tt-block", targetType: "route", targetId: "shuttle-loop", relationship: "connects" },
    { id: "dependency-science-network", sourceType: "building", sourceId: "science-court", targetType: "asset", targetId: "asset-core-network", relationship: "depends-on" },
    { id: "dependency-library-route", sourceType: "route", sourceId: "north-campus-route", targetType: "building", targetId: "library", relationship: "serves" },
  ],
  dataSources: [
    { id: "academic-scheduling", name: "Academic scheduling", status: "prototype-connected", recordCount: 18420, freshness: "2 min ago", coverage: "Courses · timetable", quality: 92 },
    { id: "room-occupancy", name: "Room occupancy", status: "prototype-connected", recordCount: 342, freshness: "30 sec ago", coverage: "Rooms · capacity", quality: 90 },
    { id: "student-mobility", name: "Student mobility", status: "prototype-connected", recordCount: 9680, freshness: "1 min ago", coverage: "Zones · routes", quality: 82 },
    { id: "faculty-allocation", name: "Faculty allocation", status: "prototype-connected", recordCount: 112, freshness: "3 min ago", coverage: "Faculty · schedule", quality: 94 },
    { id: "transport", name: "Transport", status: "prototype-connected", recordCount: 64, freshness: "1 min ago", coverage: "Routes · capacity", quality: 86 },
    { id: "facilities", name: "Facilities", status: "connector-ready", recordCount: 128, freshness: "4 min ago", coverage: "Assets · dependencies", quality: 84 },
    { id: "weather", name: "Weather", status: "prototype-connected", recordCount: 12, freshness: "5 min ago", coverage: "Areas · routes", quality: 80 },
    { id: "events", name: "Campus events", status: "connector-ready", recordCount: 7, freshness: "Today", coverage: "Events · demand", quality: 78 },
  ],
}

export function getBuildingTwinSummary(buildingId: string) {
  const building = buildings.find((item) => item.id === buildingId)
  const classesInBuilding = campusTwin.classes.filter((courseClass) => courseClass.buildingId === buildingId)
  const studentsInBuilding = campusTwin.studentPopulations.filter((population) => population.primaryBuildingIds.includes(buildingId)).reduce((total, population) => total + population.count, 0)
  const facultyInBuilding = campusTwin.facultyPopulations.filter((population) => population.primaryBuildingIds.includes(buildingId)).reduce((total, population) => total + population.count, 0)
  const routes = campusTwin.transportRoutes.filter((route) => route.connectedBuildingIds.includes(buildingId))
  const assets = campusTwin.infrastructureAssets.filter((asset) => asset.connectedBuildingIds.includes(buildingId))

  return {
    classes: classesInBuilding.length,
    students: studentsInBuilding || building?.scheduledStudents || 0,
    faculty: facultyInBuilding || building?.facultyCount || 0,
    routes: routes.length,
    connectedSystems: ["Academic", "Room occupancy", ...(routes.length > 0 ? ["Mobility", "Transport"] : []), ...(assets.length > 0 ? ["Infrastructure"] : [])],
  }
}
