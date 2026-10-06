export type BuildingStatus = "operational" | "selected" | "affected" | "offline" | "warning" | "critical"

export type Severity = "normal" | "elevated" | "high" | "critical"

export type SimulationPhase = "idle" | "running" | "paused" | "complete"

export type ScenarioCategory = "INFRASTRUCTURE" | "WEATHER" | "OPERATIONS" | "CAPACITY" | "TRANSPORT"

export type ScenarioKind = "building-closure" | "transport-capacity" | "weather-event" | "campus-event" | "network-disruption" | "power-disruption" | "examination-surge"

export type AffectedSystem = "classes" | "rooms" | "students" | "faculty" | "transport"

export type Scenario = {
  buildingId: string
  condition: "close"
  durationHours: number
  startTime: string
  severity?: number
  affectedSystems?: AffectedSystem[]
  kind?: ScenarioKind
  category?: ScenarioCategory
  label?: string
  targetLabel?: string
  presetId?: string
}

export type CampusMetrics = {
  activeStudents: number
  roomUtilization: number
  facultyLoad: number
  transportLoad: number
  campusStability: number
  affectedStudents: number
  conflicts: number
  recoveryHours: number
  personHoursDisrupted: number
  estimatedOperationalCost: number
  transportImpact: number
  energyImpact: number
  carbonImpact: number
  roomPressure: Severity
  transportPressure: Severity
}

export type Room = {
  id: string
  buildingId: string
  name: string
  capacity: number
  scheduledStudents: number
}

