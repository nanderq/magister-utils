# Message drafts API observation

Observed on 2026-10-29 in a HAR capture from `https://isw.magister.net` while
saving a draft and opening the **Concepten** view. Credentials, recipient
details, and message content are omitted.

| Action | Method | Request URL | Response |
| --- | --- | --- | --- |
| Save a draft | `POST` | `/api/berichten/concepten` | `204`, `Location: /api/berichten/concepten/{id}` |
| Count drafts | `GET` | `/api/berichten/concepten/count` | `{"count": n}` |
| List drafts | `GET` | `/api/berichten/concepten?top=17&skip=0` | `{items, links, totalCount}` |
| Delete drafts | `DELETE` | `/api/berichten/concepten` | not captured |

The draft body is the same JSON the web client sends to `/api/berichten/berichten`
for a real message: `ontvangers`, `kopieOntvangers`, `blindeKopieOntvangers`,
`heeftPrioriteit`, `inhoud`, `onderwerp`, `verzendOptie`, and `bijlagen`.

Draft list items contain `id`, `onderwerp`, `ontvangers`, `kopieOntvangers`,
`heeftPrioriteit`, `heeftBijlagen`, `verzendOptie`, `laatsteWijzigingDatumTijd`,
and `links`. They have no `afzender` or `verzondenOp`. The `links.self` href points
to `/api/berichten/concepten/{id}`, but the capture did not include opening or updating a
single draft, so the SDK does not cover those requests yet.

Deletion came from a separate browser request copied as curl. It sends a JSON
array body such as `[{"conceptId":28829},{"conceptId":28828}]`, so one request
can delete several drafts. Its response was not included and the SDK accepts
any 2xx status.

Concepten does not appear in `/api/berichten/mappen/alle`; it has its own count
endpoint instead of `aantalOngelezen`.

The SDK provides `client.messageDrafts({ skip, top })` (defaults `skip=0`,
`top=12`), `client.messageDraftCount()`, and `client.createMessageDraft(payload)`,
which returns `{ id }` parsed from the `Location` header, and
`client.deleteMessageDrafts(ids)`. The CLI provides `mcli drafts`,
`mcli draft-count`, `mcli create-draft --payload-file`, and
`mcli delete-drafts --ids 1,2`.
Separate requests with the local SDK session verified `drafts` and `draft-count`
return HTTP 200.
