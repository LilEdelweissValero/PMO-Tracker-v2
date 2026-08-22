export interface ReferenceLink {
  label: string;
  url: string;
}

export interface SystemSelection {
  system: string;
  moduleEntryIds: number[];
}

export type FormValue = string | number | number[] | SystemSelection[];

export interface ProjectCreate {
  projectId: string;
  name: string;
  priority?: string;
  scopeDescription?: string;
  references?: ReferenceLink[];
  initiatedBy?: string;
  projectOwner?: string;
  systemName?: string;
  specificModule?: string;
  systemOwnerName?: string;
  systemOwnerDept?: string;
  requestType?: string;
  pmOfficer?: string;
  remarks?: string;
  systemEntryIds?: number[];
}

export interface ProjectUpdate extends Partial<ProjectCreate> {
  signoffStatus?: string;
}

export interface WorkStreamCreate {
  projectId: number;
  name?: string;
  assignedDeveloper?: string;
  currentBall?: string;
  task?: string;
}

export type WorkStreamUpdate = Partial<Omit<WorkStreamCreate, "projectId">>;

export interface FlowStageUpdate {
  name?: string;
  orderIdx?: number;
  plannedDate?: string | null;
  completionDate?: string | null;
  responsibleGroup?: string | null;
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
  bumpDate?: string;
}

export interface ChangeLogEntry {
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
  bumpDate: Date | null;
}

export interface SystemModuleEntry {
  id: number;
  system: string;
  acronym: string | null;
  color: string | null;
  link: string | null;
  module: string | null;
  developerAssigned: string | null;
  systemOwnerName: string | null;
  systemOwnerDept: string | null;
  archived: boolean;
  sortOrder: number;
}

export interface SystemAffected {
  id: number;
  system: string;
  acronym: string | null;
  color: string | null;
  link: string | null;
  module: string | null;
  developerAssigned: string | null;
  systemOwnerName: string | null;
  systemOwnerDept: string | null;
}

export interface DirectoryPersonnel {
  id: number;
  group: string;
  name: string;
  department: string | null;
  sortOrder: number;
  archived: boolean;
}

export interface ConfigValueCreate {
  category: string;
  value: string;
  acronym?: string;
  sortOrder?: number;
}

export interface FlowStageWithDerived {
  id: number;
  workStreamId: number;
  name: string;
  orderIdx: number;
  plannedDate: Date | null;
  completionDate: Date | null;
  responsibleGroup: string | null;
  responsiblePerson: string | null;
  delayAdvanceDays: number | null;
}

export interface WorkStreamWithStages {
  id: number;
  projectId: number;
  name: string | null;
  assignedDeveloper: string | null;
  currentBall: string;
  task: string | null;
  archived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  flowStages: FlowStageWithDerived[];
  currentStage: FlowStageWithDerived | null;
  latestBump?: ChangeLogEntry | null;
}

export interface ProjectWithWorkStreams {
  id: number;
  projectId: string;
  name: string;
  priority: string | null;
  scopeDescription: string | null;
  references: ReferenceLink[];
  initiatedBy: string | null;
  projectOwner: string | null;
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
  systems: SystemAffected[];
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
  bumpDate: Date | null;
  workStreamName: string | null;
  projectName: string;
  projectCode: string | null;
  currentStage: string | null;
  currentBall: string | null;
  ballHolder: string | null;
  ballPerson: string | null;
  durationMs: number | null;
  duration: string | null;
}

export interface DashboardData {
  latestProgress: LatestEntry[];
  latestBumps: LatestEntry[];
}

export interface BallViewData {
  [group: string]: LatestEntry[];
}

export interface ReportSnapshot {
  projects: ProjectWithWorkStreams[];
  asOfDate: string;
}
