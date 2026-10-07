export type Account = {
    UuId: string;
    Persoon: {
      Id: number;
      Roepnaam: string;
      OfficieleVoornamen: string;
      Voorletters: string;
      Tussenvoegsel: string;
      Achternaam: string;
      OfficieleTussenvoegsels: string;
      OfficieleAchternaam: string;
      Geboortedatum: string;
      ExterneId: string;
      [key: string]: unknown;
    };
    Groep: {
      Privileges: string[];
      [key: string]: unknown;
    }[];
    Links: unknown[];
    [key: string]: unknown;
}

export type Tokens = {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresAt: number;
}

export type Session = Tokens & {
    baseUrl: string;
}

export interface GradeColumn {
  Id: number;
  KolomNaam: string;
  KolomNummer: string;
  KolomVolgNummer: string;
  KolomKop: string;
  KolomOmschrijving: string;
  KolomSoort: number;
  IsHerkansingKolom: boolean;
  IsDocentKolom: boolean;
  HeeftOnderliggendeKolommen: boolean;
  IsPTAKolom: boolean;
}

export interface GradeItem {
  CijferId: number;
  CijferStr: string;
  DatumIngevoerd: string;
  IsVoldoende: boolean;
  Vak: {
    Id: number;
    Afkorting: string;
    Omschrijving: string;
    Volgnr: number;
  };
  CijferPeriode: {
    Id: number;
    Naam: string;
    VolgNummer: number;
  };
  CijferKolom: GradeColumn;
  [key: string]: unknown;
}

type ApiLink = {
  href: string;
};

export type Enrollment = {
  id: number;
  studie: {
    id: number;
    code: string;
    links: {
      self: ApiLink;
    };
  };
  groep: {
    id: number;
    code: string;
    omschrijving: string;
    links: {
      self: ApiLink;
    };
  };
  lesperiode: {
    code: string;
    links: {
      self: ApiLink;
    };
  };
  profielen: {
    code: string;
    links: {
      self: ApiLink;
    };
  }[];
  persoonlijkeMentor: {
    voorletters: string;
    tussenvoegsel: string;
    achternaam: string;
    links: {
      self: ApiLink;
    };
  };
  begin: string;
  einde: string;
  isHoofdAanmelding: boolean;
  links: {
    self: ApiLink;
    vakken: ApiLink;
    perioden: ApiLink;
    cijfers: ApiLink;
    mentoren: ApiLink;
  };
};

export interface AssignmentItem {
  Id?: number;
  Titel?: string | null;
  InleverenVoor?: string | null;
  IngeleverdOp?: string | null;
  Afgesloten?: boolean;
  MagInleveren?: boolean;
  [key: string]: unknown;
}

export interface ScheduleItem {
  Id?: number;
  Status?: number;
  InfoType?: number;
  Start?: string;
  Einde?: string;
  Omschrijving?: string;
  Lokatie?: string | null;
  LesuurVan?: number;
  Inhoud?: string | null;
  Opmerking?: string | null;
  Aantekening?: string | null;
  [key: string]: unknown;
}

export interface AppointmentAttachmentLink {
  Rel?: string;
  rel?: string;
  Href?: string;
  href?: string;
}

export interface AppointmentAttachment {
  Id?: number;
  Naam?: string | null;
  ContentType?: string | null;
  Grootte?: number | null;
  Url?: string | null;
  Links?: AppointmentAttachmentLink[] | null;
  [key: string]: unknown;
}

export interface CreateAppointmentPayload {
  Start: string | Date;
  Einde: string | Date;
  Omschrijving: string;
  Inhoud?: string;
  Lokatie?: string;
  DuurtHeleDag?: boolean;
  Type?: number;
  InfoType?: number;
  Status?: number;
  WeergaveType?: number;
  Subtype?: number;
}

export interface CreatedAppointment {
  id: number;
}

export interface AppointmentDetail {
  Id?: number;
  Omschrijving?: string;
  Start?: string;
  Einde?: string;
  LesuurVan?: number;
  LesuurTotMet?: number;
  Lokatie?: string;
  Inhoud?: string | null;
  Opmerking?: string | null;
  Aantekening?: string | null;
  Docenten?: { Naam?: string }[] | null;
  Lokalen?: { Naam?: string }[] | null;
  Vakken?: { Naam?: string }[] | null;
  Bijlagen?: AppointmentAttachment[] | null;
  [key: string]: unknown;
}

export interface AssignmentLink {
  Rel?: string;
  rel?: string;
  Href?: string;
  href?: string;
  [key: string]: unknown;
}

/** One entry from assignment detail `VersieNavigatieItems`. `Omschrijving` is the version number as text. */
export interface VersieNavigatieItem {
  Id?: number;
  Omschrijving?: string | null;
  Links?: AssignmentLink[] | null;
  [key: string]: unknown;
}

