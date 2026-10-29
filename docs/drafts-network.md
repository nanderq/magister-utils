# Message drafts API observation

Observed on 2026-10-29 in two HAR captures from `https://isw.magister.net` while
saving a draft, opening the **Concepten** view, and opening and editing a draft. Credentials, recipient
details, and message content are omitted.

| Action | Method | Request URL | Response |
| --- | --- | --- | --- |
| Save a draft | `POST` | `/api/berichten/concepten` | `204`, `Location: /api/berichten/concepten/{id}` |
| Count drafts | `GET` | `/api/berichten/concepten/count` | `{"count": n}` |
| List drafts | `GET` | `/api/berichten/concepten?top=17&skip=0` | `{items, links, totalCount}` |
| Open a draft | `GET` | `/api/berichten/concepten/{id}` | draft object |
| Save an edit | `PUT` | `/api/berichten/concepten/{id}` | `204`, empty body |
| Delete drafts | `DELETE` | `/api/berichten/concepten` | not captured |

The draft body is the same JSON the web client sends to `/api/berichten/berichten`
for a real message: `ontvangers`, `kopieOntvangers`, `blindeKopieOntvangers`,
`heeftPrioriteit`, `inhoud`, `onderwerp`, `verzendOptie`, and `bijlagen`.

Draft list items contain `id`, `onderwerp`, `ontvangers`, `kopieOntvangers`,
`heeftPrioriteit`, `heeftBijlagen`, `verzendOptie`, `laatsteWijzigingDatumTijd`,
and `links`. They have no `afzender` or `verzondenOp`. The `links.self` href points
to `/api/berichten/concepten/{id}`.

The single-draft response adds `inhoud`, `blindeKopieOntvangers`, and
`gerelateerdBerichtId` to the list fields. The web client saves an edit by sending
the complete payload, in the same shape as creating a draft, with `PUT`. It is a
full replacement, not a patch. The captured draft had no attachments, so how
draft attachments are listed or downloaded is still unknown.

Deletion came from a separate browser request copied as curl. It sends a JSON
array body such as `[{"conceptId":28829},{"conceptId":28828}]`, so one request
can delete several drafts. Its response was not included and the SDK accepts
any 2xx status.

Concepten does not appear in `/api/berichten/mappen/alle`; it has its own count
endpoint instead of `aantalOngelezen`.

The SDK provides `client.messageDrafts({ skip, top })` (defaults `skip=0`,
`top=12`), `client.messageDraftCount()`, and `client.createMessageDraft(payload)`,
which returns `{ id }` parsed from the `Location` header, and
`client.messageDraft(id)`, `client.updateMessageDraft(id, payload)`, and
`client.deleteMessageDrafts(ids)`. The CLI provides `mcli drafts`, `mcli draft <id>`,
`mcli draft-count`, `mcli create-draft --payload-file`,
`mcli update-draft <id> --payload-file`, and `mcli delete-drafts --ids 1,2`.
Separate requests with the local SDK session verified `drafts`, `draft <id>`, and
`draft-count` return HTTP 200.
