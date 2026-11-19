package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Stores small uploads (doctor signature image) on local disk under app.upload-dir. */
@Service
public class FileStorageService {
    private static final Set<String> ALLOWED = Set.of("png", "jpg", "jpeg", "gif", "webp");
    private final Path root;

    public FileStorageService(@Value("${app.upload-dir}") String dir) {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
    }

    public String save(MultipartFile file, String folder, long maxBytes) {
        if (file == null || file.isEmpty()) return null;
        if (file.getSize() > maxBytes) throw ApiException.badRequest("Image must be smaller than " + (maxBytes / 1024 / 1024) + "MB");
        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        int dot = original.lastIndexOf('.');
        String ext = dot < 0 ? "" : original.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(ext)) throw ApiException.badRequest("Only PNG, JPG, GIF or WEBP images are allowed");
        try {
            Path dir = root.resolve(folder);
            Files.createDirectories(dir);
            String name = UUID.randomUUID() + "." + ext;
            file.transferTo(dir.resolve(name));
            return folder + "/" + name;
        } catch (IOException e) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file");
        }
    }

    /** Resolves a stored key, rejecting anything that escapes the upload directory. */
    public Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p)) throw ApiException.notFound("File not found");
        return p;
    }
}
