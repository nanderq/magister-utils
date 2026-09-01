export type Account = {
    UuId?: string;
    Persoon?: {
      Id?: number;
      Roepnaam?: string;
      OfficieleVoornamen?: string;
      Voorletters?: string;
      Tussenvoegsel?: string;
      Achternaam?: string;
      OfficieleTussenvoegsels?: string;
      OfficieleAchternaam?: string;
      Geboortedatum?: string;
      ExterneId?: string;
      [key: string]: unknown;
    };
    Groep?: {
      Privileges?: string[];
      [key: string]: unknown;
    }[];
    Links?: unknown[];
    [key: string]: unknown;
}

export type Tokens = {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresAt: number;
}