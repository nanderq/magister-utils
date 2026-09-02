import { AuthManager } from "../auth/AuthManager";
import { TokenStore } from "../auth/token-store";
import { getAccount, getEnrollments } from "../resources/account";
import { getGrades } from "../resources/grades";
import { getAssignment, getAssignments } from "../resources/assignments";
import { getAppointment, getSchedule } from "../resources/schedule";
import {
    getMessage,
    getMessageAttachments,
    getMessages,
    getMessageWithAttachments,
    searchContacts,
    sendMessage,
    uploadFile,
} from "../resources/messages";
import type { GetMessagesOptions, SearchContactsOptions, UploadBody, UploadFileOptions } from "../resources/messages";
import { extractStudyGuideFiles, getStudyGuide, getStudyGuidePart, getStudyGuides } from "../resources/study-guides";
import type {
    Account,
    AppointmentDetail,
    AssignmentDetail,
    AssignmentItem,
    Enrollment,
    GradeItem,
    ScheduleItem,
    Contact,
    MessageAttachment,
    MessageDetail,
    MessageItem,
    MessageWithAttachments,
    SendMessagePayload,
    Session,
    StudyGuideDetail,
    StudyGuideFile,
    StudyGuideItem,
    StudyGuidePartDetail,
    UploadedAttachment,
} from "../types";
import { MagisterRequestError } from "../errors";

class MagisterClient {
    private readonly auth: AuthManager;

    constructor(
        tenant: string,
        username: string,
        password: string,
        tokenStore?: TokenStore,
    ) {
        this.auth = new AuthManager({ tenant, username, password, tokenStore });
    }

    async login(): Promise<Session> {
        /*
        Create a new session by logging in.
        */
        return this.auth.login();
    }

    async session(): Promise<Session> {
        /*
        Get the current session.
        */
        return this.auth.session();
    }

    async hasSession(): Promise<boolean> {
        /*
        Check if a session exists.
        */
        return this.auth.hasSession();
    }

    async ensureSession(): Promise<Session> {
        /*
        Ensure a session exists. If no session exists, login.
        */
        if (await this.auth.hasSession()) {
            return this.auth.session();
        }

        return this.auth.login();
    }

    async logout(): Promise<void> {
        /*
        Log out of the current session.
        */
        return this.auth.logout();
    }

    async account(): Promise<Account> {
        /*
        Get the account information for the current session.
        */
        return this.withSession((session) => getAccount(session.baseUrl, session.accessToken));
    }

    async enrollments(personId: number, options: {
        begin?: string;
        latest?: boolean;
    } = {}): Promise<Enrollment | Enrollment[]> {
        /*
        Get the enrollments for the current session.
        */
        return this.withSession((session) =>
            getEnrollments(session.baseUrl, session.accessToken, personId, options));
    }

    async grades(personId: number, options: {
        peildatum?: string | Date;
        actievePerioden?: boolean;
        alleenBerekendeKolommen?: boolean;
        alleenPTAKolommen?: boolean;
    } = {}): Promise<GradeItem[]> {
        /*
        Get the grades for the current session.
        */
        return this.withSession((session) =>
            getGrades(session.baseUrl, session.accessToken, personId, options));
    }

    async schedule(
        personId: number,
        from: string | Date,
        to: string | Date,
    ): Promise<ScheduleItem[]> {
        return this.withSession((session) =>
            getSchedule(session.baseUrl, session.accessToken, personId, from, to));
    }

    async appointment(personId: number, appointmentId: number): Promise<AppointmentDetail> {
        return this.withSession((session) =>
            getAppointment(session.baseUrl, session.accessToken, personId, appointmentId));
    }

    async assignments(
        personId: number,
        options: { skip?: number; top?: number } = {},
    ): Promise<AssignmentItem[]> {
        return this.withSession((session) =>
            getAssignments(session.baseUrl, session.accessToken, personId, options));
    }

    async assignment(personId: number, assignmentId: number): Promise<AssignmentDetail> {
        return this.withSession((session) =>
            getAssignment(session.baseUrl, session.accessToken, personId, assignmentId));
    }

    async messages(options: GetMessagesOptions = {}): Promise<MessageItem[]> {
        return this.withSession((session) => getMessages(session.baseUrl, session.accessToken, options));
    }

    async message(messageId: number): Promise<MessageDetail> {
        return this.withSession((session) => getMessage(session.baseUrl, session.accessToken, messageId));
    }

    async messageAttachments(messageId: number): Promise<MessageAttachment[]> {
        return this.withSession((session) =>
            getMessageAttachments(session.baseUrl, session.accessToken, messageId));
    }

    async messageWithAttachments(messageId: number): Promise<MessageWithAttachments> {
        return this.withSession((session) =>
            getMessageWithAttachments(session.baseUrl, session.accessToken, messageId));
    }

    async searchContacts(query: string, options: SearchContactsOptions = {}): Promise<Contact[]> {
        return this.withSession((session) =>
            searchContacts(session.baseUrl, session.accessToken, query, options));
    }

    async uploadFile(body: UploadBody, options: UploadFileOptions = {}): Promise<UploadedAttachment> {
        return this.withSession((session) =>
            uploadFile(session.baseUrl, session.accessToken, body, options));
    }

    async sendMessage(payload: SendMessagePayload): Promise<void> {
        return this.withSession((session) => sendMessage(session.baseUrl, session.accessToken, payload));
    }

    async studyGuides(personId: number, date: string | Date = new Date()): Promise<StudyGuideItem[]> {
        return this.withSession((session) =>
            getStudyGuides(session.baseUrl, session.accessToken, personId, date));
    }

    async studyGuide(personId: number, studyGuideId: number): Promise<StudyGuideDetail> {
        return this.withSession((session) =>
            getStudyGuide(session.baseUrl, session.accessToken, personId, studyGuideId));
    }

    async studyGuidePart(
        personId: number,
        studyGuideId: number,
        partId: number,
        useFolderStructure = true,
    ): Promise<StudyGuidePartDetail> {
        return this.withSession((session) => getStudyGuidePart(
            session.baseUrl,
            session.accessToken,
            personId,
            studyGuideId,
            partId,
            useFolderStructure,
        ));
    }

    async studyGuideFiles(
        personId: number,
        studyGuideId: number,
        partId: number,
        useFolderStructure = true,
    ): Promise<StudyGuideFile[]> {
        const part = await this.studyGuidePart(personId, studyGuideId, partId, useFolderStructure);
        return extractStudyGuideFiles(part);
    }

    private async withSession<T>(request: (session: Session) => Promise<T>): Promise<T> {
        try {
            return await request(await this.auth.session());
        } catch (error) {
            if (!(error instanceof MagisterRequestError) || error.status !== 401) throw error;
            return request(await this.auth.refresh());
        }
    }
}

export default MagisterClient;
