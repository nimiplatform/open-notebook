# Open Notebook on Nimi

This adaptation keeps the upstream Next.js research interface, FastAPI services,
SurrealDB notebooks, LangGraph research and chat, transformations, sources and
podcast profiles. Nimi Desktop supervises the Electron Host. The Host uses the
public SDK/Kit for authorization, model configuration, text, embeddings and speech.

## Local Android companion — 2026-11-14

The Android candidate packages the original ten research client pages, dashboard
providers and full source/note/chat/podcast interface. An App-owned navigation
boundary supplies local history, dynamic notebook/source IDs and modal query
parameters; Native and Web continue to use Next navigation. The mobile build
rejects Next server imports. The two existing streaming consumers already use
the public Notebook transport, so Android does not need a Next server, a second
business backend or a mobile AI execution owner. Android uses system font fallbacks.

The official Kit `createMobileNimiAppSession` owns login and connection. Each
Runtime scope gets a new same-origin workspace document and one captured public
client; old documents cannot bind a replacement client. JSON Integration envelopes
remain valid across the document boundary. The frozen
`io.github.nimiplatform.open-notebook.workspace.v1` contract and all **88** operations
are unchanged. SurrealDB, extraction, research, task state and original media
remain with the existing PC Host and worker.

Only identity-lived UI state is retained on Android: the same target's route and
source-wizard choices plus explicitly selected files. Returning from the system
picker does not send a file. **Continue with selected files** restores the file to
the corresponding original source form; the user still reviews its notebook,
transformation and embedding choices and uses the original create action. This
does not restore or replay an uncertain workflow. Signing out clears these drafts.
Saved source files and podcast audio use Android's real Storage Access Framework
Save operation. Its App-owned sink checks ordered chunks, exact byte counts,
MIME essence and destination close before reporting success; cancel/failure keeps
the PC original. The original 100 MiB upload boundary remains.

The complete `integration-20261114-android-http-rc.4` cohort is retained under
`.nimi/local/packages/`. Only Kit's override moved to **0.24.0-rc.4**; SDK
**0.24.0-rc.2**, Windows native **0.24.0-rc.1** and App Tools **0.16.0-rc.2** keep
their frozen bytes. Declarations retain the supported caret matrix. Existing
uncommitted Web, locale and governance changes were preserved.

Build with `NIMI_DEV_REALM=local pnpm run sync:android`, then run
`android/gradlew.bat :app:testDebugUnitTest assembleDebug --offline --no-daemon`
with JDK 21 and the configured local SDK. `pnpm run dev:mobile` is the explicit
device launch command. The debug candidate is
`.nimi/local/android-candidates/open-notebook-1.14.7-integration-kit-rc4-save-name-20261115-045700-debug.apk`,
**14,489,883 bytes**, SHA-256
`c6f50b3b1afa253c553372a8e1f017d6ecce37985fab1444b69772ebea52b27b`.
The earlier 22:23, 02:04 styles, 02:15 File-realm, fully exercised 02:28 UI and
04:21 layout candidates remain archived.
Its checked signer is
`756e56a08527a94e830921233bc80f31121fd0fe57dccef1535e27e9eb0a6585`.
This is a local candidate, not a release or installed/Catalog result.

This candidate corrects the successful Save notice after SAF renames a file or
adds a collision suffix. The existing saved source actually ended in `(1)`, but
the old notice still used the proposed name. After closing and verifying the
destination write, the plugin now reads `DISPLAY_NAME` from the returned URI and
passes the optional actual name to the identity notice. If metadata is unavailable,
all fourteen locales show a success notice without a filename. Suggested names
are never used as the saved destination name. Three focused result/transfer
regressions plus 27 locale assertions, TypeScript, mobile/Capacitor build and Java
tests/Android assembly passed. The new candidate was installed over the original
App and formally signed in with the existing 88 grants. The original NOTE-6152
source Save produced Android's collision name
`open-notebook-android-20261115.txt (2)`; the identity notice displayed that exact
actual name. The **324-byte** saved copy matched the earlier source byte for
byte. The new scope restored the same notebook route, source modal, full original
answer and citations, without AI or a new source submission. Evidence:
`.nimi/local/ui-audit/2026-11-15-android/10-save-actual-suffixed-name.png` and
`source-saved-suffixed.txt`. The prior business and layout acceptance below
remains applicable to unchanged behavior.

Source: client `io.github.nimiplatform.open-notebook.android.dev`, package
`ai.nimi.apps.opennotebook.dev`, origin `ai.nimi.apps.opennotebook.dev:/`, callback
`ai.nimi.apps.opennotebook.dev:/oauth/callback`. It requests runtime.consume and
integration.consume with the original four AI capability references. Its own
Registry admission and Home source/88-operation grants are required. Only the
debug manifest admits the local callback and loopback cleartext coordination;
the native bridge requires main-frame-only messaging. Android min API 31,
compile API 37 and target API 36 follow this local cohort. Public App Links and
Android distribution are not configured.

