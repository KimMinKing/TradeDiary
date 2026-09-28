package com.tradediary.user;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserPrivacyAccessTest {
    @Test
    void privateProfileBlocksEveryPublicSection() {
        User user = User.builder().email("private@example.com").nickname("private").build();
        user.updatePrivacy(false, true, true, true, true, true);

        for (UserService.PublicSection section : UserService.PublicSection.values()) {
            assertThat(UserService.isPublicSectionAllowed(user, section)).isFalse();
        }
    }

    @Test
    void eachSensitiveSectionRequiresExplicitConsent() {
        User user = User.builder().email("user@example.com").nickname("user").build();
        user.updatePrivacy(true, false, false, false, false, false);

        assertThat(UserService.isPublicSectionAllowed(user, UserService.PublicSection.PROFILE)).isTrue();
        assertThat(UserService.isPublicSectionAllowed(user, UserService.PublicSection.STATS)).isFalse();
        assertThat(UserService.isPublicSectionAllowed(user, UserService.PublicSection.POSITIONS)).isFalse();
        assertThat(UserService.isPublicSectionAllowed(user, UserService.PublicSection.TRADES)).isFalse();
    }
}
