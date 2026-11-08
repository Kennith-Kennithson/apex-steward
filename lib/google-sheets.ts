
import { isAdminAuthenticated } from "@/lib/admin-session";
import "server-only";

import { google } from "googleapis";
import type { Incident } from "@/lib/incidents/types";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

const SERVICE_ACCOUNT_KEY_FILE =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;

type SheetTab =
  | "Incidents"
  | "Drivers"
  | "Sources"
  | "Change Log";

function getRequiredEnvironmentVariable(
  value: string | undefined,
  name: string
): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

async function getSheetsClient() {
  const keyFile = getRequiredEnvironmentVariable(
    SERVICE_ACCOUNT_KEY_FILE,
    "GOOGLE_SERVICE_ACCOUNT_KEY_FILE"
  );

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

async function readSheet(
  tabName: SheetTab
): Promise<Record<string, string>[]> {
  const spreadsheetId = getRequiredEnvironmentVariable(
    SPREADSHEET_ID,
    "GOOGLE_SHEETS_SPREADSHEET_ID"
  );

  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:AD`,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) =>
    String(header).trim()
  );

  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? "").trim();
    });

    return record;
  });
}

/**
 * Appends one row to an approved spreadsheet tab.
 * This function must only be called from trusted server-side code.
 */
export async function appendSheetRow(
  tabName: SheetTab,
  values: (string | number | boolean)[]
): Promise<void> {
  const spreadsheetId = getRequiredEnvironmentVariable(
    SPREADSHEET_ID,
    "GOOGLE_SHEETS_SPREADSHEET_ID"
  );

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:AD`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [values],
    },
  });
}


/**
 * Updates selected cells in an existing record, identified by its permanent ID.
 * Only trusted server-side code should call this function.
 */
