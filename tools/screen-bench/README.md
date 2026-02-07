# screen-bench

Minimal ScreenCaptureKit benchmark to measure capture + optional recording cost across multiple displays.

## Build

```bash
cd tools/screen-bench
swift build
```

## List Displays

```bash
swift run screen-bench --list
```

## Run Benchmark

Capture two displays for 15 seconds at 30 FPS:

```bash
swift run screen-bench --displays 1,2 --duration 15 --fps 30
```

Record each display to MP4 during the benchmark:

```bash
swift run screen-bench --displays 1,2 --duration 15 --fps 30 --record --output-dir /tmp/screen-bench
```

Downscale capture to reduce load:

```bash
swift run screen-bench --displays 1,2 --duration 15 --fps 30 --size 1280x720
```

## Notes

- You must grant Screen Recording permission.
- Recording uses H.264 and writes one MP4 per display.
- Dropped frames indicate capture/encode pressure.