Engineering passed: App Tools check, frozen offline installation, Host build and
six real HTTP/stream/ownership regressions, TypeScript, lint (the same five existing
hook warnings), 68 related frontend assertions including fourteen-locale parity,
original markdown/navigation/download consumers and source-form restoration,
three Java MIME/integer boundary tests, Next Web build, mobile build and Android
assembly. The locale reference test now scans `src` rather than racing generated
Next output. No model call was repeated for these checks.

The original 2026-10-28 registration was refreshed from Desktop's list as
`dev-project-IuafbmbTz7x1jWqankWNWYtU` and resumed at 6012 / CDP 58484. Its real
native renderer read back the original Windows notebook and both existing Web
acceptance notebooks and sources. No registration or database was replaced.
The subsequent real Android results and their remaining limits are recorded below.

The first actual Android launch of the 22:23 candidate completed official Halliday
Continue/return and Home's exact source confirmation. Before workspace grants,
the permission page exposed a build/UI issue: the original primary button had a
transparent background because Tailwind's mobile entry did not scan all original
frontend components. The same permission instruction also appeared twice. The
current candidate explicitly includes this App's `frontend/src` in mobile CSS
scanning and shows the instruction once. Typecheck, mobile/Capacitor build and
Android assembly passed; the new artifact contains the missing original utility
styles. The device recheck showed the original green primary action and complete
notebook controls. The initial screenshot is
`.nimi/local/ui-audit/2026-11-15-android/01-workspace-permission-guidance.png`.

### Real Android slice — 2026-11-15

Official Halliday login, the exact Android source confirmation and the existing
`iap_9279f888ded856252cd262439b5cb1c7` v1 target's **88** grants passed through Home.
The original Web grants and historical target were retained. Updates used
`install -r` and the normal Android launcher, without clearing data. The phone
read all three existing notebooks and opened the original Windows notebook's
source and saved library/Amber Room answer. No existing notebook content was
edited or regenerated.

A separate **Android 研究验收 NOTE-6152** notebook was created as
`notebook:gn1bxm8dndxvwwhb3bic`. Its original Add Source wizard opened the system
picker for the **324-byte** synthetic `open-notebook-android-20261115.txt`.
Returning ended the old Runtime view but preserved the same target notebook,
**Android 原文 NOTE-6152** title and the selected File. No source was submitted
automatically. Explicit Continue restored it to the original form, with only
the new notebook selected. All transformations and embedding were disabled
before the original Done action.

The first creation attempt returned an explicit HTTP 400, `File upload or
file_path is required for upload type`; the new notebook still had zero sources.
The identity-owned File retained its parent-document prototype even inside the
child DataTransfer, so the original source API's `instanceof File` guard omitted
it. The fix rewraps the same Blob bytes as a File in the receiving document,
preserving name, MIME and lastModified. The API guard, upload limit and v1 schema
were not widened. A regression using two real JavaScript File realms failed
before the fix and then verified the original multipart API receives unchanged
binary bytes and metadata. Eight affected file/form/transport tests, typecheck,
scoped lint and the mobile/Gradle builds passed.

The same picker/explicit-Continue/Done journey was then repeated only in that
empty new notebook. It produced one source, `source:ly0p5dy8lgrga2d23f3e`, with
the original Mira Chen / East Room / Tuesday / twelve lamps / nine working /
three replacements text. Source Details confirmed it was not embedded. Its
Download action opened the real Android Save screen; Downloads retained the
input and created `open-notebook-android-20261115.txt (1)`. The saved copy is
**324 bytes**, byte-identical to the input, SHA-256
`fd144835f13623fccb9f036d8c92539b52e579bd9f277a6ccc58b64148e1f418`.
The identity shell reported Saved, and the new scope restored the same notebook
and source modal.

The PC App's own Models page was read to confirm the existing on-device
**Gemma 4 26B Q4 text-only v2** selection. One explicit Android notebook question
used that single short source (the UI reported 115 context tokens / 432 chars).
The completed answer identified Mira Chen, East Room, Tuesday, twelve total,
nine working and three replacements. It correctly stated that the West Room was
not inspected and no budget was provided. Eight visible citation controls pointed
to the actual source; opening one showed the same original text and source ID.
No cloud resource or additional summary/embedding generation was introduced.

Formal Disconnect removed the workspace iframe while the PC Host and Runtime
stayed running. The first explicit Connect succeeded and restored the same
notebook route, source and complete question/answer without resubmission. A final
UI-only improvement adds the Send message accessible name in all fourteen locales
and uses the original question placeholder without the desktop keyboard hint on
Android. Thirty-eight locale/chat checks, typecheck and mobile/Gradle builds
passed. The final 02:28 candidate was installed and formally logged in again;
the same source and full answer read back, the accessible Send control was present
once, and the mobile placeholder was correct. No model or upload was repeated for
that label-only recheck.