export interface ParsedVersieNavigatieItem {
  id: number;
  omschrijving: string;
  selfHref?: string;
  prevHref?: string;
  nextHref?: string;
}

export interface AssignmentDetail extends AssignmentItem {
  Omschrijving?: string | null;
  Vak?: string | null;
  LaatsteOpdrachtVersienummer?: number | null;
  VersieNavigatieItems?: VersieNavigatieItem[] | null;
  Links?: AssignmentLink[] | null;
  Bijlagen?: AssignmentVersionAttachment[];
}

export interface AssignmentUploadSettings {
  MyDiskQuota?: number;
  MaxUploadFileSize?: number;
  BlacklistedExtensions?: string;
  SharedDiskQuota?: number;
  MySpaceUsed?: number;
  [key: string]: unknown;
}

export interface AssignmentVersionAttachment {
  Id?: number;
  Naam?: string;
  ContentType?: string;
  Status?: number;
  Datum?: string | null;
  Grootte?: number;
  Url?: string | null;
  UniqueId?: string;
  BronSoort?: number;
  /**
   * Teacher files use Rel `Contents`. Files the student turned in use Rel `Self`
   * with an `/opdrachten/bijlagen/Ingeleverd/{id}` href.
   */
  Links?: AssignmentLink[] | null;
  [key: string]: unknown;
}

export interface AssignmentVersion {
  Id?: number;
  Links?: unknown;
  Titel?: string | null;
  Vak?: string | null;
  Status?: number;
  OpdrachtId?: number;
  LeerlingOpmerking?: string | null;
  DocentOpmerking?: string | null;
  LeerlingBijlagen?: AssignmentVersionAttachment[];
  FeedbackBijlagen?: AssignmentVersionAttachment[] | null;
  GestartOp?: string | null;
  InleverenVoor?: string | null;
  IngeleverdOp?: string | null;
  Beoordeling?: string | null;
  BeoordeeldOp?: string | null;
  VersieNummer?: number;
  IsTeLaat?: boolean;
  [key: string]: unknown;
}

export interface StudyGuideItem {
  Id?: number;
  Van?: string;
  TotEnMet?: string;
  Titel?: string;
  InLeerlingArchief?: boolean;
  [key: string]: unknown;
}

export interface StudyGuidePart {
  Id?: number;
  Titel?: string;
  Omschrijving?: string;
  Volgnummer?: number;
  [key: string]: unknown;
}

export interface StudyGuideDetail extends StudyGuideItem {
  Onderdelen?: { Items?: StudyGuidePart[]; items?: StudyGuidePart[] };
}

export type StudyGuidePartDetail = Record<string, unknown>;

export interface StudyGuideFile {
  id: string;
  fileId?: number;
  name: string;
  href?: string;
  size?: number;
  contentType?: string;
}

export interface MessageSender {
  naam?: string;
  [key: string]: unknown;
}

export interface MessageRecipient {
  weergavenaam?: string;
  [key: string]: unknown;
}

export interface MessageItem {
  id?: number;
  onderwerp?: string;
  afzender?: MessageSender;
  heeftPrioriteit?: boolean;
  verzondenOp?: string;
  [key: string]: unknown;
}

export interface MessageDetail extends MessageItem {
  inhoud?: string;
  ontvangers?: MessageRecipient[];
  kopieOntvangers?: MessageRecipient[];
  heeftBijlagen?: boolean;
}

export interface MessageAttachment {
  id?: number;
  naam?: string;
  contentType?: string;
  grootte?: number;
  status?: string;
  links?: {
    download?: { href?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MessageWithAttachments {
  message: MessageDetail;
  attachments: MessageAttachment[];
}

export interface Contact {
  id: number;
  naam?: string;
  weergavenaam?: string;
  displayName?: string;
  volledigeNaam?: string;
  volledigeNaamMetVoorletters?: string;
  roepnaam?: string;
  voornaam?: string;
  tussenvoegsel?: string;
  achternaam?: string;
  [key: string]: unknown;
}

export interface UploadedAttachment {
  id: number;
  naam: string;
  [key: string]: unknown;
}

export interface MessageRecipientRef {
  id: number;
  type: "persoon";
}

export interface MessageAttachmentRef {
  id: number;
  type: "upload";
}

export interface SendMessagePayload {
  ontvangers: MessageRecipientRef[];
  kopieOntvangers?: MessageRecipientRef[];
  blindeKopieOntvangers?: MessageRecipientRef[];
  heeftPrioriteit?: boolean;
  inhoud: string;
  onderwerp: string;
  verzendOptie?: string;
  bijlagen?: MessageAttachmentRef[];
}
