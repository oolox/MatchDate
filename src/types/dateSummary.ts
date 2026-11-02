/** Shared dateSummary payload (chat tool `data` + character sheet storage). */

export interface DateSummaryCharacterEntry {
  /** Character document GUID. */
  id: string;
  /** ~50–100 words: how the date went from this character’s POV. */
  dateReview: string;
  /** How the date went (1 awful … 10 dream). 0 = missing. */
  dateScore: number;
  /** How well this date type matches their ideal (1 nightmare … 10 perfect). 0 = missing. */
  dateFit: number;
}

export interface DateSummaryData {
  /** Summary instance id. Optional from the model; stamped when missing. */
  id?: string;
  shortSummary: string;
  justification: string;
  /** ~10–20 words describing where the date took place. */
  location: string;
  character: DateSummaryCharacterEntry[];
  dateTime: string;
  chatId: string;
}
