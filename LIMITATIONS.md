# Limitations and honesty note

## What is real

- The citizen app, officer dashboard, API and Postgres database all run and talk to each other.
- The full workflow is real: submit, analyse, link duplicates, score, assign, resolve, and show the update to the citizen.
- H3 indexing, hotspot detection and the priority formula run on live data.
- Sign-in sessions, role checks, input validation and rate limits are enforced by the API.

## What is synthetic or simulated

- **All demo reports are invented.** There are 46 synthetic reports, and the dashboard labels them. Their coordinates fall around Moodbidri, but none describes a real event, person, shop or institution.
- **Seeded street descriptions are generic.** Phrases such as "the school road" do not refer to specific real roads.
- **The teams are invented.** They do not represent the structure of Moodbidri Town Municipal Council.
- **There is no live link to any government system.** Awaaz has never been deployed with a municipality.
- **Staff entry is manual.** Calls, walk-ins and social posts reach Awaaz only if staff type or paste them. There is no phone, WhatsApp or social media integration.
- **Citizen status updates are polled.** The app refreshes every few seconds. There are no push notifications.

## Reduced modes

Awaaz keeps working when a service is missing, and says so on screen.

| Missing | What happens |
|---|---|
| AI provider | Keyword rules analyse reports. Results are labelled, and doubtful duplicates stay separate. |
| Mistral embeddings | A local word-hash comparison is used. It cannot match different languages. |
| Google Maps key | The dashboard shows a schematic map of real H3 cells, and citizens enter coordinates. |
| Google Places | The school and hospital factor shows "not checked" and adds no points. |

## Where the AI can be wrong

- **Severity.** The model can misjudge hazard or exposure from a short description. Officers should treat the score as a recommendation.
- **Safety keywords.** A keyword match forces the top hazard level. This protects against a model missing a live wire, but a report could contain those words without real danger, or describe real danger in other words.
- **False urgency.** Someone can overstate a problem. The prompt tells the model to ignore tone, but this reduces the risk without removing it.
- **Duplicate errors.** Two similar problems close together can merge, and two descriptions of one problem can stay apart. Officers can merge or separate issues manually.
- **Translation.** Kannada and other languages can lose meaning in translation, which affects category, severity and matching.
- **Voice.** Mistral's language documentation does not name Kannada or Tulu, so neither can be assumed to work. The transcript is always editable, and typing always works.
- **Photos.** The model comments on whether a photo matches the report. It cannot prove when or where a photo was taken.
- **Suspected causes.** Hotspot briefs offer hypotheses from nearby reports. Only an on-site check can confirm a shared cause.
- **Hotspots show where people report.** Areas with fewer smartphones, or less trust in reporting, will look calmer than they are. Report volume is not the same as need.

## Other known limits

- Duplicate thresholds were tuned on a small synthetic set, so they will not be right for real reports without further testing.
- H3 cells do not follow roads, so a problem along one street can span cells, and nearby problems on parallel streets can share one.
- The report worker handles one report at a time on one server instance. Running several instances could let simultaneous duplicates create two issues.
- Priority weights are my judgement, not a policy agreed with any municipality.
- Report photos are stored in Postgres. That suits a prototype, but production should use object storage.
- A session lasts 7 days and cannot be revoked individually before it expires.
- The town centre uses the PIN listing coordinates, because public sources disagree on them.

## What I would do next

1. Test with real, anonymised reports and officers, then recalibrate thresholds and weights.
2. Measure Kannada and Tulu voice accuracy with real speakers.
3. Add WhatsApp and phone intake, because many citizens will not install an app.
4. Add push notifications, and let citizens confirm whether a fix actually worked.
5. Add road-aware clustering and ward boundaries.
6. Add officer roles, audit reviews and session revocation before any real deployment.
