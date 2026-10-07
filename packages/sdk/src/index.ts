export { default as MagisterClient } from "./client/MagisterClient";
export type {
    Account,
    AppointmentAttachment,
    AppointmentAttachmentLink,
    AppointmentDetail,
    CreateAppointmentPayload,
    CreatedAppointment,
    AssignmentDetail,
    AssignmentItem,
    AssignmentLink,
    AssignmentUploadSettings,
    AssignmentVersion,
    AssignmentVersionAttachment,
    ParsedVersieNavigatieItem,
    VersieNavigatieItem,
    Contact,
    Enrollment,
    GradeColumn,
    GradeItem,
    ScheduleItem,
    MessageAttachment,
    MessageAttachmentRef,
    MessageDetail,
    MessageItem,
    MessageRecipient,
    MessageRecipientRef,
    MessageSender,
    MessageWithAttachments,
    SendMessagePayload,
    Session,
    StudyGuideDetail,
    StudyGuideFile,
    StudyGuideItem,
    StudyGuidePart,
    StudyGuidePartDetail,
    Tokens,
    UploadedAttachment,
} from "./types";
export type {
    AssignmentSubmissionFile,
    CreateAssignmentVersionInput,
    GetAssignmentVersionOptions,
    SubmitAssignmentInput,
} from "./resources/assignments";
export {
    buildAssignmentVersionDraft,
    listSubmittedAssignmentFiles,
    parseVersieNavigatieItems,
    resolveAssignmentAttachmentDownloadUrl,
    resolveAssignmentContentsDownloadUrl,
    resolveAssignmentIngeleverdDownloadUrl,
} from "./resources/assignments";
export type {
    GetMessagesOptions,
    SearchContactsOptions,
    UploadBody,
    UploadFileOptions,
} from "./resources/messages";

export { TokenStore } from "./auth/token-store";
export { MagisterRequestError } from "./errors";