Review of `08-final-ui-result.png` then confirmed a narrow typography issue:
the description inherited `InlineEdit`'s `break-all`, splitting ordinary English
words. The current layout candidate overrides only the notebook-description
consumer to normal word boundaries with `overflow-wrap:anywhere`; other
InlineEdit consumers are unchanged. Android's internal Navigation row also omits
its repeated Open Notebook brand, while retaining Navigation and the actual
notebook title. Archive/Delete, metadata, business behavior and citations are
unchanged. Typecheck, mobile/Next Web builds and Gradle assembly passed. The 04:21
candidate then passed its foreground-device recheck through install-r, the system
launcher and official Halliday Continue, reusing the existing grants. The same
four notebooks and complete NOTE-6152 answer/citation read back. Computed style
was `word-break: normal` and `overflow-wrap: anywhere`; the real screenshot showed
ordinary words intact, only Navigation in the inner row, and the original notebook
title/actions/metadata retained. See `09-layout-word-wrap.png` in the Android
evidence directory. The 02:28 business evidence above remains valid for its scope;
no upload or model request was repeated for this layout-only check.

Screenshots and the real `source-saved.txt` are under
`.nimi/local/ui-audit/2026-11-15-android/`, including the original permission view,
restored styles, processing choices, actual file save, cited answer, original
citation and reconnected/final UI. This is the existing local Android emulator
with loopback coordination, not a physical-device/network claim. **NOT-VERIFIED:**
podcast synthesis, playback or audio export in this cohort, other import formats,
maximum-size transfers, in-flight cancellation/background recovery, long-idle
reconnection, different accounts/PCs/networks and exhaustive accessibility. The
original PC workflows and formats remain available; engineering checks are not
substituted for those unrun paths. No commit, push or publication was performed.

## Current Web development — 2026-11-14

The current branch adds the full Next.js product as a Web client of the existing
PC workspace. It consumes complete frozen SDK **0.24.0-rc.2**, Kit **0.24.0-rc.4** /
native **0.24.0-rc.1**, App Tools **0.16.0-rc.2**, Coding **0.7.0**, and Electron **45**.
The four package overrides and lockfile retain `.nimi/local/packages/integration-20261113-rc.2/`
with Kit selected from the complete rc.4 cohort above;
these local packages are required for this development checkout. This is not a
new App release or Catalog acceptance. The real Web results below used the prior
Kit rc.1 cohort; the Android upgrade does not imply those journeys were repeated.

Resume the existing native registration using `pnpm exec nimi-app dev --list-registrations`
and `pnpm dev -- --resume <current-selector> --cdp-port 58484`. Keep that App open.
For the local Realm source, run `pnpm dev:web -- --realm local` and open the declared
`https://127.0.0.1:4487/`. Set only the existing trusted TLS certificate/key paths
as `NIMI_WEB_TLS_CERT` and `NIMI_WEB_TLS_KEY` in ignored `.env.local`.
The HTTPS server reuses App Tools' origin guard and bounded identity/SDP proxy;
Next runs privately on 6087 with a separate `.next-web` output. It does not proxy
Notebook APIs or copy official cookies.

The Web source needs Registry admission, official Runtime-client login, Home source
confirmation, and permission to the **Open Notebook on this PC** Integration.
Its declared access is `runtime.consume` and `integration.consume`; the native App
also provides `integration.provide`. Research, extraction, model steps, background
commands, SurrealDB, uploads and podcast assembly retain their existing PC owner.
The provider exposes fixed named Notebook operations, with no arbitrary URL,
HTTP-header, Runtime-method, account or workspace selector. Uploads and response
streams use 128 KiB chunks, including long UTF-8 text/JSON, and verified `consumerRef`
ownership. Closing a response is an explicit App operation; background command and
podcast workflows retain their own controls. No business operation is automatically
replayed. Temporary transfers expire after 15 idle minutes and are removed at Host
session shutdown. The existing 100 MiB upload bound also bounds Web transfer files.

The Web **Models** page points to the PC App's model settings. It does not confuse
Web AIConfig with the PC configuration that actually executes the research. Podcast
voices are a fixed, input-free Notebook business query against that PC selection.
A browser document binds one Runtime scope; replacement scopes reload the document.
The current public Web factory ends its in-memory identity on pagehide, so a full
reload returns to official sign-in; this is not silent session restoration.
Business navigation is not persisted across Web documents; theme and layout choices
remain browser preferences. Persisted notebooks and media remain in the original
PC account workspace.

