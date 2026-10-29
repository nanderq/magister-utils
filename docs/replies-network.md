# Message replies API observation

Observed on 2026-10-29 in a HAR capture from `https://isw.magister.net` while
opening an inbox message and replying to it. Credentials, recipient details, and
message content are omitted.

| Action | Method | Request URL | Response |
| --- | --- | --- | --- |
| Open the message | `GET` | `/api/berichten/berichten/{id}` | message object |
| Mark it read | `PATCH` | `/api/berichten/berichten` | `204` |
| Load the signature | `GET` | `/api/berichten/handtekening` | `{handtekening, heeftStandaardOndertekening}` |
| Send the reply | `POST` | `/api/berichten/berichten` | `204`, empty body |

A reply has no endpoint of its own. The web client posts the normal send payload
with two extra values: `verzendOptie: "beantwoord"` instead of `"standaard"`, and
`gerelateerdBerichtId` set to the original message's id. The client builds the
subject as `RE: ` plus the original subject. It writes the HTML body as the answer,
an `<hr>`, and a quote block with **Van**, **Verzonden**, **Aan**, and
**Onderwerp** lines followed by the original body. The recipient is the original
sender. Its reference also carried `aanHuidigeSelectie: false` and
`persoonType: "leerling"`, which earlier sends without those fields did not need.

The reply arrived as a new message with its own id. In the capture, both the
original and the reply still had `beantwoordOp: null` right after sending.

The SDK supports replies through `client.sendMessage(payload)` with
`verzendOptie` and `gerelateerdBerichtId`. The CLI's `send-message` accepts the
same fields. Forwarding (`doorgestuurdOp`) was not captured.
