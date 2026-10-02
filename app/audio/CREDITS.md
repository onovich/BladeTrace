# Battle sound effects

These are the user-selected files, copied without modifying the approved WAVs.

| File | Selection | Source / rights | Duration | Runtime volume |
| --- | --- | --- | --- | --- |
| parry-success.wav | Round 9, full / 厚度 B | CC0 recording composite, credits below | 1350ms | 0.70 |
| blade-clash.wav | Round 3, 刀碰 2 | StarNinjas, CC0 | 340ms | 0.50 |
| attack-start.wav | Round 2, 掠空 1 | Suno Sounds, account-authorized Pro generation and user official WAV download | 480ms | 0.45 |

Parry combines a +12-semitone, reverberant spear/katana recording by
Ben Jaszczak and Brian Nelson (Still North Media) with a short low/mid layer
from StarNinjas' knife-clash recording. No further processing on integration.

- [Still North Media weapon impacts, CC0](https://opengameart.org/node/146863)
- [StarNinjas sword clashes, CC0](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes)
- [CC0](https://creativecommons.org/publicdomain/zero/1.0/): attribution optional, retained here in appreciation.
- Suno source candidates: [e430e812](https://suno.com/song/e430e812-4c36-490c-b7b0-8e1107693662), [e5fa2622](https://suno.com/song/e5fa2622-c81f-4644-b7d9-77b90b274c8d). Duplicate downloaded names prevent a verified individual URL mapping. Selected file was `whoosh_1.wav`, from the `(1).wav` download, cropped 70–550ms.
- [Suno terms](https://about.suno.com/terms) and [paid-plan rights](https://help.suno.com/en/articles/9601665), checked 2026-09-08. Account awesomefeedback627 was observed on Pro and the user downloaded the WAVs through Suno. This asset is not CC0 and must not be represented as such under the repository's code license.

Loop: false for all cues. Attack sound is triggered by public attack movement,
never by a parry-circle boundary. Parry sound follows outbound blade contact inside
the dashed circle. Ordinary blade clash plays once on outbound contact outside
the circle, blocks damage, and does not change posture. These contact cues are
mutually exclusive; air swings and recovery do not play them. Player-hit sound is unchanged.
Unselected backups remain in the local audition folders, not in shipped assets.

Sources and full generation/processing prompts are retained in the local
round2 and round9 audition manifests. All selected sample playback supports
both file:// and HTTP through preloaded media elements; parry has four voices.
