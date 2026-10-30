package com.tradediary.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserLanguageService {
    private final UserRepository userRepository;

    public String get(Long userId) {
        if (userId == null) return "en";
        return userRepository.findById(userId)
                .map(User::getPreferredLanguage)
                .filter(language -> language.equals("ko") || language.equals("en"))
                .orElse("en");
    }
}
