import Foundation
import ScreenCaptureKit
import AVFoundation
import CoreGraphics
import os.lock

struct Config {
    var listOnly: Bool = false
    var displayIDs: [UInt32] = []
    var durationSeconds: Double = 10
    var targetFPS: Double = 30
    var size: CGSize? = nil
    var showsCursor: Bool = true
    var queueDepth: Int = 6
    var record: Bool = false
    var outputDir: String = "/tmp/screen-bench"
}

struct DisplaySummary: Codable {
    let displayID: UInt32
    let resolution: String
    let frames: Int
    let droppedFrames: Int
    let durationSeconds: Double
    let measuredFPS: Double
    let recording: Bool
    let outputFile: String?
}

struct Summary: Codable {
    let startedAt: String
    let targetFPS: Double
    let durationSeconds: Double
    let displays: [DisplaySummary]
}

final class StreamSession {
    let display: SCDisplay
    let displayID: UInt32
    let targetSize: CGSize
    let targetFPS: Double
    let showsCursor: Bool
    let queueDepth: Int
    let record: Bool
    let outputPath: String?

    private(set) var frameCount: Int = 0
    private(set) var droppedFrames: Int = 0
    private var firstTime: Double?
    private var lastTime: Double?
    private var lock = os_unfair_lock_s()

    private var writer: AVAssetWriter?
    private var writerInput: AVAssetWriterInput?
    private var startedWriting = false

    init(display: SCDisplay, targetSize: CGSize, targetFPS: Double, showsCursor: Bool, queueDepth: Int, record: Bool, outputDir: String) throws {
        self.display = display
        self.displayID = display.displayID
        self.targetSize = targetSize
        self.targetFPS = targetFPS
        self.showsCursor = showsCursor
        self.queueDepth = queueDepth
        self.record = record
        if record {
            let fileName = "display-\(display.displayID).mp4"
            self.outputPath = (outputDir as NSString).appendingPathComponent(fileName)
            try FileManager.default.createDirectory(atPath: outputDir, withIntermediateDirectories: true)
            if FileManager.default.fileExists(atPath: outputPath!) {
                try FileManager.default.removeItem(atPath: outputPath!)
            }
            let writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: outputPath!), fileType: .mp4)
            let settings: [String: Any] = [
                AVVideoCodecKey: AVVideoCodecType.h264,
                AVVideoWidthKey: targetSize.width,
                AVVideoHeightKey: targetSize.height
            ]
            let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
            input.expectsMediaDataInRealTime = true
            if writer.canAdd(input) {
                writer.add(input)
            }
            self.writer = writer
            self.writerInput = input
        } else {
            self.outputPath = nil
        }
    }

    func recordFrame(_ sampleBuffer: CMSampleBuffer) {
        os_unfair_lock_lock(&lock)
        defer { os_unfair_lock_unlock(&lock) }

        let now = CACurrentMediaTime()
        if firstTime == nil {
            firstTime = now
        }
        lastTime = now
        frameCount += 1

        guard record, let writer = writer, let input = writerInput else {
            return
        }

        if !startedWriting {
            writer.startWriting()
            let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
            writer.startSession(atSourceTime: pts)
            startedWriting = true
        }

        if input.isReadyForMoreMediaData {
            if !input.append(sampleBuffer) {
                droppedFrames += 1
            }
        } else {
            droppedFrames += 1
        }
    }

    func finishWriting() async {
        guard record, let writer = writer, let input = writerInput, startedWriting else {
            return
        }
        input.markAsFinished()
        await withCheckedContinuation { continuation in
            writer.finishWriting {
                continuation.resume()
            }
        }
    }

    func statsSummary() -> (frames: Int, dropped: Int, duration: Double, fps: Double) {
        os_unfair_lock_lock(&lock)
        defer { os_unfair_lock_unlock(&lock) }
        let frames = frameCount
        let dropped = droppedFrames
        let duration: Double
        if let firstTime = firstTime, let lastTime = lastTime {
            duration = max(0.001, lastTime - firstTime)
        } else {
            duration = 0
        }
        let fps = duration > 0 ? Double(frames) / duration : 0
        return (frames, dropped, duration, fps)
    }
}

final class StreamOutput: NSObject, SCStreamOutput {
    private let session: StreamSession

    init(session: StreamSession) {
        self.session = session
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of outputType: SCStreamOutputType) {
        guard outputType == .screen else { return }
        session.recordFrame(sampleBuffer)
    }
}

final class StreamDelegate: NSObject, SCStreamDelegate {
    func stream(_ stream: SCStream, didStopWithError error: Error) {
        fputs("Stream error: \(error)\n", stderr)
    }
}

