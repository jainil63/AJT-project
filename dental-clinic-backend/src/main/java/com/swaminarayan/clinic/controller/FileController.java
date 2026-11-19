package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.service.FileStorageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Serves stored uploads (e.g. doctor signature) for the frontend's fileUrl() helper: /api/file/view?key=...&token=... */
@RestController
public class FileController {
    private final FileStorageService files;

    public FileController(FileStorageService files) {
        this.files = files;
    }

    @GetMapping("/file/view")
    public ResponseEntity<FileSystemResource> view(@RequestParam String key) throws IOException {
        Path p = files.resolve(key);
        String type = Files.probeContentType(p);
        return ResponseEntity.ok()
                .contentType(type == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(type))
                .body(new FileSystemResource(p));
    }
}
