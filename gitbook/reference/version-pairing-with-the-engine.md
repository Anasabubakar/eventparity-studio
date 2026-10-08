# Version pairing with the engine

| studio | eventparity-engine | report version | status |
|---|---|---|---|
| 0.1.2 | 0.1.2 (commit in `vendor/eventparity-engine/VERSION.json`) | 1 | tested |

The report schema, the three golden reports and the engine's own text renderings of them are vendored (`pnpm vendor ../eventparity-engine` refreshes them and the stamp; it runs the engine with Go 1.25). A test parses the engine's text output and asserts the page shows the same verdict, counts, differences and gaps. The repo has no dependency on a sibling path and builds from a clean clone.
