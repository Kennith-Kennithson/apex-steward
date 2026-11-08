/**
 * One-time Google Sheets migration.
 *
 * All incidents now use the same 25-point scoring system, so the old
 * per-incident responsibility_scorable checkbox is no longer an admin choice.
 * This keeps the legacy column for compatibility, sets every incident to TRUE,
 * and hides the column so it cannot be mistaken for a separate setting.
 */
function hideLegacyResponsibilityScoringFlag() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("Incidents");

  if (!sheet) {
    throw new Error('The "Incidents" sheet was not found.');
  }

  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error('The "Incidents" sheet has no columns.');
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0];

  const normalize = (value) =>
    String(value).toLowerCase().replace(/[^a-z0-9]/g, "");

  const flagIndex = headers.findIndex((header) => {
    const name = normalize(header);
    return name === "responsibilityscorable" ||
      name === "responsibilityfindingissuitableforscoring";
  });

  if (flagIndex === -1) {
    Logger.log("No legacy responsibility-scoring checkbox column was found. No changes made.");
    return;
  }

  const columnNumber = flagIndex + 1;
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, columnNumber, lastRow - 1, 1).setValue(true);
  }

  sheet.hideColumns(columnNumber);
  Logger.log("All incidents are marked as scorable and the legacy checkbox column is hidden.");
}
