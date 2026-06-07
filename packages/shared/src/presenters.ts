import type {
  AssignmentDetail,
  AssignmentItem,
  GradeItem,
  MessageAttachment,
  MessageDetail,
  MessageItem,
  ScheduleItem,
  StudyGuideDetail,
  StudyGuideItem,
} from "./magister.ts";
import { htmlToText } from "./magister.ts";

export function presentScheduleItem(item: ScheduleItem) {
  return {
    id: item.Id ?? null,
    start: item.Start ?? null,
    end: item.Einde ?? null,
    lessonHour: item.LesuurVan ?? null,
    description: item.Omschrijving ?? null,
    location: item.Lokatie ?? null,
    content: htmlToText(item.Inhoud) || null,
    remark: htmlToText(item.Opmerking) || null,
    status: item.Status ?? null,
  };
}

export function presentGrade(item: GradeItem) {
  return {
    gradeId: item.CijferId ?? null,
    grade: item.CijferStr ?? null,
    date: item.DatumIngevoerd ?? null,
    passing: item.IsVoldoende ?? null,
    subject: item.Vak ? {
      id: item.Vak.Id ?? null,
      abbreviation: item.Vak.Afkorting ?? null,
      name: item.Vak.Omschrijving ?? null,
    } : null,
    period: item.CijferPeriode ? {
      id: item.CijferPeriode.Id ?? null,
      name: item.CijferPeriode.Naam ?? null,
    } : null,
    column: item.CijferKolom ? {
      id: item.CijferKolom.Id ?? null,
      name: item.CijferKolom.KolomNaam ?? null,
      description: item.CijferKolom.KolomOmschrijving ?? null,
    } : null,
  };
}

export function presentMessage(item: MessageItem) {
  return {
    id: item.id ?? null,
    subject: item.onderwerp ?? null,
    sender: item.afzender?.naam ?? null,
    sentAt: item.verzondenOp ?? null,
    hasPriority: item.heeftPrioriteit ?? false,
  };
}

export function presentMessageDetail(item: MessageDetail, attachments: MessageAttachment[] = []) {
  return {
    ...presentMessage(item),
    body: htmlToText(item.inhoud) || null,
    recipients: (item.ontvangers ?? []).map((recipient) => recipient.weergavenaam ?? null).filter(Boolean),
    hasAttachments: item.heeftBijlagen ?? false,
    attachments: attachments.map((attachment) => ({
      id: attachment.id ?? null,
      name: attachment.naam ?? null,
      contentType: attachment.contentType ?? null,
      sizeBytes: attachment.grootte ?? null,
      downloadUrl: attachment.links?.download?.href ?? null,
    })),
  };
}

export function presentAssignment(item: AssignmentItem) {
  return {
    id: item.Id ?? null,
    title: item.Titel ?? null,
    deadline: item.InleverenVoor ?? null,
    submittedAt: item.IngeleverdOp ?? null,
    closed: item.Afgesloten ?? false,
    canSubmit: item.MagInleveren ?? false,
  };
}

export function presentAssignmentDetail(item: AssignmentDetail) {
  return {
    ...presentAssignment(item),
    description: htmlToText(item.Omschrijving) || null,
    attachments: (item.Bijlagen ?? []).map((attachment) => ({
      id: attachment.Id ?? null,
      name: attachment.Naam ?? null,
      contentType: attachment.ContentType ?? null,
      sizeBytes: attachment.Grootte ?? null,
    })),
  };
}

export function presentStudyGuide(item: StudyGuideItem) {
  return {
    id: item.Id ?? null,
    title: item.Titel ?? null,
    from: item.Van ?? null,
    to: item.TotEnMet ?? null,
    archived: item.InLeerlingArchief ?? false,
  };
}

export function presentStudyGuideDetail(item: StudyGuideDetail) {
  const parts = item.Onderdelen?.Items ?? item.Onderdelen?.items ?? [];
  return {
    id: item.Id ?? null,
    title: item.Titel ?? null,
    from: item.Van ?? null,
    to: item.TotEnMet ?? null,
    parts: parts.map((part) => ({
      id: part.Id ?? null,
      title: part.Titel ?? null,
      description: htmlToText(part.Omschrijving) || null,
      order: part.Volgnummer ?? null,
    })),
  };
}
