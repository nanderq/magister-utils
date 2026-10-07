# Compose and send

Search with `mcli contacts --query "Recipient name"`. Match the returned identity to the intended recipient; ask for clarification if multiple matches remain plausible. Use the contact's numeric `id` with type `persoon`.

Build a local JSON file so multiline content and shell metacharacters retain their exact values. Required fields are `ontvangers`, `onderwerp`, and `inhoud`. The body may contain HTML. Optional CC, BCC, priority, send mode, and attachment fields use the SDK's Dutch names:

```json
{
  "ontvangers": [{ "id": 123, "type": "persoon" }],
  "kopieOntvangers": [],
  "blindeKopieOntvangers": [],
  "onderwerp": "Question about the assignment",
  "inhoud": "<p>Could you clarify the deadline?</p>",
  "heeftPrioriteit": false,
  "verzendOptie": "standaard",
  "bijlagen": []
}
```

Example IDs are placeholders; replace them with actual lookup results. Keep the default send mode unless a different SDK-supported value is known and requested. Optional fields may be omitted.

If a file is part of the authorized message, upload it:

```bash
mcli upload-file --file '/path/to/report.pdf' --content-type application/pdf
```

The result includes an attachment `id`. Put it in the message as `"bijlagen": [{"id": 456, "type": "upload"}]`. Upload alone stores a remote file; it does not send the message. The SDK has no upload rollback command.

For a draft request, stop with the local payload and a readable preview. For an authorized send, run:

```bash
mcli send-message --payload-file '/path/to/message.json'
```

`--payload-file -` reads JSON from stdin, which also supports piping a file without shell interpolation. The CLI validates recipient and attachment references, required strings, optional field types, and unknown top-level fields before calling the SDK.

Success returns `data.sent: true`; the SDK does not return a sent-message ID. If delivery becomes uncertain after a timeout or connection failure, report that uncertainty and verify through Magister before retrying; repeating the command could send a duplicate.
