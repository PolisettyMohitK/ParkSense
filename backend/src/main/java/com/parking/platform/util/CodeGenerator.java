package com.parking.platform.util;

import java.security.SecureRandom;

public final class CodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private CodeGenerator() {
    }

    public static String reservationCode() {
        return generate("RES-");
    }

    public static String sessionCode() {
        return generate("SES-");
    }

    private static String generate(String prefix) {
        StringBuilder builder = new StringBuilder(prefix);
        for (int i = 0; i < 8; i++) {
            builder.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return builder.toString();
    }
}