export type BuildingFootprint = {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export type Building = {
  id: string
  code: string
  name: string
  zone: string
  status: BuildingStatus
  capacity: number
  scheduledStudents: number
  roomCount: number
  facultyCount: number
  footprint: BuildingFootprint
  accent: "blue" | "green" | "amber" | "neutral"
  description: string
}

export type SimulationEvent = {
  id: string
  minuteOffset: number
  timeLabel: string
  title: string
  description: string
  nodeId: string
  severity: Severity
}

export type CampusSnapshot = {
  simulationTimeMinutes: number
  label: string
  metrics: CampusMetrics
  buildings: Building[]
  activeNodeIndex: number
}

export type CampusState = {
  simulationTimeMinutes: number
  buildings: Building[]
  rooms: Room[]
  metrics: CampusMetrics
  selectedBuildingId: string | null
  scenario: Scenario
  phase: SimulationPhase
  activeSnapshotIndex: number
  snapshots: CampusSnapshot[]
  events: SimulationEvent[]
  scenarioHistory: ScenarioHistory[]
  decisionSession: DecisionSession
}

export type ScenarioPreset = {
  id: string
  name: string
  category: ScenarioCategory
  target: string
  durationHours: number
  severity: number
  affectedSystems: AffectedSystem[]
  description: string
  scenario: Scenario
}

export type ScenarioHistory = {
  id: string
  scenario: Scenario
  completedAt: string
  stabilityBefore: number
  stabilityAfter: number
  affectedStudents: number
  recommendedIntervention: string
}

export type SimulationResult = {
  baseline: CampusSnapshot
  snapshots: CampusSnapshot[]
  events: SimulationEvent[]
  scenario: Scenario
}

export type DecisionCandidate = {
  id: "do-nothing" | "dynamic-reallocation" | "temporary-rooms" | "hybrid-intervention"
  label: string
  description: string
  mechanism?: string
  affectedStudents: number
  conflicts: number
  recoveryHours: number
  stability: number
  roomUtilization: number
  transportLoad: number
  primaryBenefit: string
  primaryTradeoff: string
  operationalCost: number
  operationalComplexity: "Low" | "Moderate" | "High"
  benefits: string[]
  tradeoffs: string[]
}

export type DecisionScore = {
  score: number
  subscores: {
    stability: number
    capacity: number
    mobility: number
    recovery: number
    conflict: number
  }
}

export type DecisionBranchStatus = "unexplored" | "selected" | "running" | "complete"

export type DecisionBranchResult = {
  score: number
  subscores: DecisionScore["subscores"]
  affectedStudents: number
  conflicts: number
  recoveryHours: number
  stability: number
  roomUtilization: number
  transportLoad: number
  operationalCost: number
}

export type DecisionBranch = {
  id: string
  parentId: string
  candidateId: DecisionCandidate["id"]
  status: DecisionBranchStatus
  result?: DecisionBranchResult
}

export type DecisionSession = {
  branches: DecisionBranch[]
  activeBranchId: string | null
  selectedBranchIds: string[]
}

export type Campus = {
  id: string
  name: string
  timezone: string
  buildingIds: string[]
  routeIds: string[]
  sourceIds: string[]
}

export type StudentPopulation = {
  id: string
  label: string
  count: number
  primaryBuildingIds: string[]
}

export type FacultyPopulation = {
  id: string
  label: string
  count: number
  department: string
  primaryBuildingIds: string[]
}

export type CourseClass = {
  id: string
  courseCode: string
  title: string
  studentCount: number
  facultyPopulationId: string
  buildingId: string
  roomId: string
}

export type TimetableAllocation = {
  id: string
  classId: string
  roomId: string
  startTime: string
  endTime: string
  status: "scheduled" | "compatible" | "displaced"
}

export type TransportRoute = {
  id: string
  name: string
  zone: string
  capacity: number
  baselineLoad: number
  connectedBuildingIds: string[]
}

export type InfrastructureAsset = {
  id: string
  name: string
  type: "power" | "network" | "water" | "access"
  status: "operational" | "standby" | "monitored"
  connectedBuildingIds: string[]
}

export type CampusEvent = {
  id: string
  name: string
  area: string
  startTime: string
  endTime: string
  demandMultiplier: number
}

export type WeatherCondition = {
  id: string
  label: string
  affectedArea: string
  severity: number
  routeIds: string[]
}

export type OccupancySignal = {
  id: string
  buildingId: string
  observedUtilization: number
  capturedAt: string
  quality: number
}

export type OperationalDependency = {
  id: string
  sourceType: "building" | "room" | "class" | "route" | "asset"
  sourceId: string
  targetType: "building" | "room" | "class" | "route" | "asset"
  targetId: string
  relationship: "hosts" | "serves" | "depends-on" | "connects"
}

export type DataSourceMetadata = {
  id: string
  name: string
  status: "prototype-connected" | "connector-ready"
  recordCount: number
  freshness: string
  coverage: string
  quality: number
}

export type CampusTwin = {
  campus: Campus
  studentPopulations: StudentPopulation[]
  facultyPopulations: FacultyPopulation[]
  classes: CourseClass[]
  timetableAllocations: TimetableAllocation[]
  transportRoutes: TransportRoute[]
  infrastructureAssets: InfrastructureAsset[]
  campusEvents: CampusEvent[]
  weatherConditions: WeatherCondition[]
  occupancySignals: OccupancySignal[]
  dependencies: OperationalDependency[]
  dataSources: DataSourceMetadata[]
}

export type PredictionDirection = "up" | "down" | "stable"

export type PredictionSignalMetric = "room-pressure" | "student-movement" | "faculty-conflict" | "transport-load" | "campus-stability"

export type PredictiveSignal = {
  metric: PredictionSignalMetric
  label: string
  baseline: number
  projected: number
  delta: number
  unit: "percent" | "students" | "conflicts"
  direction: PredictionDirection
  severity: Severity
  confidence: number
  contributors: string[]
  horizon: string
}

export type PredictiveModelSource = "local-neural-network" | "deterministic-fallback"

export type NeuralInferenceOutput = {
  projectedRoomUtilization: number
  projectedTransportLoad: number
  projectedStudentMovement: number
  projectedFacultyConflicts: number
  projectedStability: number
  projectedRecoveryHours: number
}

export type NeuralInference = {
  source: PredictiveModelSource
  modelLabel: string
  output: NeuralInferenceOutput
  confidence: number
  confidenceBasis: string
  latencyMs: number
  fallbackReason?: string
}

export type PredictiveResult = {
  signals: PredictiveSignal[]
  neuralSignals: PredictiveSignal[]
  confidence: number
  primaryUncertainty: string
  projectedMetrics: Pick<CampusMetrics, "roomUtilization" | "affectedStudents" | "conflicts" | "transportLoad" | "campusStability">
  inferenceProjectedMetrics: Pick<CampusMetrics, "roomUtilization" | "affectedStudents" | "conflicts" | "transportLoad" | "campusStability">
  inference: NeuralInference
}
