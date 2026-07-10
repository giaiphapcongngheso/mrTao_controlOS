import type { ReportNoteTemplate } from '../../types/report-note-template.types';
import { createBaseService } from '../../shared/services/create-base-service';
import { RESOURCE_PATH } from '../../constants/resource-paths';
import { dataClient } from '../data-client';

export const reportNoteTemplateService = createBaseService<ReportNoteTemplate, Partial<ReportNoteTemplate>>({
  client: dataClient,
  resource: RESOURCE_PATH.REPORT_NOTE_TEMPLATES,
});
