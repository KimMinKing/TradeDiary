// [파일 용도] 매매 계획 메모 비즈니스 로직

package com.tradediary.plan;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

// [클래스] 매매 계획 메모 CRUD 처리
@Service
@RequiredArgsConstructor
public class TradePlanService {

    private final TradePlanRepository planRepository;
    private final UserRepository      userRepository;

    // [용도] 사용자의 전체 계획 목록 조회 / [호출] TradePlanController.getPlans()
    @Transactional(readOnly = true)
    public List<PlanDto> getPlans(Long userId) {
        return planRepository.findAllByUserIdOrderByPlanDateDescCreatedAtDesc(userId)
                .stream().map(PlanDto::from).toList();
    }

    // [용도] 계획 생성 / [호출] TradePlanController.create()
    @Transactional
    public PlanDto create(Long userId, PlanRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        TradePlan plan = TradePlan.builder()
                .user(user)
                .planDate(req.planDate() != null ? req.planDate() : LocalDate.now())
                .symbol(req.symbol())
                .direction(req.direction())
                .content(req.content())
                .build();
        return PlanDto.from(planRepository.save(plan));
    }

    // [용도] 계획 수정 / [호출] TradePlanController.update()
    @Transactional
    public PlanDto update(Long userId, Long planId, PlanRequest req) {
        TradePlan plan = planRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PLAN_NOT_FOUND));
        plan.update(req.planDate(), req.symbol(), req.direction(), req.content());
        return PlanDto.from(plan);
    }

    // [용도] 완료 토글 / [호출] TradePlanController.toggleDone()
    @Transactional
    public PlanDto toggleDone(Long userId, Long planId) {
        TradePlan plan = planRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PLAN_NOT_FOUND));
        plan.toggleDone();
        return PlanDto.from(plan);
    }

    // [용도] 계획 삭제 / [호출] TradePlanController.delete()
    @Transactional
    public void delete(Long userId, Long planId) {
        TradePlan plan = planRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PLAN_NOT_FOUND));
        planRepository.delete(plan);
    }

    // 요청 DTO
    public record PlanRequest(
            LocalDate planDate,
            String symbol,
            String direction,
            String content
    ) {}

    // 응답 DTO
    public record PlanDto(
            Long id,
            String planDate,
            String symbol,
            String direction,
            String content,
            boolean done,
            String createdAt
    ) {
        static PlanDto from(TradePlan p) {
            return new PlanDto(
                    p.getId(),
                    p.getPlanDate().toString(),
                    p.getSymbol(),
                    p.getDirection(),
                    p.getContent(),
                    p.isDone(),
                    p.getCreatedAt().toString()
            );
        }
    }
}