Current verification: App Tools check, Electron build, frontend typecheck, frontend
lint (zero errors; five existing hook warnings), six Host/transport regressions,
573 backend tests and 144 frontend tests pass. The declared local Web Next build
(`pnpm build:web --realm local`) also passes.
The real Desktop-supervised renderer restored the original **Windows dev CDP 验收**
notebook and **Windows验收·雨后书城资料** source. Captured native UI remains at its
normal window size. Source/local Nimi is `42d686cbf` with Home `0.2.5-rc.11`.
Real Web acceptance completed official Halliday login, initial Home source
confirmation and a direct connection showing **My PC**. Home granted the final
88-operation `io.github.nimiplatform.open-notebook.workspace.v1` target. The Web UI
read the original Windows notebook/source, created and renamed a dedicated
`Web 传输验收 · 霜叶6142 · 已读回` notebook, and uploaded a 504,197-byte synthetic
UTF-8 text file with both summary and embedding disabled. Downloading through the
source's real **Download** action produced the exact original bytes (SHA-256
`9e12fbfb651d4d1f9bbbacd8b598e0e20c9ae4ca70d1823d4e8c3024768acc8c`).
The transfer notebook is `notebook:pmgbh210ytj1sohocwzo`; its file source is
`source:ji6rz9rrb8moribs5wpo`.

A separate `Web 研究验收 · 霜叶6142` notebook (`notebook:t46lgzh7ricpmkng1ljf`)
used only a short synthetic source (the UI reported 107 context tokens / 191 chars).
The PC's configured **Gemma 4 26B Q4 text-only v2** returned FROST-6142, 林舟,
seven observations per workday, MISSING/no-zero/no-fabrication, and budget not
provided. Every item had a source citation; clicking it opened the actual
`source:eqiezr3nafcp45d4jg84` and the original text. The large transfer file was
not sent to the model. A full browser reload required official sign-in again;
source and Integration permissions were reused, and the original and new
notebooks, renamed title, sources and completed cited conversation were restored.

The real login exposed and fixed root redirects dropping callback parameters
and React development effect replay disposing a live session; focused regressions
protect both. An earlier development provider under the unversioned Integration
ID was refused with `INTEGRATION_PROVIDER_CONTRACT_CHANGED` after its schema
changed. It remains historical and is not a compatibility alias. No original App
registration, account or database was replaced. Provider failures now surface in
the native App with the owner error reason instead of being hidden in stderr.

UI review: desktop research, import, source download and re-entry work. The
390 px screenshot revealed the original 256 px desktop sidebar squeezing the
notebook into vertical text. The current code uses an accessible mobile navigation
drawer, wraps notebook title/actions and retains every navigation and create action.
Types and existing sidebar tests pass, and the unchanged native window renders
correctly. The final 390 px Web check passed: notebook text and the composer stay
readable, the original source/note/chat tabs remain, and the navigation drawer
opens every retained section. Selecting Models opened the PC-owner explanation
and closed the drawer. The viewport was reset afterward. This is a browser-width
check, not Android or a complete keyboard/accessibility audit. Screenshots are
under `.nimi/local/web-acceptance/`; `06-web-cited-research.jpg` shows the real answer
and `09-web-narrow-after.jpg` / `10-web-mobile-navigation.jpg` show the repair.

**NOT-VERIFIED at the Web checkpoint:** Android (the later bounded device slice is
recorded above), cross-device, different-account switch, current-cohort podcast
synthesis/transcription and audio playback/export,
production Web hosting and new installed/Catalog journeys. These do not erase the
older versioned media/install results below. The current real AI run covers text
research only; engineering tests do not certify unrun product paths.

## Windows candidate 1.14.7 — 2026-10-13

