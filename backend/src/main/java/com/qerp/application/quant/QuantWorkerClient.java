package com.qerp.application.quant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Component
public class QuantWorkerClient {

    static final String QUANT_WORKER_DIR_ENV = "QERP3_QUANT_WORKER_DIR";
    static final String QUANT_PYTHON_BIN_ENV = "QERP3_QUANT_PYTHON_BIN";
    private static final String DEFAULT_PYTHON_EXECUTABLE = "python3";
    private static final String QUANT_WORKER_DIRECTORY_NAME = "quant-worker";
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);

    private final ObjectMapper objectMapper;

    public QuantWorkerClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public QuantSignal execute(QuantWorkerRequest request) {
        Path workingDirectory = resolveQuantWorkerDirectory();
        List<String> command = buildCommand(request);

        try {
            Process process = new ProcessBuilder(command)
                    .directory(workingDirectory.toFile())
                    .start();

            boolean finished = process.waitFor(DEFAULT_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("quant-worker timed out after " + DEFAULT_TIMEOUT.toSeconds() + " seconds.");
            }

            String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8).trim();

            if (process.exitValue() != 0) {
                throw new IllegalStateException(buildFailureMessage(stderr, stdout));
            }

            return objectMapper.readValue(stdout, QuantSignal.class);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("quant-worker execution was interrupted.", error);
        } catch (IOException error) {
            throw new IllegalStateException("Failed to execute quant-worker placeholder CLI.", error);
        }
    }

    List<String> buildCommand(QuantWorkerRequest request) {
        return List.of(
                resolvePythonExecutable(),
                "-m",
                "app.main",
                "--symbol",
                request.symbol().trim().toUpperCase(Locale.ROOT),
                "--price",
                toPlainString(request.observedPrice()),
                "--reference-price",
                toPlainString(request.referencePrice()),
                "--threshold-percent",
                toPlainString(request.thresholdPercent())
        );
    }

    Path resolveQuantWorkerDirectory() {
        Path runtimePath = resolveRuntimePath();
        Set<Path> candidates = new LinkedHashSet<>();
        String envCandidate = System.getenv(QUANT_WORKER_DIR_ENV);

        if (envCandidate != null && !envCandidate.isBlank()) {
            candidates.add(Paths.get(envCandidate.trim()).toAbsolutePath().normalize());
        }

        candidates.addAll(buildQuantWorkerDirectoryCandidates(Paths.get("")));
        if (runtimePath != null) {
            candidates.addAll(buildQuantWorkerDirectoryCandidates(runtimePath));
        }

        return candidates.stream()
                .filter(QuantWorkerClient::isQuantWorkerDirectory)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Unable to locate the quant-worker directory from the backend runtime."));
    }

    static List<Path> buildQuantWorkerDirectoryCandidates(Path startPath) {
        Path startingDirectory = normalizeSearchStart(startPath);
        if (startingDirectory == null) {
            return List.of();
        }

        List<Path> candidates = new ArrayList<>();
        Path currentPath = startingDirectory;

        while (currentPath != null) {
            candidates.add(currentPath);
            candidates.add(currentPath.resolve(QUANT_WORKER_DIRECTORY_NAME));
            currentPath = currentPath.getParent();
        }

        return candidates;
    }

    private static Path normalizeSearchStart(Path path) {
        if (path == null) {
            return null;
        }

        Path resolved = path.toAbsolutePath().normalize();
        return Files.isDirectory(resolved) ? resolved : resolved.getParent();
    }

    private static boolean isQuantWorkerDirectory(Path candidate) {
        return candidate != null && Files.isRegularFile(candidate.resolve("app").resolve("main.py"));
    }

    private Path resolveRuntimePath() {
        try {
            return Paths.get(QuantWorkerClient.class.getProtectionDomain().getCodeSource().getLocation().toURI())
                    .toAbsolutePath()
                    .normalize();
        } catch (URISyntaxException | NullPointerException error) {
            return null;
        }
    }

    private String resolvePythonExecutable() {
        String configured = System.getenv(QUANT_PYTHON_BIN_ENV);
        if (configured == null || configured.isBlank()) {
            return DEFAULT_PYTHON_EXECUTABLE;
        }
        return configured.trim();
    }

    private String toPlainString(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private String buildFailureMessage(String stderr, String stdout) {
        String detail = !stderr.isBlank() ? stderr : stdout;
        if (detail.isBlank()) {
            return "quant-worker exited with a non-zero status.";
        }
        return "quant-worker failed: " + detail;
    }
}
