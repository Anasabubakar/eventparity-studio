# Overview

The report explorer for [EventParity](https://github.com/Event-Parity/eventparity-engine) reports: did changing your Stellar data source change your payment records?

It reads a report produced by `eventparity-engine`, shows the verdict (**parity**, **differences** or **inconclusive**), draws what each source actually covered, and lists every difference with the exact evidence from both sides. It computes no verdict of its own: everything on the page comes from the report JSON, and the page refuses reports that contradict themselves (for example one that claims parity while a source has a coverage gap).

Hosted demo: https://eventparity-studio-anasamasama.vercel.app

Source: [eventparity-studio on GitHub](https://github.com/Event-Parity/eventparity-studio). Releases: [GitHub releases](https://github.com/Event-Parity/eventparity-studio/releases).