export async function updateSheetRecord(
  tabName: SheetTab,
  keyColumn: string,
  keyValue: string,
  updates: Record<string, string | number | boolean>
): Promise<void> {
  const allowedKeys: Record<SheetTab, string> = {
    Incidents: "incident_id",
    Drivers: "driver_id",
    Sources: "source_id",
    "Change Log": "change_id",
  };

  if (allowedKeys[tabName] !== keyColumn) {
    throw new Error("Invalid spreadsheet record identifier.");
  }

  const spreadsheetId = getRequiredEnvironmentVariable(
    SPREADSHEET_ID,
    "GOOGLE_SHEETS_SPREADSHEET_ID"
  );

  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A:AD`,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    throw new Error("No records were found.");
  }

  const headers = rows[0].map((header) => String(header).trim());
  const keyIndex = headers.indexOf(keyColumn);

  if (keyIndex === -1) {
    throw new Error(`Missing identifier column: ${keyColumn}`);
  }

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      String(row[keyIndex] ?? "").trim() === keyValue
  );

  if (rowIndex === -1) {
    throw new Error("The record to update could not be found.");
  }

  const columnNumberToLetter = (columnNumber: number) => {
    let result = "";
    let number = columnNumber + 1;

    while (number > 0) {
      const remainder = (number - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      number = Math.floor((number - 1) / 26);
    }

    return result;
  };

  const sheetRow = rowIndex + 1;

  const data = Object.entries(updates).map(([field, value]) => {
    const columnIndex = headers.indexOf(field);

    if (columnIndex === -1) {
      throw new Error(`Unknown spreadsheet column: ${field}`);
    }

    if (field === keyColumn) {
      throw new Error("Record identifiers cannot be changed.");
    }

    const column = columnNumberToLetter(columnIndex);

    return {
      range: `${tabName}!${column}${sheetRow}`,
      values: [[value]],
    };
  });

  if (data.length === 0) {
    throw new Error("No changes were provided.");
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });
}


function requiredField(
  record: Record<string, string>,
  field: string
): string {
  const value = record[field]?.trim();

  if (!value) {
    throw new Error(`Missing required field: ${field}`);
  }

  return value;
}

function optionalField(
  record: Record<string, string>,
  field: string
): string | undefined {
  const value = record[field]?.trim();
  return value || undefined;
}

function parseBoolean(value: string | undefined): boolean {
  return value?.toUpperCase() === "TRUE";
}

function parseNumber(
  value: string | undefined
): number | undefined {
  if (!value) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIncident(
  row: Record<string, string>,
  drivers: Map<string, Record<string, string>>,
  sources: Map<string, Record<string, string>[]>
): Incident {
  const driverAId = requiredField(row, "driver_a_id");
  const driverBId = requiredField(row, "driver_b_id");

  const driverARow = drivers.get(driverAId);
  const driverBRow = drivers.get(driverBId);

  if (!driverARow || !driverBRow) {
    throw new Error(
      `Incident ${row.incident_id} references a missing driver.`
    );
  }

  const incidentId = requiredField(row, "incident_id");

  const incidentSources = (sources.get(incidentId) ?? []).map(
    (source) => ({
      title: requiredField(source, "source_title"),
      publisher: requiredField(source, "publisher"),
      url: requiredField(source, "source_url"),
      sourceType: requiredField(
        source,
        "source_type"
      ) as Incident["sources"][number]["sourceType"],
      accessedDate: requiredField(source, "accessed_date"),
    })
  );

  const videoUrl = optionalField(row, "video_url");
  const videoProvider = optionalField(row, "video_provider");

  const incident: Incident = {
    id: incidentId,
    series: requiredField(row, "series") as Incident["series"],
    season: Number(requiredField(row, "season")),
    event: requiredField(row, "event"),
    date: requiredField(row, "event_date"),
    category: requiredField(
      row,
      "category"
    ) as Incident["category"],
    difficulty: requiredField(
      row,
      "difficulty"
    ) as Incident["difficulty"],

    driverA: {
      name: requiredField(driverARow, "driver_name"),
      carNumber: optionalField(driverARow, "car_number"),
      team: optionalField(driverARow, "team"),
      carColor: optionalField(driverARow, "car_colour"),
    },

    driverB: {
      name: requiredField(driverBRow, "driver_name"),
      carNumber: optionalField(driverBRow, "car_number"),
      team: optionalField(driverBRow, "team"),
      carColor: optionalField(driverBRow, "car_colour"),
    },

    title: requiredField(row, "incident_title"),
    summary: optionalField(row, "summary"),
    circuit: optionalField(row, "circuit"),
    lapNumber: parseNumber(row.lap_number),
    corner: optionalField(row, "corner"),

    video:
      videoUrl && videoProvider
        ? {
            url: videoUrl,
            provider: videoProvider,
            permission: requiredField(
              row,
              "video_permission"
            ) as NonNullable<Incident["video"]>["permission"],
            permanentlyMuted: parseBoolean(row.video_permanently_muted),
          }
        : undefined,

    officialDecision: {
      responsibility: requiredField(
        row,
        "official_responsibility"
      ) as Incident["officialDecision"]["responsibility"],

      responsibilityIsScorable: parseBoolean(
        row.responsibility_scorable
      ),

      penalty: requiredField(
        row,
        "penalty_type"
      ) as Incident["officialDecision"]["penalty"],

      penaltyDetails: optionalField(row, "penalty_details"),
      explanation: requiredField(row, "official_explanation"),
    },

    sources: incidentSources,
    evidenceStatus: requiredField(
      row,
      "evidence_status"
    ) as Incident["evidenceStatus"],
  };

  if (
    !Number.isInteger(incident.season) ||
    incident.season <= 0
  ) {
    throw new Error(`Invalid season for incident ${incidentId}.`);
  }

  return incident;
}

/**
 * Returns published, verified incidents for server-side use.
 *
 * IMPORTANT:
 * This returns official decisions and answer keys.
 * Never send its results directly to a browser.
 */
export async function getPublishedIncidents(): Promise<Incident[]> {
  const [incidentRows, driverRows, sourceRows] =
    await Promise.all([
      readSheet("Incidents"),
      readSheet("Drivers"),
      readSheet("Sources"),
    ]);

  const drivers = new Map(
    driverRows.map((driver) => [
      requiredField(driver, "driver_id"),
      driver,
    ])
  );

  const sources = new Map<
    string,
    Record<string, string>[]
  >();

  sourceRows.forEach((source) => {
    const incidentId = requiredField(source, "incident_id");
    const existing = sources.get(incidentId) ?? [];

    existing.push(source);
    sources.set(incidentId, existing);
  });

  const publishedRows = incidentRows.filter(
    (row) =>
      row.publication_status?.toLowerCase() === "published" &&
      row.evidence_status?.toLowerCase() === "verified" &&
      ["official-embed", "licensed", "permission-granted"].includes(
        (row.video_permission ?? "").toLowerCase()
      ) &&
      Boolean(row.video_url?.trim()) &&
      Boolean(row.video_provider?.trim())
  );

  return publishedRows.map((row) =>
    parseIncident(row, drivers, sources)
  );
}

export interface IncidentOverview {
  total: number;
  published: number;
  drafts: number;
  underReview: number;
}

export async function getIncidentOverview(): Promise<IncidentOverview> {
  const incidentRows = await readSheet("Incidents");

  return {
    total: incidentRows.length,

    published: incidentRows.filter(
      (row) =>
        row.publication_status?.toLowerCase() === "published" &&
        row.evidence_status?.toLowerCase() === "verified"
    ).length,

    drafts: incidentRows.filter(
      (row) =>
        row.publication_status?.toLowerCase() === "draft" ||
        row.evidence_status?.toLowerCase() === "draft"
    ).length,

    underReview: incidentRows.filter(
      (row) =>
        row.evidence_status?.toLowerCase() === "under-review"
    ).length,
  };
}

export interface AdminIncidentSummary {
  id: string;
  title: string;
  series: string;
  season: string;
  event: string;
  evidenceStatus: string;
  publicationStatus: string;
}

export async function getAdminIncidentList(): Promise<AdminIncidentSummary[]> {
  const incidentRows = await readSheet("Incidents");

  return incidentRows.map((row) => ({
    id: row.incident_id ?? "",
    title: row.incident_title ?? "Untitled incident",
    series: row.series ?? "",
    season: row.season ?? "",
    event: row.event ?? "",
    evidenceStatus: row.evidence_status ?? "draft",
    publicationStatus: row.publication_status ?? "draft",
  }));
}
/**
 * Retrieves one complete incident for the private admin review page.
 * Includes the official decision, so authentication is mandatory.
 */
export type AdminIncidentDetail = Incident & {
  publicationStatus: string;
};

export async function getAdminIncidentById(
  incidentId: string
): Promise<AdminIncidentDetail | null> {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    throw new Error("Administrator authentication required.");
  }

  const [incidentRows, driverRows, sourceRows] =
    await Promise.all([
      readSheet("Incidents"),
      readSheet("Drivers"),
      readSheet("Sources"),
    ]);

  const row = incidentRows.find(
    (incident) => incident.incident_id === incidentId
  );

  if (!row) {
    return null;
  }

  const drivers = new Map(
    driverRows.map((driver) => [
      requiredField(driver, "driver_id"),
      driver,
    ])
  );

  const sources = new Map<
    string,
    Record<string, string>[]
  >();

  sourceRows.forEach((source) => {
    const id = requiredField(source, "incident_id");
    const existing = sources.get(id) ?? [];

    existing.push(source);
    sources.set(id, existing);
  });

 return {
  ...parseIncident(row, drivers, sources),
  publicationStatus: row.publication_status ?? "unpublished",
};
}


export type AdminIncidentEditData = AdminIncidentDetail & {
  driverAId: string;
  driverBId: string;
  sourceIds: string[];
};

export async function getAdminIncidentEditData(
  incidentId: string
): Promise<AdminIncidentEditData | null> {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    throw new Error("Administrator authentication required.");
  }

  const [incidentRows, driverRows, sourceRows] = await Promise.all([
    readSheet("Incidents"),
    readSheet("Drivers"),
    readSheet("Sources"),
  ]);

  const row = incidentRows.find(
    (incident) => incident.incident_id === incidentId
  );

  if (!row) return null;

  const driverAId = requiredField(row, "driver_a_id");
  const driverBId = requiredField(row, "driver_b_id");

  const drivers = new Map(
    driverRows.map((driver) => [
      requiredField(driver, "driver_id"),
      driver,
    ])
  );

  const incidentSources = sourceRows.filter(
    (source) => source.incident_id === incidentId
  );

  const sources = new Map<string, Record<string, string>[]>();

  incidentSources.forEach((source) => {
    const existing = sources.get(incidentId) ?? [];
    existing.push(source);
    sources.set(incidentId, existing);
  });

  return {
    ...parseIncident(row, drivers, sources),
    publicationStatus: row.publication_status ?? "unpublished",
    driverAId,
    driverBId,
    sourceIds: incidentSources.map((source) =>
      requiredField(source, "source_id")
    ),
  };
}


export async function updateAdminIncidentStatus(
  incidentId: string,
  statusType: "evidence" | "publication",
  newStatus: string
): Promise<void> {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    throw new Error("Administrator authentication required.");
  }

  const validStatuses =
    statusType === "evidence"
      ? ["draft", "under-review", "verified"]
      : ["unpublished", "published"];

  if (!validStatuses.includes(newStatus)) {
    throw new Error("Invalid incident status.");
  }

  const spreadsheetId = getRequiredEnvironmentVariable(
    SPREADSHEET_ID,
    "GOOGLE_SHEETS_SPREADSHEET_ID"
  );

  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Incidents!A:AD",
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    throw new Error("No incidents were found.");
  }

  const headers = rows[0].map((header) => String(header).trim());

  const idColumn = headers.indexOf("incident_id");
  const evidenceColumn = headers.indexOf("evidence_status");
  const publicationColumn = headers.indexOf("publication_status");

  if (idColumn === -1 || evidenceColumn === -1 || publicationColumn === -1) {
    throw new Error("The Incidents sheet is missing required columns.");
  }

  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && String(row[idColumn] ?? "").trim() === incidentId
  );

  if (rowIndex === -1) {
    throw new Error("Incident not found.");
  }

  const currentEvidenceStatus = String(
    rows[rowIndex][evidenceColumn] ?? "draft"
  ).trim();

  const currentPublicationStatus = String(
    rows[rowIndex][publicationColumn] ?? "unpublished"
  ).trim();

  const nextEvidenceStatus =
    statusType === "evidence" ? newStatus : currentEvidenceStatus;

  const nextPublicationStatus =
    statusType === "publication" ? newStatus : currentPublicationStatus;

  if (
    nextPublicationStatus === "published" &&
    nextEvidenceStatus !== "verified"
  ) {
    throw new Error("Verify the evidence before publishing this incident.");
  }

  const columnIndex =
    statusType === "evidence" ? evidenceColumn : publicationColumn;

  const columnLetter = String.fromCharCode(65 + columnIndex);
  const sheetRowNumber = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Incidents!${columnLetter}${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[newStatus]],
    },
  });

  const previousStatus =
    statusType === "evidence"
      ? currentEvidenceStatus
      : currentPublicationStatus;

  const now = new Date().toISOString();

  await appendSheetRow("Change Log", [
    `chg-${crypto.randomUUID()}`,
    incidentId,
    statusType === "evidence" ? "evidence-status-updated" : "publication-status-updated",
    "admin",
    now,
    previousStatus,
    newStatus,
    "Status changed through the private admin dashboard.",
  ]);
}

/**
 * Retrieves unpublished incidents for administrator-only quiz testing.
 * Official decisions and answer keys must remain server-side.
 */
export async function getAdminDraftQuizIncidents(): Promise<Incident[]> {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    throw new Error("Administrator authentication required.");
  }

  const [incidentRows, driverRows, sourceRows] =
    await Promise.all([
      readSheet("Incidents"),
      readSheet("Drivers"),
      readSheet("Sources"),
    ]);

  const drivers = new Map(
    driverRows.map((driver) => [
      requiredField(driver, "driver_id"),
      driver,
    ])
  );

  const sources = new Map<
    string,
    Record<string, string>[]
  >();

  sourceRows.forEach((source) => {
    const incidentId = requiredField(source, "incident_id");
    const existing = sources.get(incidentId) ?? [];

    existing.push(source);
    sources.set(incidentId, existing);
  });

  const unpublishedRows = incidentRows.filter(
    (row) =>
      row.publication_status?.toLowerCase() !== "published"
  );

  return unpublishedRows.map((row) =>
    parseIncident(row, drivers, sources)
  );
}