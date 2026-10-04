package com.codev.onboardingdiary.admin;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Generates random temporary passwords that satisfy the password policy. */
final class TemporaryPasswords {

  private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  private static final String LOWER = "abcdefghijkmnpqrstuvwxyz";
  private static final String DIGITS = "23456789";
  private static final String ALL = UPPER + LOWER + DIGITS;
  private static final int LENGTH = 14;
  private static final SecureRandom RANDOM = new SecureRandom();

  private TemporaryPasswords() {}

  static String generate() {
    List<Character> chars = new ArrayList<>(LENGTH);
    chars.add(pick(UPPER));
    chars.add(pick(LOWER));
    chars.add(pick(DIGITS));
    while (chars.size() < LENGTH) {
      chars.add(pick(ALL));
    }
    Collections.shuffle(chars, RANDOM);
    StringBuilder password = new StringBuilder(LENGTH);
    chars.forEach(password::append);
    return password.toString();
  }

  private static char pick(String alphabet) {
    return alphabet.charAt(RANDOM.nextInt(alphabet.length()));
  }
}