On October 14 the user approved the existing dual-platform stable candidate;
Registry [PR #97](https://github.com/nimiplatform/nimi-app-registry/pull/97)
passed finalization and merged. Installed Nimi 0.2.4 downloaded the complete
1,430,936,566-byte Windows package through Catalog, verified and installed it,
and launched its release-directory Host. Two earlier attempts were refused
before download with the generic installation-unavailable message; re-entering
the current Catalog entry succeeded, but the earlier refusal's cause remains
unconfirmed. The Imported instance was retained separately.

In the new Catalog workspace, `Catalog 安装验收 Q58` accepted a real synthetic
text source and produced its summary. A real cited research answer correctly
returned ST-Q58-7429, 贺澜, 13-minute collection, seven observations per workday,
the MISSING/no-zero/no-fabrication rule and the absent budget. Normal close and
Home relaunch restored the notebook, source, summary and cited conversation.
The notebook is `notebook:mdszo1xm574h7npsob10`. This passes fresh Windows
Catalog download/install and research/storage acceptance, not a Catalog
N-to-N+1 update; no older Catalog instance existed here. The prior Imported
update and media/export evidence below retain their separate scopes.

Installed 1.14.6 on Nimi 0.2.3 exposed a separate Electron renderer startup
failure: omitting `SystemRoot` from the utility process environment prevented
Windows socket initialization. Version 1.14.7 forwards that OS variable without
inheriting Host credentials. A real Electron utility-process regression covers
loopback serving, environment isolation, shutdown and early child exit. Startup
failure now displays an error and terminates the Host instead of leaving a
windowless running App.
Production App Tools check and the full test command pass: one real Electron
process regression, 573 backend tests and 138 frontend tests.

Home on the installed Nimi 0.2.3 fixed service updated the existing Imported
source from 1.14.6 to local production 1.14.7 and opened its actual research UI.
The new `Windows 安装验收 · 蓝鸟743` notebook accepted a synthetic Chinese text
source, generated a Dense Summary with MiMo v2.6 Flash, indexed it using the
current Dashscope text-embedding-v4 configuration, and produced a cited Chinese
answer. Saving that answer created an AI note. The answer retained the project
lead, six observations, missing-value rule and unspecified budget/deadline.
The generated summary expanded the source's ban on zero-filling to a ban on all
interpolation, and the answer repeated it; this is model interpretation beyond
the original source, not a verified research fact.

For strict structured podcast planning, the App was explicitly configured to
use Qwen 3.8 Flash; synthesis uses Qwen3 TTS Flash with the actual Nimi-listed
Cherry voice. A three-segment Chinese episode used the original source's full
content, excluding the generated note. The installed App produced a 217,388-byte
MP3 (54.29 seconds, 24 kHz mono), played it past 20 seconds and saved it through
the Windows native dialog to `.nimi/local/installed-bluebird743.mp3`. The FFmpeg
executable in that exact installed payload decoded the whole file successfully.
Re-importing that exact MP3 through the native file chooser completed real
transcription with qwen-audio-3.0-asr-flash-streaming. The source detail shows the
Chinese transcript with six observations and the missing-value rule. It renders
林岚 as 林兰 and Runtime Bridge as “rent me bridge”; the actual recognition output
is retained. The generated narration also repeats the broader interpolation ban,
so this successful media path does not certify factual precision. After normal
close and relaunch of the same Imported source through Home, both sources, the
saved note, cited conversation and completed 54-second podcast remained. The
new renderer loaded the preserved audio again.

The immutable [1.14.7 release](https://github.com/nimiplatform/open-notebook/releases/tag/v1.14.7)
completed both platform workflows. [Registry candidate #97](https://github.com/nimiplatform/nimi-app-registry/pull/97)
passed package/license/digest/provenance preparation and its transition check.
Human admission and Windows Catalog installation subsequently passed as recorded
above. The earlier Windows media results use the local production package,
not the new Catalog workspace.

Uses published SDK 0.21.0, Kit/native 0.19.3, App Tools 0.12.2 and Nimi Coding 0.6.5. Earlier Windows development checks established the Python numerical-DLL startup repair, isolated frozen Python/SurrealDB initialization, text source processing, Dense Summary, embeddings and cited Chinese chat against Nimi 0.2.2. Earlier macOS evidence keeps its stated versions.

## Ownership

- Open Notebook owns sources, notebook membership, search and prompt composition,
  podcast planning, speaker profiles, media decoding and durable business data.
- Nimi owns its account session, App Access, model/provider credentials, AIConfig,
  inference and the Runtime-issued embedding space.
- The Python worker has private UTF-8 pipes for four fixed business callbacks. It
  receives no Nimi credentials or Runtime endpoint. Its HTTP listener is loopback
  only, protected by a per-process App secret added outside renderer JavaScript.
- A random workspace reference in Nimi managed storage selects the App's durable
  database and media directory. The Electron profile remains Desktop-owned.
- The current development branch provides the fixed Notebook business Integration described above; prior released versions had no public Integration operations.

## Development

Use a matching running Nimi with developer mode enabled. Candidate 1.14.7 uses
the released npm SDK 0.21.0, Kit/native 0.19.3, App Tools 0.12.2 and Nimi Coding
0.6.5. The root frozen pnpm lock records public registry integrity; local Nimi
tarball and source-workspace overrides are removed.

```sh
pnpm install --frozen-lockfile
uv sync --locked --group dev
pnpm run setup:backend
pnpm run check
pnpm dev
```

Use `pnpm exec nimi-app dev --list-registrations` and its current explicit resume
selector to return to the same development workspace. A new registration is a new
storage audience. The Host starts and stops SurrealDB and the Python API/worker.
Model selection is in **Models** and uses the shared Kit AIConfig UI. Functional
acceptance uses `pnpm dev` and the exact loopback CDP target printed by its
Desktop supervisor. Keep the native window size. Do not open Next directly as
an authorization test or rebuild/import the App for each iteration.

API keys and the upstream standalone password flow are retired. Notebook content
and audio remain on disk when the App closes. Session invalidation stops old work;
interrupted background commands require an explicit retry. Native packaging and
installed-App acceptance are separate from supervised development.

## Earlier local-package verification

The resumed run installed 1.14.0 and exposed a frozen-backend startup failure.
The repaired 1.14.1 package was then applied through the existing Imported
source's **Update from local file** action. Its installed window now creates
Chinese notebooks, imports PDFs, generates real summaries and embeddings,
answers in Chinese with source citations, and saves files through the native
save dialog. Installed podcast generation, playback, native MP3 saving and
re-import through Nimi transcription also passed. After quitting and reopening
through Desktop, the same notebook still contains its source and saved note.
The 1.14.0 archive is retained only
as the failed checkpoint; use 1.14.1 for this local installation cohort.

The macOS development adaptation has exercised all four AI capabilities through
the protected SDK/Kit carrier. Verification below was performed on 2026-09-27
(Asia/Shanghai), using synthetic research content in the notebook
**Nimi 适配验收 · 海风研究**. The original MIT license is unchanged. The upstream
baseline is `3127f14ea9dbb519f0e4ddc64a0742ca644ba6ef`, version 1.14.0, from
`https://github.com/nimiplatform/open-notebook`.

### Product journeys

| Journey | Observed result |
| --- | --- |
| Protected launch and authorization | Desktop-supervised Electron starts the original research interface and its managed Python/SurrealDB processes. The generated reference App completed authorization, configuration save/reload and a real text call on the SDK 0.19 / Kit 0.16 cohort. That successful-path baseline was reused after the final connector-error mapping package refresh. |
| Text source and transformation | Imported the Chinese fictional research source, generated a real summary and retained it as a source insight. |
| Embeddings and Ask | Indexed the source through Nimi, then completed the three-stage research flow with source citations. The answer retained the rules for six observations and missing data. |
| Notebook chat and notes | Asked about the project lead and sampling plan, saved the cited model answer as a note, and verified the saved content. |
| PDF and source chat | Uploaded a real PDF, checked its extracted text in the App, and obtained a Chinese answer with citations to that PDF. |
| Web source | Imported `https://example.com` and verified the extracted content. URL/document extraction remains App-owned. |
| Single-speaker podcast | Generated three outline segments and nine Chinese dialogue entries through Nimi text, synthesized them through Nimi speech Jobs, and assembled a 264,812-byte MP3. FFmpeg decoded the entire file; the App player loaded it and advanced playback without a media error. Duration: 66.08 seconds. |
| Two-speaker podcast and language | An English PDF and English briefing produced Chinese dialogue using the profile's `zh-CN` setting. Eighteen dialogue entries used the selected Vivian and Eric voices. After explicit retry of the interrupted task, all clips composed into a 230,828-byte MP3; full decoding passed. After another App restart, the player loaded and played it without a media error, duration 57.6 seconds. |
| Speech recognition | Re-imported that generated MP3 through the normal source upload UI. Nimi returned the Chinese transcript, which appeared as a completed research source. It retained the six records and no-zero-fill rule; the recognizer rendered the homophone 海风 as 海丰. The App preserves that actual output. |
| Restart retention | Resumed the same development registration after Host and shared Runtime/Desktop restarts. Notebook, source content, note, profiles, model configuration and completed podcast remained available. No interrupted work was automatically replayed. |
| Interrupted generation | Stopped the supervised App during real dual-speaker synthesis. After resume, the episode was failed with `Notebook session ended; retry explicitly`, its three-segment outline and 18 dialogue entries remained, and it had no completed audio. Generation resumed only after clicking Retry. |
| Installed 1.14.1 | Updated the exact Imported 1.14.0 source, launched its packaged Next server and frozen Python worker, created **安装版验收 · 海风研究**, imported a PDF, generated a real summary and embeddings, and obtained a Chinese answer citing the source and its insight. The answer correctly gave six samples and prohibited zero-filling. |
| Native file save | The installed App's **Download File** action opened the macOS save panel. Saved `.nimi/local/安装版-海风资料.pdf`; its SHA-256 matched the original PDF exactly (`855f9d7f5d3a5359de41515455f58a2963dd09dae51dbfcfb7f14d46c94c6449`). |
| Installed restart | Created **重开保留 · 中文笔记**, quit normally, and relaunched through Desktop. The same Chinese notebook remained with one source and one note. |
| Installed podcast generation | Created speaker and episode profiles through the installed UI, selected Nimi's Vivian voice and `zh-CN`, and generated **安装版 · 海风中文播客** from the installed PDF. The UI exposed Chinese dialogue retaining the sampling and missing-data rules. The packaged worker produced 15 WAV clips and a 173,228-byte MP3 (43.25 seconds); the installed FFmpeg decoded the entire MP3 successfully. The UI showed one completed episode, and playback advanced from 12 to 17 seconds before pausing. |
| Installed audio save and transcription | Used the player's **Download** action and macOS save panel to save `.nimi/local/安装版-海风中文播客.mp3`; its SHA-256 matched the generated audio exactly. Re-imported that file through the native chooser as **安装版 · 播客音频转写** (`source:i4i6moxf4rswv8ypsmv3`). Nimi returned the complete Chinese transcript, including six samples, recording rain interruptions, no zero-filling, and the closing thanks. |

The model choices used for these checks were selected in Kit AIConfig:
local Gemma 4 text generation, local llama.cpp GGUF embeddings, local Qwen3 TTS
CustomVoice synthesis, and the existing Dashscope connector's
`qwen-audio-3.0-asr-flash-streaming` transcription target. These choices are
workspace configuration, not provider/model constants in App code.

### Fixes established during acceptance

- The App accepts the selected speech model's output container and decodes it
  before composing its own MP3 export. Requiring MP3 directly had correctly
  failed on the WAV-only local model.
- Podcast outlines are saved before validating segment count. Explicit retries
  retain additional user instructions. The selected episode language is included
  in both outline and transcript prompts, independently of the source language.
- Runtime embedding-space identifiers survive batching, pooling and persistence.
  Search excludes other spaces even when vectors have the same dimensions;
  a new index replaces old source chunks only after generation succeeds.
- The private worker channel uses strict UTF-8 byte pipes, rejects unsupervised
  use, carries cancellation, and ignores canceled requests' late terminal replies.
- The private HTTP header is added only to requests from an owned renderer at
  the allowed App origin. A temporary embedded-frame request to the live API
  received HTTP 401; the main renderer's same API request returned HTTP 200.
  The temporary frame was removed after this boundary check.
- API startup restores Python's standard verified HTTPS context after loading
  `content-core`, whose YouTube import otherwise disables the default certificate
  checks process-wide. A fresh-process regression failed before this repair and
  passed afterwards, checking both certificate validation and hostname checks.
  HTTPS source import also completed through the restarted App.
- App metadata uses a 512-pixel rendering of the existing SVG logo. The upstream
  raster exceeded Desktop's icon size limit.
- Frozen startup now uses Python 3.11+'s `tomllib` instead of an unnecessary
  compiled `tomli` dependency, and packages imageio's required distribution
  metadata. A stale local `typer` installation left by overlapping `typer-slim`
  files was repaired through the normal locked dependency installer.
- Backend startup failures no longer restart a process on each authorization
  poll or tell an already-authorized user to authorize again. Explicit Retry
  starts another backend attempt; the regression covers both this behavior
  and the requirement for a bound Nimi session.

The shared Nimi change belongs to Runtime: cloud AIConfig options now collapse
catalog aliases of the same executable target while preserving canonical labels
and alias searches. Its owners are
`runtime/internal/services/connector/ai_config_options.go` and the adjacent test.
The connector suite and App AIConfig tests passed. Open Notebook's real Kit
picker then showed five distinct Dashscope ASR targets without duplicate-key
warnings. There is no App-side model-list deduplication or provider bypass.
The same shared Runtime/Desktop restart also loaded another session's native
missing-connector error mapping; affected sessions were notified briefly.

### Checks and build scope

- App Tools `check`, Electron and frontend TypeScript checks: passed.
- Frontend: 137 tests in 26 files passed. Lint passed with five existing hook
  warnings in untouched source components and the original generation dialog.
- Backend: the final full suite passed 567 tests, including language, HTTPS,
  cancellation and embedding-space regressions. Modified Python files pass Ruff;
  the eight Nimi Python modules pass mypy. Two upstream dependency deprecation
  warnings remain.
- Real SurrealDB vector-space/search regression: four tests passed.
- The macOS build at adaptation commit `0abbe3f` and `pack --target macos-aarch64 --production`
  passed on the resumed acceptance run: Next standalone, frozen Python worker,
  SurrealDB resources, Electron packaging and native seal validation. Routine
  functional work still uses development/CDP. The App-owned packager now rejects
  signing failures explicitly, and the npm manifest declares its existing MIT
  license. Installation results are recorded separately below.

Current verified local package:
`dist/nimi-app/io.github.nimiplatform.open-notebook-1.14.1-macos-aarch64.nimiapp`
(1,268,860,529 bytes), SHA-256
`6b831035074c160c5edc16f7c1eebeba440f2a64d7397794e43a1b3f39cd3c64`.
For an existing Imported installation, open its details and choose
**More actions → Update from local file**. That path binds the update to the
existing source and preserves its Nimi-managed data reference.
Before the installed journey above, its frozen worker started against an isolated
temporary database and returned version 1.14.1 with database status online. The
ARM64 FFmpeg binary in the actual installed payload also decoded the complete
previously generated MP3 successfully.
Native posture: `production-unsigned`, current-user launch, ad-hoc seal, no
Developer ID or notarization. The same-cohort reference package also passed
production packing and was imported through Desktop. Its exact Imported 0.1.0
source launched with Nimi Access ready and completed a real text request with
the output `安装授权验收通过。` in its native installed window.

### Audit follow-up

The frontend now reads the Host's current API endpoint for each request and
caches version/health information by backend URL. Four added regressions cover
endpoint changes, late old responses, failed requests and explicit retry.
The existing installed 1.14.1 archive above predates this source fix; a real
installed backend-crash/recovery journey is **NOT-VERIFIED** for the fix.

Frontend CI now installs the root pnpm workspace on Node 24 and runs on both
`main` and `nimi`. The complete dependency archives below are included in Git,
so CI no longer needs a developer's ignored `.nimi/local/packages/` directory.
A separate source snapshot without existing dependencies or local artifacts
passed `pnpm install --frozen-lockfile` and all 137 frontend coverage tests.
Its Next production build also passed, with two CSS optimizer warnings; the
first attempt hit a Google Fonts connection failure, so font downloads still
require network access at build time.
App Tools check and its no-change sync preview also passed for the relocated
archives. The managed release workflow remains owned by App Tools.

The complete native GitHub workflow is still **NOT-VERIFIED**: its build jobs
need explicit Python/uv and SurrealDB preparation, and the matching Windows
native carrier is not in this cohort (the registry query for version 0.16.0
returned 404). These are native build prerequisites beyond the repaired
workspace dependency installation. Public-release preflight still requires
registry resolutions.

### Exact local package combination

Declarations: SDK `^0.19.0`, Kit `^0.16.0`, App Tools `^0.11.4`, exact
nimi-coding `0.6.3`, pnpm `10.34.5`. `pnpm-lock.yaml` pins the actual resolutions.
All overrides are complete `.tgz` packages; no source-workspace links are used.
The native target is `macos-aarch64` / `darwin-arm64`, built with the
`source-local-development` trust profile for the source Desktop carrier
(Electron 42.10.1). Matching version numbers alone are insufficient.

All paths in this table are below `vendor/nimi/`. These are the same bytes used
for the recorded acceptance; moving the archives into Git does not change the
selected package combination:

| Archive | SHA-256 |
| --- | --- |
| `nimiplatform-sdk-0.19.0.tgz` | `4597ca7783f11badf2c765cb1e4119b99f0b9508460214a29ff99e9d0b866a45` |
| `nimiplatform-kit-0.16.0.tgz` | `f44da5fd9150c63a9fbeefbc4e5fad9b1698223eb7f1464e5fa0a13c63070dd0` |
| `nimiplatform-app-tools-0.11.4.tgz` | `969d3bb7e5c512ab05b8e24b5249eb96da848186d58f03b7038d034028aead16` |
| `nimiplatform-kit-protected-local-darwin-arm64-0.16.0.tgz` | `025ecc532c2740cd79ccd5e31d4bf9880987e171c8f46fec64cee9a6c9b7b8b8` |

These packages came from the Nimi working tree based on
`711fa4829ab5c7be54bc3e926177b99b9c3127e4`, including concurrent source changes.
The Runtime binary used for final development checks has SHA-256
`3e7cbc53f8c9908e51f3fb1b397c9cbf098a4281ad981e838967f7438b5442e3`.
The resumed installation run uses Runtime SHA-256
`30c93647df3ee38ee078374ccb2917f6747eaadd655703775f16db6fce8550f2`,
including the parallel session's temporary-package verification I/O repair.
The selected complete archives are tracked in Git; local build and verification
output remains ignored under `.nimi/local/`. Upgrade this cohort deliberately
through the App Tools package workflow. Public release requires registry resolutions and
the production native profile; this development combination is not a release.

### Remaining acceptance and decisions

- Native file save is verified through the installed PDF source workflow.
  Installed podcast generation also produced real audio at
  `workspaces/995f9f8c-f04f-42a1-92ed-d3be6a617046/podcasts/episodes/683357bd-ff4a-49e3-bd83-51f1b973c6d2/podcast.mp3`
  below the App's business-data root. SHA-256:
  `d09aef74c95625a221f0b8593c1f1d7ad03c5aaa2241ed5078fb1fa4f80ff225`.
  Installed player playback, native audio download and re-import/transcription
  subsequently passed after the native window became available. The saved MP3
  has the same hash. This completion used the existing 1.14.1 installation;
  no further build or import was needed.
- **Verified — system-browser handoff:** clicking the original source link
  opened `https://example.com` in Chrome, observed through native UI. Open
  Notebook stayed at its own source-detail URL and kept its protected origin.
- **NOT-VERIFIED:** Windows execution, actual account switching, optional
  Docling/Crawl4AI/YouTube fallback engines, ordinary system-Runtime/Catalog
  installation, and public release. The initial installed 1.14.0 could not create
  business content, so populated cross-version retention was not established;
  the actual update and 1.14.1 restart retention were verified separately.
- No unresolved product or ownership fork is required for the implemented scope.
  Public Integration operations remain excluded by the user's confirmed choice.
