package com.parking.platform.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Resolves the gallery for a venue cover. Bundled venue photos live under {@code static/places} as
 * {@code name.jpg} plus optional {@code name-b.jpg}, {@code name-c.jpg}; only files that exist are returned.
 * External cover URLs are returned on their own.
 */
@Component
public class PlacePhotoCatalog {

    private static final String PREFIX = "/places/";
    private static final String[] VARIANTS = {"-b", "-c", "-d"};

    private final Map<String, List<String>> cache = new ConcurrentHashMap<>();

    public List<String> photosFor(String coverUrl) {
        if (coverUrl == null || coverUrl.isBlank()) {
            return List.of();
        }
        return cache.computeIfAbsent(coverUrl, this::resolve);
    }

    private List<String> resolve(String coverUrl) {
        List<String> photos = new ArrayList<>();
        photos.add(coverUrl);
        int dot = coverUrl.lastIndexOf('.');
        if (!coverUrl.startsWith(PREFIX) || dot <= PREFIX.length()) {
            return List.copyOf(photos);
        }
        String base = coverUrl.substring(0, dot);
        String extension = coverUrl.substring(dot);
        for (String variant : VARIANTS) {
            String candidate = base + variant + extension;
            if (new ClassPathResource("static" + candidate).exists()) {
                photos.add(candidate);
            }
        }
        return List.copyOf(photos);
    }
}
