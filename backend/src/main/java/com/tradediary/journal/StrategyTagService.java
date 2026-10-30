package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StrategyTagService {

    private static final List<DefaultTagSeed> DEFAULT_TAGS = List.of(
            new DefaultTagSeed("매수", "#22c55e"),
            new DefaultTagSeed("매도", "#ef4444"),
            new DefaultTagSeed("단기투자", "#3b82f6"),
            new DefaultTagSeed("장기투자", "#f59e0b")
    );

    private static final Set<String> LEGACY_SEED_TAG_NAMES = Set.of(
            "추세추종", "역추세", "브레이크아웃", "지지/저항",
            "이평선", "단타", "스윙", "스캘핑",
            "알트코인", "선물", "투자", "거래량", "뇌동매매"
    );

    private final StrategyTagRepository strategyTagRepository;
    private final UserRepository userRepository;

    @Transactional
    public List<TagResponse> getTags(Long userId) {
        ensureDefaultTags();

        Map<String, Integer> defaultOrder = DEFAULT_TAGS.stream()
                .collect(Collectors.toMap(DefaultTagSeed::name, seed -> DEFAULT_TAGS.indexOf(seed)));
        Set<String> defaultNames = new HashSet<>(defaultOrder.keySet());

        return strategyTagRepository.findAllByUserIdOrDefault(userId).stream()
                .filter(tag -> tag.getUser() != null || defaultNames.contains(tag.getName()))
                .filter(tag -> defaultNames.contains(tag.getName()) || !LEGACY_SEED_TAG_NAMES.contains(tag.getName()))
                .sorted(Comparator.comparingInt(tag ->
                        tag.getUser() == null
                                ? defaultOrder.getOrDefault(tag.getName(), Integer.MAX_VALUE)
                                : 10_000 + tag.getId().intValue()))
                .map(TagResponse::from)
                .toList();
    }

    @Transactional
    public TagResponse createTag(Long userId, TagCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        StrategyTag tag = StrategyTag.builder()
                .user(user)
                .name(request.name())
                .color(request.color())
                .build();

        return TagResponse.from(strategyTagRepository.save(tag));
    }

    @Transactional
    public void deleteTag(Long userId, Long tagId) {
        if (!strategyTagRepository.existsByIdAndUserId(tagId, userId)) {
            throw new BusinessException(ErrorCode.TAG_NOT_FOUND);
        }
        strategyTagRepository.deleteById(tagId);
    }

    private void ensureDefaultTags() {
        Set<String> existingNames = strategyTagRepository.findByUserIsNull().stream()
                .map(StrategyTag::getName)
                .collect(Collectors.toSet());

        for (DefaultTagSeed seed : DEFAULT_TAGS) {
            if (!existingNames.contains(seed.name())) {
                strategyTagRepository.save(StrategyTag.builder()
                        .user(null)
                        .name(seed.name())
                        .color(seed.color())
                        .build());
            }
        }
    }

    public record TagResponse(Long id, String name, String color, boolean isDefault) {
        public static TagResponse from(StrategyTag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getColor(), tag.getUser() == null);
        }
    }

    public record TagCreateRequest(String name, String color) {}

    private record DefaultTagSeed(String name, String color) {}
}
