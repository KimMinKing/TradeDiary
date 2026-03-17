// [파일 용도] 전략 태그 CRUD 비즈니스 로직

package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// [클래스] 전략 태그 목록 조회 / 생성 / 삭제
@Service
@RequiredArgsConstructor
public class StrategyTagService {

    private final StrategyTagRepository strategyTagRepository;
    private final UserRepository userRepository;

    // [용도] 기본 태그 + 내 커스텀 태그 목록 조회 / [호출] StrategyTagController.getTags()
    @Transactional(readOnly = true)
    public List<TagResponse> getTags(Long userId) {
        return strategyTagRepository.findAllByUserIdOrDefault(userId)
                .stream()
                .map(TagResponse::from)
                .toList();
    }

    // [용도] 커스텀 태그 생성 / [호출] StrategyTagController.createTag()
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

    // [용도] 커스텀 태그 삭제 (본인 태그만 삭제 가능) / [호출] StrategyTagController.deleteTag()
    @Transactional
    public void deleteTag(Long userId, Long tagId) {
        if (!strategyTagRepository.existsByIdAndUserId(tagId, userId)) {
            throw new BusinessException(ErrorCode.TAG_NOT_FOUND);
        }
        strategyTagRepository.deleteById(tagId);
    }

    // 태그 응답 DTO
    public record TagResponse(Long id, String name, String color, boolean isDefault) {
        public static TagResponse from(StrategyTag tag) {
            return new TagResponse(tag.getId(), tag.getName(), tag.getColor(), tag.getUser() == null);
        }
    }

    // 태그 생성 요청 DTO
    public record TagCreateRequest(String name, String color) {}
}
