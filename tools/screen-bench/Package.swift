// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "screen-bench",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "screen-bench", targets: ["screen-bench"])
    ],
    targets: [
        .executableTarget(
            name: "screen-bench",
            dependencies: [],
            path: "Sources"
        )
    ]
)
