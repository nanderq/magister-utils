# Sent messages API observation

Observed on 2026-10-27 in the user's authenticated Helium session at
`https://isw.magister.net/magister-berichten/#/overzicht`.
The URLs below came from the browser's observed resource inventory after opening
the messages view and selecting **Verzonden items**. Credentials, message IDs,
recipients and message content are omitted.

| Action | Observed request URL |
| --- | --- |
| Load message folders | `/api/berichten/mappen/alle` |
| Load inbox | `/api/berichten/postvakin/berichten?top=17&skip=0` |
| Load next inbox page | `/api/berichten/postvakin/berichten?top=17&skip=17` |
| Select sent messages | `/api/berichten/verzondenitems/berichten?top=17&skip=0` |

The browser automation exposes resource URLs, not request/response headers or
response bodies. Separate authenticated API GET requests using the existing
local SDK session verified both inbox (`top=1&skip=0`) and sent messages
(`top=2&skip=0`) return HTTP 200. Both return an envelope with `items`, `links`,
and `totalCount`; the SDK returns just the `items` array, as for inbox messages.

Sent list items contain `id`, `onderwerp`, `mapId`, `ontvangers`,
`heeftPrioriteit`, `heeftBijlagen`, `isGelezen`, `verzondenOp`, and `links`.
They contain recipients instead of the inbox's `afzender`. Recipient objects
contain `id`, `weergavenaam`, `type`, `mailGroep`, and `links`.

The SDK provides `client.sentMessages({ skip, top })` with defaults `skip=0`
and `top=12`. Existing `message(id)`, `messageAttachments(id)` and
`messageWithAttachments(id)` methods also handle sent-message IDs.
The CLI provides `mcli sent-messages --limit 20 --skip 0` and `--raw`.
