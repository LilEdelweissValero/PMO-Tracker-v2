export interface ReferenceLink {
  label: string;
  url: string;
}

export interface ProjectCreate {
  name: string;
  priority?: string;
  scopeDescription?: string;
  references?: ReferenceLink[];
  initiatedBy?: string;
  requestedByName?: string;
  requestedByDept?: string;
  systemName?: string;
  specificModule?: string;
  systemOwnerName?: string;
  systemOwnerDept?: string;
  requestType?: string;
  pmOfficer?: string;
  remarks?: string;
}

export interface ProjectUpdate extends Partial<ProjectCreate> {
  signoffStatus?: string;
}

export interface WorkStreamCreate {
  projectId: number;
  name?: string;
  assignedDeveloper?: string;
  currentBall?: string;
}

export type WorkStreamUpdate = Partial<Omit<WorkStreamCreate, "projectId">>;

export interface FlowStageUpdate {
  name?: string;
  orderIdx?: number;
  plannedDate?: string | null;
  actualDate?: string | null;
  responsiblePerson?: string | null;
}

export interface ChangeLogCreate {
  workStreamId?: number;
  projectId?: number;
  entryType: "progress" | "bump" | "field_change";
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  changedBy?: string;
}

export interface DirectoryCreate {
  name: string;
  details?: string;
}

export interface ConfigValueCreate {
  category: string;
  value: string;
  sortOrder?: number;
}

export interface FlowStageWithDerived {
  id: number;
  workStreamId: number;
  name: string;
  orderIdx: number;
  plannedDate: Date | null;
  actualDate: Date | null;
  responsiblePerson: string | null;
  delayAdvanceDays: number | null;
}

export interface WorkStreamWithStages {
  id: number;
  projectId: number;
  name: string | null;
  assignedDeveloper: string | null;
  currentBall: string;
  archived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  flowStages: FlowStageWithDerived[];
  currentStage: FlowStageWithDerived | null;
}

export interface ProjectWithWorkStreams {
  id: number;
  name: string;
  priority: string | null;
  scopeDescription: string | null;
  references: ReferenceLink[];
  initiatedBy: string | null;
  requestedByName: string | null;
  requestedByDept: string | null;
  systemName: string | null;
  specificModule: string | null;
  systemOwnerName: string | null;
  systemOwnerDept: string | null;
  requestType: string | null;
  pmOfficer: string | null;
  remarks: string | null;
  signoffStatus: string;
  archived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  workStreams: WorkStreamWithStages[];
}

export interface LatestEntry {
  id: number;
  workStreamId: number | null;
  projectId: number | null;
  entryType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  changedBy: string | null;
  changedAt: Date;
  workStreamName: string | null;
  projectName: string;
  currentStage: string | null;
  currentBall: string | null;
}

export interface DashboardData {
  latestProgress: LatestEntry[];
  latestBumps: LatestEntry[];
}

export interface BallViewData {
  pmo: LatestEntry[];
  developers: LatestEntry[];
  systemOwner: LatestEntry[];
}

export interface ReportSnapshot {
  projects: ProjectWithWorkStreams[];
  asOfDate: string;
}
