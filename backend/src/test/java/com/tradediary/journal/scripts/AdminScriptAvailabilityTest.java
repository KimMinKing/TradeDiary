package com.tradediary.journal.scripts;

import com.tradediary.journal.StrategyTagRepository;
import com.tradediary.journal.TradeJournalRepository;
import com.tradediary.position.PositionRepository;
import com.tradediary.trade.TradeRepository;
import com.tradediary.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AdminScriptAvailabilityTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(ScriptController.class, TestDataGeneratorController.class,
                    JournalExchangeUpdateController.class)
            .withBean(TestDataGenerator.class, () -> mock(TestDataGenerator.class))
            .withBean(ComprehensiveTestDataGenerator.class, () -> mock(ComprehensiveTestDataGenerator.class))
            .withBean(JournalExchangeUpdater.class, () -> mock(JournalExchangeUpdater.class))
            .withBean(UserRepository.class, () -> mock(UserRepository.class))
            .withBean(TradeRepository.class, () -> mock(TradeRepository.class))
            .withBean(PositionRepository.class, () -> mock(PositionRepository.class))
            .withBean(TradeJournalRepository.class, () -> mock(TradeJournalRepository.class))
            .withBean(StrategyTagRepository.class, () -> mock(StrategyTagRepository.class));

    @Test
    void adminScriptEndpointsAreDisabledByDefaultEvenLocally() {
        context.withInitializer(ctx -> ctx.getEnvironment().setActiveProfiles("local"))
                .run(ctx -> {
                    assertThat(ctx).doesNotHaveBean(ScriptController.class);
                    assertThat(ctx).doesNotHaveBean(TestDataGeneratorController.class);
                    assertThat(ctx).doesNotHaveBean(JournalExchangeUpdateController.class);
                });
    }

    @Test
    void adminScriptEndpointsRequireExplicitOptInOutsideProduction() {
        context.withInitializer(ctx -> ctx.getEnvironment().setActiveProfiles("local"))
                .withPropertyValues("tradediary.admin-scripts.enabled=true")
                .run(ctx -> {
                    assertThat(ctx).hasSingleBean(ScriptController.class);
                    assertThat(ctx).hasSingleBean(TestDataGeneratorController.class);
                    assertThat(ctx).hasSingleBean(JournalExchangeUpdateController.class);
                });
    }

    @Test
    void productionNeverExposesAdminScriptEndpoints() {
        context.withInitializer(ctx -> ctx.getEnvironment().setActiveProfiles("prod"))
                .withPropertyValues("tradediary.admin-scripts.enabled=true")
                .run(ctx -> {
                    assertThat(ctx).doesNotHaveBean(ScriptController.class);
                    assertThat(ctx).doesNotHaveBean(TestDataGeneratorController.class);
                    assertThat(ctx).doesNotHaveBean(JournalExchangeUpdateController.class);
                });
        context.withInitializer(ctx -> ctx.getEnvironment().setActiveProfiles("prod", "local"))
                .withPropertyValues("tradediary.admin-scripts.enabled=true")
                .run(ctx -> {
                    assertThat(ctx).doesNotHaveBean(ScriptController.class);
                    assertThat(ctx).doesNotHaveBean(TestDataGeneratorController.class);
                    assertThat(ctx).doesNotHaveBean(JournalExchangeUpdateController.class);
                });
    }
}
