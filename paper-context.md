# Paper Context

## What this is
Benchmark: can LLMs produce straight-line planar drawings (coordinates) for increasingly larger graphs?
Input: 200 planar graphs in graph6 format from McKay's plantri/nauty (ANU), in graphs/planar/{0-9}.g6

## Key framing
- Planarity testing is O(n) for algorithms (Hopcroft-Tarjan, Boyer-Myrvold)
- Can't be shortcut by memorization — true OOD benchmark
- Verification: check all edge pairs for intersections
- Fáry's theorem guarantees straight-line drawing always exists for planar graphs

## Related work
- Fan et al. 2025 (layout quality evaluation, not planarity)
- Di Bartolomeo et al. 2023 (Sugiyama algorithm steps, not planarity)
- GraphArena (graph computation, no drawing)
- GraphOmni 2025/2026 (BFS/connectivity/etc, no planarity)
- Nobody has done planar straight-line coordinate generation