@main
struct ScreenBench {
    static func main() async {
        do {
            let config = try parseArgs()
            let startedAt = ISO8601DateFormatter().string(from: Date())

            let content = try await SCShareableContent.current
            let displays = content.displays

            if config.listOnly {
                printDisplayList(displays)
                return
            }

            let selectedDisplays = pickDisplays(displays, ids: config.displayIDs)
            if selectedDisplays.isEmpty {
                fputs("No displays selected. Use --list to see available displays.\n", stderr)
                exit(2)
            }

            let sessions = try selectedDisplays.map { display in
                let bounds = CGDisplayBounds(display.displayID)
                let size = config.size ?? CGSize(width: bounds.width, height: bounds.height)
                return try StreamSession(
                    display: display,
                    targetSize: size,
                    targetFPS: config.targetFPS,
                    showsCursor: config.showsCursor,
                    queueDepth: config.queueDepth,
                    record: config.record,
                    outputDir: config.outputDir
                )
            }

            let delegate = StreamDelegate()
            var outputs: [StreamOutput] = []
            let streams = try sessions.map { session -> SCStream in
                let filter = SCContentFilter(display: session.display, excludingWindows: [])
                let config = SCStreamConfiguration()
                config.width = Int(session.targetSize.width)
                config.height = Int(session.targetSize.height)
                config.minimumFrameInterval = CMTime(value: 1, timescale: Int32(max(1, session.targetFPS)))
                config.queueDepth = session.queueDepth
                config.pixelFormat = kCVPixelFormatType_32BGRA
                config.showsCursor = session.showsCursor
                config.capturesAudio = false

                let stream = SCStream(filter: filter, configuration: config, delegate: delegate)
                let output = StreamOutput(session: session)
                outputs.append(output)
                let queue = DispatchQueue(label: "screen-bench.output.\(session.displayID)")
                try stream.addStreamOutput(output, type: .screen, sampleHandlerQueue: queue)
                return stream
            }

            for stream in streams {
                try await stream.startCapture()
            }

            let durationNs = UInt64(max(1, config.durationSeconds) * 1_000_000_000)
            try await Task.sleep(nanoseconds: durationNs)

            for stream in streams {
                try await stream.stopCapture()
            }

            for session in sessions {
                await session.finishWriting()
            }

            let summaries = sessions.map { session -> DisplaySummary in
                let stats = session.statsSummary()
                let bounds = CGDisplayBounds(session.displayID)
                let resolution = "\(Int(bounds.width))x\(Int(bounds.height))"
                return DisplaySummary(
                    displayID: session.displayID,
                    resolution: resolution,
                    frames: stats.frames,
                    droppedFrames: stats.dropped,
                    durationSeconds: stats.duration,
                    measuredFPS: stats.fps,
                    recording: session.record,
                    outputFile: session.outputPath
                )
            }

            let summary = Summary(
                startedAt: startedAt,
                targetFPS: config.targetFPS,
                durationSeconds: config.durationSeconds,
                displays: summaries
            )

            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(summary)
            if let json = String(data: data, encoding: .utf8) {
                print(json)
            }
        } catch {
            fputs("Error: \(error)\n", stderr)
            exit(1)
        }
    }

    static func parseArgs() throws -> Config {
        var config = Config()
        var iterator = CommandLine.arguments.dropFirst().makeIterator()
        while let arg = iterator.next() {
            switch arg {
            case "--help", "-h":
                printUsage()
                exit(0)
            case "--list":
                config.listOnly = true
            case "--displays":
                if let value = iterator.next() {
                    config.displayIDs = parseIDList(value)
                }
            case "--duration":
                if let value = iterator.next(), let parsed = Double(value) {
                    config.durationSeconds = parsed
                }
            case "--fps":
                if let value = iterator.next(), let parsed = Double(value) {
                    config.targetFPS = parsed
                }
            case "--size":
                if let value = iterator.next(), let size = parseSize(value) {
                    config.size = size
                }
            case "--no-cursor":
                config.showsCursor = false
            case "--queue-depth":
                if let value = iterator.next(), let parsed = Int(value) {
                    config.queueDepth = parsed
                }
            case "--record":
                config.record = true
            case "--output-dir":
                if let value = iterator.next() {
                    config.outputDir = value
                }
            default:
                fputs("Unknown argument: \(arg)\n", stderr)
                printUsage()
                exit(1)
            }
        }
        return config
    }

    static func printUsage() {
        let text = """
        screen-bench - ScreenCaptureKit benchmark

        Usage:
          screen-bench --list
          screen-bench --displays <id1,id2> [options]

        Options:
          --list                 List available display IDs
          --displays <ids>       Comma-separated display IDs (or indices from --list)
          --duration <seconds>   Benchmark duration (default: 10)
          --fps <fps>            Target FPS (default: 30)
          --size <WxH>           Downscale to width x height (default: native)
          --record               Enable MP4 recording per display
          --output-dir <path>    Directory for recorded videos (default: /tmp/screen-bench)
          --no-cursor            Hide cursor in capture
          --queue-depth <n>      Stream queue depth (default: 6)
        """
        print(text)
    }

    static func printDisplayList(_ displays: [SCDisplay]) {
        print("Available displays:")
        for (idx, display) in displays.enumerated() {
            let bounds = CGDisplayBounds(display.displayID)
            let line = "[\(idx)] id=\(display.displayID) size=\(Int(bounds.width))x\(Int(bounds.height))"
            print(line)
        }
    }

    static func parseIDList(_ value: String) -> [UInt32] {
        value.split(separator: ",").compactMap { UInt32($0.trimmingCharacters(in: .whitespaces)) }
    }

    static func parseSize(_ value: String) -> CGSize? {
        let parts = value.lowercased().split(separator: "x")
        guard parts.count == 2,
              let width = Double(parts[0]),
              let height = Double(parts[1]) else {
            return nil
        }
        return CGSize(width: width, height: height)
    }

    static func pickDisplays(_ displays: [SCDisplay], ids: [UInt32]) -> [SCDisplay] {
        guard !ids.isEmpty else { return displays }
        var selected: [SCDisplay] = []
        for id in ids {
            if let match = displays.first(where: { $0.displayID == id }) {
                selected.append(match)
            } else if id < displays.count {
                selected.append(displays[Int(id)])
            }
        }
        return selected
    }
}
